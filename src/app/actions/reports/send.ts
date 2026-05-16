/**
 * Report Sending Server Actions
 *
 * 리포트 전송 관련 Server Actions
 * (reports.ts에서 분리됨)
 */

'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import {
  generateShortCode,
  generateReportShareUrl,
  generateSmsShortUrl,
  generateReportSmsMessage,
  calculateLinkExpiry,
} from '@/lib/short-url'
import { classifyReportSendError, type ReportSendErrorInfo } from '@/lib/report-send-errors'
import { renderKakaoTemplatePreview } from '@/lib/kakao/kakao-variables'

interface ReportSendOptions {
  channel?: 'sms' | 'lms' | 'kakao'
  kakaoTemplateId?: string
  messageBody?: string
  subject?: string
}

function renderReportMessageTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return Object.entries(variables).reduce(
    (message, [key, value]) => message.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    template
  )
}

// ============================================================================
// Short URL Functions
// ============================================================================

/**
 * 단축 URL 생성
 *
 * @param reportSendId - report_sends.id
 * @param targetUrl - 실제 리포트 URL
 * @param tenantId - 학원 ID
 * @returns 단축 URL 정보
 */
export async function createShortUrl(
  reportSendId: string,
  targetUrl: string,
  tenantId: string
) {
  try {
    const supabase = createServiceRoleClient()

    // 단축 코드 생성 (6자)
    const shortCode = generateShortCode(6)

    // 만료일 설정 (7일)
    const expiresAt = calculateLinkExpiry(7)

    // short_urls 테이블에 저장
    const { data: shortUrl, error } = await supabase
      .from('short_urls')
      .insert({
        tenant_id: tenantId,
        short_code: shortCode,
        target_url: targetUrl,
        report_send_id: reportSendId,
        expires_at: expiresAt,
        is_active: true,
      })
      .select('id, short_code')
      .single()

    if (error) {
      console.error('[createShortUrl] Creation error:', error.message)
      throw new Error('단축 URL 생성에 실패했습니다')
    }

    return {
      success: true,
      data: {
        id: shortUrl.id,
        shortCode: shortUrl.short_code,
        shortUrl: generateSmsShortUrl(shortUrl.short_code),
      },
      error: null,
    }
  } catch (error) {
    console.error('[createShortUrl] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Report Sending Preparation
// ============================================================================

/**
 * 리포트 전송 준비 (발송 레코드 생성 + 단축 URL 생성)
 *
 * @param reportId - 리포트 ID
 * @returns 발송 정보 배열
 */
export async function prepareReportSending(reportId: string, options: ReportSendOptions = {}) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. 학원 정보 조회
    const { data: academyData, error: academyError } = await supabase
      .from('tenants')
      .select('name, settings')
      .eq('id', tenantId)
      .single()

    if (academyError || !academyData) {
      throw new Error('학원 정보를 찾을 수 없습니다')
    }

    // settings에서 필드 추출
    const settings = (academyData.settings as Record<string, unknown>) || {}
    const academy = {
      name: academyData.name,
      phone: (settings.phone as string) || null,
    }

    // 4. 리포트 정보 조회
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select(`
        id,
        student_id,
        report_type,
        content,
        students (
          id,
          users (
            name
          )
        )
      `)
      .eq('id', reportId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (reportError || !report) {
      throw new Error('리포트를 찾을 수 없습니다')
    }

    // 4. 학생의 보호자 조회
    const { data: guardians, error: guardianError } = await supabase
      .from('student_guardians')
      .select(`
        guardian_id,
        guardians (
          id,
          name,
          phone,
          relationship,
          user_id,
          users (
            phone
          )
        )
      `)
      .eq('student_id', report.student_id)
      .is('deleted_at', null)

    if (guardianError) {
      console.error('[prepareReportSending] Guardian lookup error:', guardianError.message)
      throw new Error('보호자 정보를 조회하는 중 오류가 발생했습니다')
    }
    if (!guardians || guardians.length === 0) {
      throw new Error('학생에게 등록된 보호자가 없습니다')
    }

    // 5. 보호자 데이터 준비
    const studentName =
      (report.students as unknown as { users: { name: string } })?.users?.name ||
      '학생'

    // report.content에서 period 정보 추출 (타입 안전하게)
    const reportContent = report.content as {
      period?: { start: string; end: string }
      attendance?: { rate?: number | string }
      homework?: { rate?: number | string }
      instructorComment?: string
      comment?: { summary?: string }
    }
    const periodStart = reportContent?.period?.start
    const periodEnd = reportContent?.period?.end

    // 월 계산 (타임존 무관하게 문자열에서 직접 추출)
    let month: number | undefined
    if (periodStart) {
      const match = periodStart.match(/^\d{4}-(\d{2})-\d{2}$/)
      if (match) {
        month = parseInt(match[1], 10)
      } else {
        month = new Date(periodStart).getMonth() + 1
      }
    }

    // 유효한 보호자 목록 필터링
    const validGuardians: Array<{
      id: string
      name: string
      phone: string
    }> = []

    for (const sg of guardians) {
      const guardian = sg.guardians as unknown as {
        id: string
        name: string
        phone: string | null
        relationship: string
        user_id: string | null
        users: {
          phone: string | null
        } | null
      }

      const phone = guardian.phone || guardian.users?.phone

      if (!phone) {
        console.warn(`Guardian ${guardian.id} (${guardian.name}) has no phone number, skipping`)
        continue
      }

      validGuardians.push({
        id: guardian.id,
        name: guardian.name,
        phone,
      })
    }

    if (validGuardians.length === 0) {
      throw new Error('보호자 전화번호가 등록되어 있지 않습니다')
    }

    let kakaoTemplate: { id: string; content: string } | null = null
    if (options.channel === 'kakao') {
      if (!options.kakaoTemplateId) {
        throw new Error('알림톡 템플릿이 선택되지 않았습니다')
      }

      const { data: template, error: templateError } = await supabase
        .from('kakao_alimtalk_templates')
        .select('id, content')
        .eq('id', options.kakaoTemplateId)
        .eq('tenant_id', tenantId)
        .eq('status', 'approved')
        .is('deleted_at', null)
        .maybeSingle()

      if (templateError || !template) {
        throw new Error('선택한 알림톡 템플릿이 승인되지 않았거나 삭제되었습니다')
      }

      kakaoTemplate = template
    }

    // 5-1. 배치 INSERT: report_sends
    const linkExpiresAt = calculateLinkExpiry(7)
    const reportSendInserts = validGuardians.map(guardian => ({
      tenant_id: tenantId,
      report_id: reportId,
      recipient_type: 'guardian',
      recipient_id: guardian.id,
      recipient_phone: guardian.phone,
      recipient_name: guardian.name,
      link_expires_at: linkExpiresAt,
      message_body: '',
      message_type: options.channel === 'kakao' ? 'KAKAO' : 'SMS',
      send_status: 'pending',
      ...(kakaoTemplate && { kakao_template_id: kakaoTemplate.id }),
    }))

    const { data: insertedReportSends, error: insertError } = await supabase
      .from('report_sends')
      .insert(reportSendInserts)
      .select('id, share_link_id, recipient_id, recipient_name, recipient_phone')

    if (insertError || !insertedReportSends) {
      console.error('[sendReportBatch] Insert error:', insertError?.message)
      throw new Error('발송 레코드 생성에 실패했습니다')
    }

    // 5-2. 배치 INSERT: short_urls
    const shortUrlInserts = insertedReportSends.map(rs => ({
      tenant_id: tenantId,
      short_code: generateShortCode(6),
      target_url: generateReportShareUrl(rs.share_link_id),
      report_send_id: rs.id,
      expires_at: linkExpiresAt,
      is_active: true,
    }))

    const { data: insertedShortUrls, error: shortUrlError } = await supabase
      .from('short_urls')
      .insert(shortUrlInserts)
      .select('id, short_code, report_send_id')

    if (shortUrlError || !insertedShortUrls) {
      console.error('[sendReportBatch] Short URL error:', shortUrlError?.message)
      throw new Error('단축 URL 생성에 실패했습니다')
    }

    // short_url을 report_send_id로 매핑
    const shortUrlMap = new Map<string, { id: string; shortCode: string }>(
      insertedShortUrls.map(su => [su.report_send_id, { id: su.id, shortCode: su.short_code }])
    )

    // 5-3. 메시지 생성 및 배치 UPDATE 준비
    const reportSends: Array<{
      id: string
      recipientName: string
      recipientPhone: string
      message: string
      messageType: 'SMS' | 'LMS' | 'KAKAO'
      shortUrl: string
      kakaoTemplateId?: string
      messageVariables?: Record<string, string>
    }> = []

    const updatePromises = insertedReportSends.map(rs => {
      const shortUrlInfo = shortUrlMap.get(rs.id)
      if (!shortUrlInfo) return null

      const shortUrl = generateSmsShortUrl(shortUrlInfo.shortCode)
      const defaultSms = generateReportSmsMessage({
        studentName,
        month,
        reportType: '성적',
        shortUrl,
        academyName: academy.name,
        academyPhone: academy.phone || undefined,
      })
      const textVariables = {
        학생명: studentName,
        보호자명: rs.recipient_name,
        학원명: academy.name,
        학원연락처: academy.phone || '',
        리포트링크: shortUrl,
        기간:
          periodStart && periodEnd
            ? `${periodStart} ~ ${periodEnd}`
            : periodStart || '',
      }

      let message = options.messageBody?.trim()
        ? renderReportMessageTemplate(options.messageBody.trim(), textVariables)
        : defaultSms.message
      let type: 'SMS' | 'LMS' | 'KAKAO' =
        options.channel === 'lms' ? 'LMS' : defaultSms.type
      let messageVariables: Record<string, string> | undefined

      if (kakaoTemplate) {
        messageVariables = {
          학생명: studentName,
          보호자명: rs.recipient_name,
          기간:
            periodStart && periodEnd
              ? `${periodStart} ~ ${periodEnd}`
              : periodStart || '',
          출석률:
            reportContent.attendance?.rate !== undefined
              ? `${reportContent.attendance.rate}%`
              : '',
          숙제완료율:
            reportContent.homework?.rate !== undefined
              ? `${reportContent.homework.rate}%`
              : '',
          학원명: academy.name,
          학원연락처: academy.phone || '',
          종합평가: reportContent.comment?.summary || reportContent.instructorComment || '',
          리포트링크: shortUrl,
        }
        message = renderKakaoTemplatePreview(kakaoTemplate.content, messageVariables)
        type = 'KAKAO'
      }

      reportSends.push({
        id: rs.id,
        recipientName: rs.recipient_name,
        recipientPhone: rs.recipient_phone,
        message,
        messageType: type,
        shortUrl,
        ...(kakaoTemplate && {
          kakaoTemplateId: kakaoTemplate.id,
          messageVariables,
        }),
      })

      return supabase
        .from('report_sends')
        .update({
          message_body: message,
          message_type: type,
          short_url_id: shortUrlInfo.id,
          ...(kakaoTemplate && {
            kakao_template_id: kakaoTemplate.id,
            message_variables: messageVariables,
          }),
        })
        .eq('id', rs.id)
    }).filter(Boolean)

    // 5-4. 배치 UPDATE 실행 (Promise.all)
    await Promise.all(updatePromises)

    // 6. 모든 레코드 처리 실패 시 에러
    if (reportSends.length === 0) {
      throw new Error('발송 레코드 처리 중 오류가 발생했습니다.')
    }

    return {
      success: true,
      data: reportSends,
      error: null,
    }
  } catch (error) {
    console.error('[prepareReportSending] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Report Comment Update
// ============================================================================

/**
 * 강사 코멘트 업데이트
 *
 * @param reportId - 리포트 ID
 * @param comment - 코멘트 객체
 * @returns Success or error
 */
export async function updateReportComment(
  reportId: string,
  comment: {
    summary: string
    strengths: string
    improvements: string
    nextGoals: string
  }
): Promise<{ success: boolean; error: string | null }> {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Fetch current report to verify ownership
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('content, tenant_id')
      .eq('id', reportId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !report) {
      throw new Error('리포트를 찾을 수 없습니다.')
    }

    // 4. Update content with new comment (JSON format)
    const updatedContent = {
      ...report.content,
      // New structured comment format (JSON object)
      comment: {
        summary: comment.summary,
        strengths: comment.strengths,
        improvements: comment.improvements,
        nextGoals: comment.nextGoals,
      },
      // Keep legacy fields for backward compatibility
      instructorComment: comment.summary,
      overallComment: comment.summary,
    }

    // 5. Update report
    const { error: updateError } = await supabase
      .from('reports')
      .update({ content: updatedContent })
      .eq('id', reportId)

    if (updateError) throw updateError

    // 6. Revalidate paths
    revalidatePath(`/reports/${reportId}`)
    revalidatePath('/reports')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[updateReportComment] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Report Message Sending
// ============================================================================

/**
 * 리포트 전송 실행 (알리고 API 호출)
 *
 * @param reportSendId - report_sends.id
 * @returns 전송 결과
 */
export async function sendReportMessage(reportSendId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. report_send 정보 조회 (리포트 및 학생 정보 포함)
    const { data: reportSend, error } = await supabase
      .from('report_sends')
      .select(`
        *,
        reports (
          id,
          student_id,
          students (
            id,
            student_code,
            users (name)
          )
        )
      `)
      .eq('id', reportSendId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error || !reportSend) {
      throw new Error('발송 정보를 찾을 수 없습니다')
    }

    const typedReports = reportSend.reports as {
      id: string
      student_id: string
      students: { id: string; student_code: string; users: { name: string } | null } | null
    } | null
    const studentId = typedReports?.student_id
    const studentName = typedReports?.students?.users?.name || '학생'

    // 4. 통합 메시지 Provider 사용 (tenant 설정에 따라 알리고/솔라피 자동 선택)
    const { sendAlimtalk, sendMessage } = await import('@/lib/messaging/provider')

    if (reportSend.message_type === 'KAKAO' && !reportSend.kakao_template_id) {
      throw new Error('알림톡 템플릿 정보가 없는 발송 건입니다.')
    }

    const sendResult = reportSend.message_type === 'KAKAO'
      ? await sendAlimtalk({
          to: reportSend.recipient_phone,
          templateId: reportSend.kakao_template_id,
          variables: (reportSend.message_variables as Record<string, string> | null) ?? {},
        })
      : await sendMessage({
          type: reportSend.message_type === 'SMS' ? 'sms' : 'lms',
          to: reportSend.recipient_phone,
          message: reportSend.message_body,
        })

    if (!sendResult.success) {
      throw new Error(sendResult.error || '메시지 발송 실패')
    }

    const messageId = sendResult.messageId || `MSG_${Date.now()}`

    // 5. report_sends 업데이트 (발송 완료)
    await supabase
      .from('report_sends')
      .update({
        send_status: 'sent',
        aligo_msgid: messageId,
        sent_at: new Date().toISOString(),
      })
      .eq('id', reportSendId)

    // 6. reports 테이블의 sent_at 업데이트
    await supabase
      .from('reports')
      .update({
        sent_at: new Date().toISOString(),
      })
      .eq('id', reportSend.report_id)

    // 7. notification_logs에 기록 (메시지 관리에서 추적 가능하도록)
    const notificationType = reportSend.message_type === 'KAKAO' ? 'kakao' :
                            reportSend.message_type === 'LMS' ? 'lms' : 'sms'

    await supabase.from('notification_logs').insert({
      tenant_id: tenantId,
      student_id: studentId,
      notification_type: notificationType,
      status: 'sent',
      message: `[리포트 발송] ${studentName} 학생 리포트를 ${reportSend.recipient_name}(${reportSend.recipient_phone})에게 발송`,
      sent_at: new Date().toISOString(),
      ...(reportSend.message_type === 'KAKAO' && {
        kakao_template_id: reportSend.kakao_template_id,
        fallback_type: 'none',
      }),
    })

    // 8. Revalidate
    revalidatePath('/reports')
    revalidatePath(`/reports/${reportSend.report_id}`)
    revalidatePath('/notifications')

    return {
      success: true,
      data: { msgid: messageId },
      error: null,
    }
  } catch (error) {
    console.error('[sendReportMessage] Error:', error)

    // 실패 상태 업데이트
    try {
      const supabase = createServiceRoleClient()
      await supabase
        .from('report_sends')
        .update({
          send_status: 'failed',
          send_error: getErrorMessage(error),
        })
        .eq('id', reportSendId)
    } catch (updateError) {
      console.error('[sendReportMessage] Error updating failed status:', updateError)
    }

    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 리포트 일괄 전송
 *
 * @param reportId - 리포트 ID
 * @returns 전송 결과
 */
export async function sendReportToAllGuardians(
  reportId: string,
  options: ReportSendOptions = {}
): Promise<
  | {
      success: true
      data: {
        total: number
        successCount: number
        failCount: number
        details: Array<{ recipientName: string; success: boolean; error: string | null }>
      }
      error: null
    }
  | {
      success: false
      data: null
      error: string
      errorInfo: ReportSendErrorInfo
    }
> {
  try {
    // 1. 발송 준비 (레코드 생성 + 단축 URL 생성)
    const prepareResult = await prepareReportSending(reportId, options)

    if (!prepareResult.success || !prepareResult.data) {
      throw new Error(prepareResult.error || '발송 준비 실패')
    }

    // 2. 각 보호자에게 전송
    const sendResults: Array<{
      recipientName: string
      success: boolean
      error: string | null
    }> = []
    let successCount = 0
    let failCount = 0

    for (const reportSend of prepareResult.data) {
      const result = await sendReportMessage(reportSend.id)

      if (result.success) {
        successCount++
      } else {
        failCount++
      }

      sendResults.push({
        recipientName: reportSend.recipientName,
        success: result.success,
        error: result.error,
      })
    }

    return {
      success: true,
      data: {
        total: prepareResult.data.length,
        successCount,
        failCount,
        details: sendResults,
      },
      error: null,
    }
  } catch (error) {
    console.error('[sendReportToAllGuardians] Error:', error)
    const errorMessage = getErrorMessage(error)
    return {
      success: false,
      data: null,
      error: errorMessage,
      errorInfo: classifyReportSendError(errorMessage),
    }
  }
}
