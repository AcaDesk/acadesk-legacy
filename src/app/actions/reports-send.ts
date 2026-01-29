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
      throw new Error('단축 URL 생성 실패: ' + error.message)
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
export async function prepareReportSending(reportId: string) {
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
    const settings = (academyData.settings as Record<string, any>) || {}
    const academy = {
      name: academyData.name,
      phone: settings.phone || null,
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

    if (guardianError || !guardians || guardians.length === 0) {
      throw new Error('보호자 정보를 찾을 수 없습니다')
    }

    // 5. 각 보호자별로 발송 레코드 생성
    const reportSends: Array<{
      id: string
      recipientName: string
      recipientPhone: string
      message: string
      messageType: 'SMS' | 'LMS'
      shortUrl: string
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

      // guardians.phone 또는 users.phone 중 하나라도 있으면 사용
      const phone = guardian.phone || guardian.users?.phone

      if (!phone) {
        console.warn(`Guardian ${guardian.id} (${guardian.name}) has no phone number, skipping`)
        continue
      }

      // 5-1. share_link_id 생성 (UUID 자동 생성됨)
      // 만료일 설정 (7일)
      const linkExpiresAt = calculateLinkExpiry(7)

      // 5-2. report_sends 레코드 생성
      const { data: reportSend, error: sendError } = await supabase
        .from('report_sends')
        .insert({
          tenant_id: tenantId,
          report_id: reportId,
          recipient_type: 'guardian',
          recipient_id: guardian.id,
          recipient_phone: phone,
          recipient_name: guardian.name,
          link_expires_at: linkExpiresAt,
          message_body: '', // 나중에 업데이트
          message_type: 'SMS',
          send_status: 'pending',
        })
        .select('id, share_link_id')
        .single()

      if (sendError) {
        console.error('[prepareReportSending] Error creating report_send:', sendError)
        continue
      }

      // 5-3. 실제 리포트 URL 생성
      const reportUrl = generateReportShareUrl(reportSend.share_link_id)

      // 5-4. 단축 URL 생성
      const shortUrlResult = await createShortUrl(reportSend.id, reportUrl, tenantId)

      if (!shortUrlResult.success || !shortUrlResult.data) {
        console.error('[prepareReportSending] Error creating short URL')
        continue
      }

      // 5-5. 문자 메시지 본문 생성
      const studentName =
        (report.students as unknown as { users: { name: string } })?.users?.name ||
        '학생'

      // report.content에서 period 정보 추출 (타입 안전하게)
      const reportContent = report.content as { period?: { start: string; end: string } }
      const periodStart = reportContent?.period?.start

      // 월 계산 (타임존 무관하게 문자열에서 직접 추출)
      let month: number | undefined
      if (periodStart) {
        // "2024-10-01" 형식에서 월 추출
        const match = periodStart.match(/^\d{4}-(\d{2})-\d{2}$/)
        if (match) {
          month = parseInt(match[1], 10)
        } else {
          // fallback: Date 객체 사용
          month = new Date(periodStart).getMonth() + 1
        }
      }

      console.log('[prepareReportSending] Message generation:', {
        studentName,
        periodStart,
        month,
        reportType: '성적'
      })

      const { message, type } = generateReportSmsMessage({
        studentName,
        month,
        reportType: '성적',
        shortUrl: shortUrlResult.data.shortUrl,
        academyName: academy.name,
        academyPhone: academy.phone || undefined,
      })

      // 5-6. report_sends 업데이트 (메시지 본문, 단축 URL ID)
      await supabase
        .from('report_sends')
        .update({
          message_body: message,
          message_type: type,
          short_url_id: shortUrlResult.data.id,
        })
        .eq('id', reportSend.id)

      reportSends.push({
        id: reportSend.id,
        recipientName: guardian.name,
        recipientPhone: phone,
        message,
        messageType: type,
        shortUrl: shortUrlResult.data.shortUrl,
      })
    }

    // 6. 전송 가능한 보호자가 없는 경우 에러
    if (reportSends.length === 0) {
      throw new Error(
        '전송 가능한 보호자가 없습니다.\n\n' +
        '확인사항:\n' +
        '1. 학생에게 등록된 보호자가 있는지 확인하세요\n' +
        '2. 모든 보호자의 전화번호가 등록되어 있는지 확인하세요\n\n' +
        '학생 관리 > 보호자 정보에서 전화번호를 추가할 수 있습니다.'
      )
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

    const studentId = (reportSend.reports as any)?.student_id
    const studentName = (reportSend.reports as any)?.students?.users?.name || '학생'

    // 4. 통합 메시지 Provider 사용 (tenant 설정에 따라 알리고/솔라피 자동 선택)
    const { sendMessage } = await import('@/lib/messaging/provider')

    const sendResult = await sendMessage({
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
export async function sendReportToAllGuardians(reportId: string) {
  try {
    // 1. 발송 준비 (레코드 생성 + 단축 URL 생성)
    const prepareResult = await prepareReportSending(reportId)

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
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
