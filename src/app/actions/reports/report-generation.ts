/**
 * Report Generation Server Actions
 *
 * 리포트 생성, 저장, 발송 Server Actions
 */

'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import type { ReportData } from '@/core/types/report.types'
import type { TenantSettings } from '@/core/types/database'
import {
  collectReportMetricsByStudent,
  getMonthlyTrendPeriods,
  type StudentDataWithUser,
  getAttendanceData,
  getHomeworkData,
  generateInstructorComment,
} from './report-helpers'

// ============================================================================
// Report Generation
// ============================================================================

/**
 * 주간 리포트 생성
 *
 * @param studentId - 학생 ID
 * @param startDate - 시작일 (YYYY-MM-DD)
 * @param endDate - 종료일 (YYYY-MM-DD)
 * @returns ReportData or error
 */
export async function generateWeeklyReport(
  studentId: string,
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data: ReportData | null; error: string | null }> {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. 기간 설정
    const periodStartStr = startDate
    const periodEndStr = endDate

    // 이전 주 기간 (7일 전)
    const startDateObj = new Date(startDate)
    const prevStartDateObj = new Date(startDateObj)
    prevStartDateObj.setDate(prevStartDateObj.getDate() - 7)
    const prevEndDateObj = new Date(endDate)
    prevEndDateObj.setDate(prevEndDateObj.getDate() - 7)
    const prevPeriodStartStr = prevStartDateObj.toISOString().split('T')[0]
    const prevPeriodEndStr = prevEndDateObj.toISOString().split('T')[0]

    // 4. 학생 정보 조회
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, student_code, grade, tenant_id, users!inner(name)')
      .eq('id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (studentError || !studentData) {
      throw new Error('학생을 찾을 수 없습니다.')
    }

    const typedStudentData = studentData as unknown as StudentDataWithUser

    // 5. 학원 정보 조회
    const { data: academyData, error: academyError } = await supabase
      .from('tenants')
      .select('name, settings')
      .eq('id', tenantId)
      .single()

    if (academyError || !academyData) {
      throw new Error('학원 정보를 찾을 수 없습니다.')
    }

    // settings에서 필드 추출
    const settings = (academyData.settings as TenantSettings) || {}
    const academy = {
      name: academyData.name,
      phone: settings.phone || null,
      email: settings.email || null,
      address: settings.address || null,
      website: settings.website || null,
    }

    const metricsByStudent = await collectReportMetricsByStudent(supabase, {
      studentIds: [studentId],
      tenantId,
      currentPeriod: {
        start: periodStartStr,
        end: periodEndStr,
      },
      previousPeriod: {
        start: prevPeriodStartStr,
        end: prevPeriodEndStr,
      },
    })

    const metrics = metricsByStudent.get(studentId)
    const attendance = metrics?.attendance || { total: 0, present: 0, late: 0, absent: 0, rate: 0 }
    const homework = metrics?.homework || { total: 0, completed: 0, rate: 0 }
    const scores = metrics?.scores || []
    const gradesChartData = metrics?.gradesChartData || []
    const attendanceChartData = metrics?.attendanceChartData || []
    const currentScore = metrics?.currentScore || { myScore: 0, classAverage: 0, highestScore: 0 }

    // 7. 강사 코멘트 생성 (attendance + scores 결과에 의존)
    const instructorComment = generateInstructorComment(attendance, scores)

    // 주간은 추이 데이터 생략 (최근 3주로 변경 가능)
    const scoreTrend: Array<{
      name: string
      '학생 점수': number
      '반 평균': number
      '재시험률'?: number
    }> = []

    const reportData: ReportData = {
      student: {
        id: typedStudentData.id,
        name: typedStudentData.users?.name || 'Unknown',
        grade: typedStudentData.grade || '',
        student_code: typedStudentData.student_code,
      },
      academy: {
        name: academy.name,
        phone: academy.phone,
        email: academy.email,
        address: academy.address,
        website: academy.website,
      },
      period: {
        start: periodStartStr,
        end: periodEndStr,
      },
      attendance,
      homework,
      scores,
      instructorComment,
      gradesChartData,
      attendanceChartData,
      currentScore,
      scoreTrend,
    }

    return {
      success: true,
      data: reportData,
      error: null,
    }
  } catch (error) {
    console.error('[generateWeeklyReport] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 월간 리포트 생성
 *
 * @param studentId - 학생 ID
 * @param year - 연도
 * @param month - 월
 * @returns ReportData or error
 */
export async function generateMonthlyReport(
  studentId: string,
  year: number,
  month: number
): Promise<{ success: boolean; data: ReportData | null; error: string | null }> {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. 기간 설정 (타임존 무관하게 날짜 문자열 직접 생성)
    const lastDay = new Date(year, month, 0).getDate()
    const periodStartStr = `${year}-${String(month).padStart(2, '0')}-01`
    const periodEndStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // 이전 달 기간
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate()
    const prevPeriodStartStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
    const prevPeriodEndStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`

    // 4. 학생 정보 조회
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, student_code, grade, tenant_id, users!inner(name)')
      .eq('id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (studentError || !studentData) {
      throw new Error('학생을 찾을 수 없습니다.')
    }

    const typedStudentData = studentData as unknown as StudentDataWithUser

    // 5. 학원 정보 조회
    const { data: academyData, error: academyError } = await supabase
      .from('tenants')
      .select('name, settings')
      .eq('id', tenantId)
      .single()

    if (academyError || !academyData) {
      throw new Error('학원 정보를 찾을 수 없습니다.')
    }

    // settings에서 필드 추출
    const settings = (academyData.settings as TenantSettings) || {}
    const academy = {
      name: academyData.name,
      phone: settings.phone || null,
      email: settings.email || null,
      address: settings.address || null,
      website: settings.website || null,
    }

    const trendPeriods = getMonthlyTrendPeriods(year, month)
    const metricsByStudent = await collectReportMetricsByStudent(supabase, {
      studentIds: [studentId],
      tenantId,
      currentPeriod: {
        start: periodStartStr,
        end: periodEndStr,
      },
      previousPeriod: {
        start: prevPeriodStartStr,
        end: prevPeriodEndStr,
      },
      trendPeriods,
    })

    const metrics = metricsByStudent.get(studentId)
    const attendance = metrics?.attendance || { total: 0, present: 0, late: 0, absent: 0, rate: 0 }
    const homework = metrics?.homework || { total: 0, completed: 0, rate: 0 }
    const scores = metrics?.scores || []
    const gradesChartData = metrics?.gradesChartData || []
    const attendanceChartData = metrics?.attendanceChartData || []
    const currentScore = metrics?.currentScore || { myScore: 0, classAverage: 0, highestScore: 0 }
    const scoreTrend = metrics?.scoreTrend || []

    // 7. 강사 코멘트 생성 (attendance + scores 결과에 의존)
    const instructorComment = generateInstructorComment(attendance, scores)

    const reportData: ReportData = {
      student: {
        id: typedStudentData.id,
        name: typedStudentData.users?.name || 'Unknown',
        grade: typedStudentData.grade || '',
        student_code: typedStudentData.student_code,
      },
      academy: {
        name: academy.name,
        phone: academy.phone,
        email: academy.email,
        address: academy.address,
        website: academy.website,
      },
      period: {
        start: periodStartStr,
        end: periodEndStr,
      },
      attendance,
      homework,
      scores,
      instructorComment,
      gradesChartData,
      attendanceChartData,
      currentScore,
      scoreTrend,
    }

    return {
      success: true,
      data: reportData,
      error: null,
    }
  } catch (error) {
    console.error('[generateMonthlyReport] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 리포트를 데이터베이스에 저장
 *
 * @param reportData - 리포트 데이터
 * @param reportType - 리포트 타입
 * @returns Success or error
 */
export async function saveReport(
  reportData: ReportData,
  reportType: 'weekly' | 'monthly' = 'monthly'
): Promise<{ success: boolean; error: string | null; data: { id: string } | null }> {
  try {
    // 0. Validate student data
    if (!reportData.student?.id) {
      throw new Error('학생 정보가 없습니다.')
    }

    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Verify student belongs to tenant
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('tenant_id')
      .eq('id', reportData.student.id)
      .eq('tenant_id', tenantId)
      .single()

    if (studentError || !studentData) {
      throw new Error('학생을 찾을 수 없습니다.')
    }

    const { data: existingReport, error: existingReportError } = await supabase
      .from('reports')
      .select('id, sent_at')
      .eq('tenant_id', tenantId)
      .eq('student_id', reportData.student.id)
      .eq('report_type', reportType)
      .eq('period_start', reportData.period.start)
      .eq('period_end', reportData.period.end)
      .is('deleted_at', null)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingReportError) throw existingReportError

    let data: { id: string } | null = null

    if (existingReport) {
      if (existingReport.sent_at) {
        throw new Error('이미 전송된 동일 기간 리포트가 있습니다. 기존 리포트를 확인해주세요.')
      }

      const { data: updatedReport, error: updateError } = await supabase
        .from('reports')
        .update({
          content: reportData as unknown as Record<string, unknown>,
          generated_at: new Date().toISOString(),
        })
        .eq('id', existingReport.id)
        .eq('tenant_id', tenantId)
        .select('id')
        .single()

      if (updateError) throw updateError
      data = updatedReport
    } else {
      const { data: insertedReport, error } = await supabase
        .from('reports')
        .insert({
          tenant_id: tenantId,
          student_id: reportData.student.id,
          report_type: reportType,
          period_start: reportData.period.start,
          period_end: reportData.period.end,
          content: reportData as unknown as Record<string, unknown>,
        })
        .select('id')
        .single()

      if (error) throw error
      data = insertedReport
    }

    if (!data) {
      throw new Error('리포트 저장에 실패했습니다.')
    }

    // 5. Revalidate pages
    revalidatePath('/reports')
    revalidatePath(`/students/${reportData.student.id}`)

    return {
      success: true,
      error: null,
      data: { id: data.id },
    }
  } catch (error) {
    console.error('[saveReport] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      data: null,
    }
  }
}

/**
 * 학생 목록 조회 (리포트 생성용)
 *
 * @returns 학생 목록
 */
export async function getStudentsForReport() {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Query students with additional info
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        grade,
        school,
        users!inner(name),
        class_enrollments(
          classes(name)
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('student_code')

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getStudentsForReport] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 리포트 생성 및 발송
 *
 * @param params - 리포트 발송 파라미터
 * @returns Success or error
 */
export async function generateAndSendReport(params: {
  studentId: string
  startDate: string
  endDate: string
  type: 'student_monthly' | 'student_exam'
  comment?: string
  channel: 'sms' | 'lms' | 'kakao' | 'email'
  recipientName: string
  recipientContact: string
  academyName: string
  academyPhone: string
  /** 카카오 알림톡용 템플릿 ID (channel이 'kakao'일 때 필수) */
  kakaoTemplateId?: string
  /** 카카오 알림톡용 변수 (템플릿에 #{변수명} 형식) */
  kakaoVariables?: Record<string, string>
}): Promise<{ success: boolean; error: string | null }> {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. 학생 정보 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, grade, users!inner(name)')
      .eq('id', params.studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (studentError || !student) {
      throw new Error('학생을 찾을 수 없습니다.')
    }

    const typedStudent = student as unknown as StudentDataWithUser

    // 4. 기간별 데이터 수집
    const attendance = await getAttendanceData(
      supabase,
      params.studentId,
      params.startDate,
      params.endDate,
      tenantId
    )
    const homework = await getHomeworkData(
      supabase,
      params.studentId,
      params.startDate,
      params.endDate,
      tenantId
    )

    // 5. 메시지 생성 (채널에 따라 다른 포맷)
    const studentName = typedStudent.users?.name || '학생'
    let message = ''

    if (params.channel === 'sms') {
      // SMS: 90자 이내 초간단 요약
      message = `[${studentName} 학습 리포트]\n출석 ${attendance.rate}%, 숙제 ${homework.rate}%\n문의: ${params.academyName} ${params.academyPhone}`
    } else if (params.channel === 'lms') {
      // LMS: 2000자 이내 상세 리포트
      message = `[${studentName} 학습 리포트]

📅 기간: ${params.startDate} ~ ${params.endDate}
🎓 학년: ${student.grade || '-'}

📊 학습 현황
출석률: ${attendance.rate}% (출석 ${attendance.present}일, 지각 ${attendance.late}일, 결석 ${attendance.absent}일)
숙제 완료율: ${homework.rate}% (완료 ${homework.completed}/${homework.total}건)

${params.comment ? `💬 종합평가\n${params.comment}\n\n` : ''}문의: ${params.academyName} ${params.academyPhone}`
    } else if (params.channel === 'kakao') {
      // 카카오 알림톡: 템플릿 ID 필수
      if (!params.kakaoTemplateId) {
        throw new Error('카카오 알림톡 발송에는 템플릿을 선택해야 합니다.')
      }

      // 기본 변수 구성 (사용자 입력 변수 + 자동 생성 변수)
      const variables: Record<string, string> = {
        // 자동 생성 변수
        학생명: studentName,
        보호자명: params.recipientName,
        기간: `${params.startDate} ~ ${params.endDate}`,
        출석률: `${attendance.rate}%`,
        숙제완료율: `${homework.rate}%`,
        학원명: params.academyName,
        학원연락처: params.academyPhone,
        ...(params.comment && { 종합평가: params.comment }),
        // 사용자 입력 변수 (자동 생성 변수를 덮어쓸 수 있음)
        ...params.kakaoVariables,
      }

      // 알림톡 발송
      const { sendAlimtalk } = await import('@/lib/messaging/provider')
      const alimtalkResult = await sendAlimtalk({
        to: params.recipientContact,
        templateId: params.kakaoTemplateId,
        variables,
      })

      if (!alimtalkResult.success) {
        throw new Error(alimtalkResult.error || '알림톡 발송에 실패했습니다.')
      }

      // 알림톡 템플릿 본문을 변수와 함께 렌더링하여 실제 발송 내용을 저장
      const { renderKakaoTemplatePreview } = await import('@/lib/kakao/kakao-variables')
      const { data: kakaoTemplate } = await supabase
        .from('kakao_alimtalk_templates')
        .select('content')
        .eq('id', params.kakaoTemplateId)
        .is('deleted_at', null)
        .maybeSingle()
      const renderedMessage = kakaoTemplate?.content
        ? renderKakaoTemplatePreview(kakaoTemplate.content, variables)
        : ''

      // notification_logs에 기록
      const { error: logError } = await supabase.from('notification_logs').insert({
        tenant_id: tenantId,
        student_id: params.studentId,
        session_id: null,
        notification_type: 'kakao',
        status: 'sent',
        message: renderedMessage,
        sent_at: new Date().toISOString(),
        kakao_template_id: params.kakaoTemplateId,
        recipient_name: params.recipientName,
        recipient_phone: params.recipientContact,
      })

      if (logError) {
        console.error('[generateAndSendReport] Kakao log error:', logError)
      }

      // 캐시 무효화
      revalidatePath(`/students/${params.studentId}`)
      revalidatePath('/reports')

      return {
        success: true,
        error: null,
      }
    } else if (params.channel === 'email') {
      // 이메일: 준비 중
      throw new Error('이메일 채널은 준비 중입니다.')
    } else {
      throw new Error(`지원되지 않는 채널입니다: ${params.channel}`)
    }

    // 6. SMS/LMS 발송 - notification_logs에 기록
    const { error: logError } = await supabase.from('notification_logs').insert({
      tenant_id: tenantId,
      student_id: params.studentId,
      session_id: null, // 리포트 발송은 세션과 무관
      notification_type: params.channel === 'sms' || params.channel === 'lms' ? 'sms' : 'email',
      status: 'sent',
      message,
      sent_at: new Date().toISOString(),
      recipient_name: params.recipientName,
      recipient_phone: params.recipientContact,
    })

    if (logError) {
      console.error('[generateAndSendReport] Log error:', logError)
      throw new Error('리포트 발송 기록 저장에 실패했습니다.')
    }

    // 7. 캐시 무효화
    revalidatePath(`/students/${params.studentId}`)
    revalidatePath('/reports')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[generateAndSendReport] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 월간 리포트 일괄 생성 (서버 사이드 최적화)
 *
 * - verifyStaff() 1회만 호출
 * - 학원 정보 1회만 조회
 * - 학생 정보 IN 조건으로 한 번에 조회
 * - 중복 리포트 스킵
 * - 저장 단계는 10명씩 병렬 처리
 *
 * @param studentIds - 학생 ID 배열
 * @param year - 연도
 * @param month - 월
 * @returns 학생별 결과 배열
 */
export async function generateBulkMonthlyReports(
  studentIds: string[],
  year: number,
  month: number
): Promise<{
  results: Array<{
    studentId: string
    success: boolean
    reportId?: string
    error?: string
    skipped?: boolean
  }>
}> {
  try {
    // 1. 인증 1회
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 2. 기간 설정
    const lastDay = new Date(year, month, 0).getDate()
    const periodStartStr = `${year}-${String(month).padStart(2, '0')}-01`
    const periodEndStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate()
    const prevPeriodStartStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
    const prevPeriodEndStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(prevLastDay).padStart(2, '0')}`

    // 3. 학원 정보 1회 조회
    const { data: academyData, error: academyError } = await supabase
      .from('tenants')
      .select('name, settings')
      .eq('id', tenantId)
      .single()

    if (academyError || !academyData) {
      throw new Error('학원 정보를 찾을 수 없습니다.')
    }

    const settings = (academyData.settings as TenantSettings) || {}
    const academy = {
      name: academyData.name,
      phone: settings.phone || null,
      email: settings.email || null,
      address: settings.address || null,
      website: settings.website || null,
    }

    // 4. 학생 정보 일괄 조회
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, student_code, grade, tenant_id, users!inner(name)')
      .in('id', studentIds)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (studentsError) {
      throw new Error('학생 정보 조회에 실패했습니다.')
    }

    const studentsMap = new Map(
      (studentsData || []).map((s) => [s.id, s as unknown as StudentDataWithUser])
    )

    // 5. 중복 리포트 체크 (같은 학생 + 기간 + 타입)
    const { data: existingReports } = await supabase
      .from('reports')
      .select('student_id')
      .eq('tenant_id', tenantId)
      .eq('report_type', 'monthly')
      .eq('period_start', periodStartStr)
      .eq('period_end', periodEndStr)
      .in('student_id', studentIds)

    const existingStudentIds = new Set(
      (existingReports || []).map((r) => r.student_id)
    )

    const studentsToGenerate = studentIds.filter((studentId) => {
      if (existingStudentIds.has(studentId)) return false
      return studentsMap.has(studentId)
    })

    const trendPeriods = getMonthlyTrendPeriods(year, month)
    const metricsByStudent = await collectReportMetricsByStudent(supabase, {
      studentIds: studentsToGenerate,
      tenantId,
      currentPeriod: {
        start: periodStartStr,
        end: periodEndStr,
      },
      previousPeriod: {
        start: prevPeriodStartStr,
        end: prevPeriodEndStr,
      },
      trendPeriods,
    })

    // 6. 학생별 리포트 생성 내부 함수
    async function generateForStudent(
      studentId: string
    ): Promise<{ studentId: string; success: boolean; reportId?: string; error?: string; skipped?: boolean }> {
      // 중복 스킵
      if (existingStudentIds.has(studentId)) {
        return { studentId, success: true, skipped: true }
      }

      const studentData = studentsMap.get(studentId)
      if (!studentData) {
        return { studentId, success: false, error: '학생을 찾을 수 없습니다.' }
      }

      try {
        const metrics = metricsByStudent.get(studentId)
        const attendance = metrics?.attendance || { total: 0, present: 0, late: 0, absent: 0, rate: 0 }
        const homework = metrics?.homework || { total: 0, completed: 0, rate: 0 }
        const scores = metrics?.scores || []
        const gradesChartData = metrics?.gradesChartData || []
        const attendanceChartData = metrics?.attendanceChartData || []
        const currentScore = metrics?.currentScore || { myScore: 0, classAverage: 0, highestScore: 0 }
        const scoreTrend = metrics?.scoreTrend || []

        const instructorComment = generateInstructorComment(attendance, scores)

        const reportData: ReportData = {
          student: {
            id: studentData.id,
            name: studentData.users?.name || 'Unknown',
            grade: studentData.grade || '',
            student_code: studentData.student_code,
          },
          academy: {
            name: academy.name,
            phone: academy.phone,
            email: academy.email,
            address: academy.address,
            website: academy.website,
          },
          period: {
            start: periodStartStr,
            end: periodEndStr,
          },
          attendance,
          homework,
          scores,
          instructorComment,
          gradesChartData,
          attendanceChartData,
          currentScore,
          scoreTrend,
        }

        // 저장
        const { data: savedReport, error: saveError } = await supabase
          .from('reports')
          .insert({
            tenant_id: tenantId,
            student_id: studentId,
            report_type: 'monthly',
            period_start: periodStartStr,
            period_end: periodEndStr,
            content: reportData as unknown as Record<string, unknown>,
          })
          .select('id')
          .single()

        if (saveError) throw saveError

        return { studentId, success: true, reportId: savedReport.id }
      } catch (error) {
        console.error(`[generateBulkMonthlyReports] Error for ${studentId}:`, error)
        return { studentId, success: false, error: getErrorMessage(error) }
      }
    }

    // 7. 저장은 10명씩 병렬 처리
    const BATCH_SIZE = 10
    const results: Array<{ studentId: string; success: boolean; reportId?: string; error?: string; skipped?: boolean }> = []

    for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
      const batch = studentIds.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(batch.map(generateForStudent))
      results.push(...batchResults)
    }

    // 8. 캐시 무효화
    revalidatePath('/reports')

    return { results }
  } catch (error) {
    console.error('[generateBulkMonthlyReports] Error:', error)
    return {
      results: studentIds.map((studentId) => ({
        studentId,
        success: false,
        error: getErrorMessage(error),
      })),
    }
  }
}
