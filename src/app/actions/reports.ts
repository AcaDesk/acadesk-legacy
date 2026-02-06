/**
 * Report Management Server Actions
 *
 * 리포트 생성 및 조회 Server Actions
 */

'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import type { ReportData } from '@/core/types/report.types'

// ============================================================================
// Helper Types
// ============================================================================

interface StudentDataWithUser {
  id: string
  student_code: string
  grade: string | null
  users: {
    name: string
  } | null
}

interface ExamScoreWithDetails {
  percentage: number
  feedback?: string | null
  exams?: {
    name: string
    exam_date: string
    category_code: string
    subject_id: string | null
    ref_exam_categories?: {
      label: string
    } | null
    subjects?: {
      name: string
      color: string
    } | null
  } | null
}

interface ExamScoreBasicType {
  percentage: number
  exams?: {
    category_code: string
    subject_id: string | null
  } | null
}

interface ExamScoreChartType {
  score: number
  total_score: number
  percentage: number
  exams?: {
    name: string
    exam_date: string
  } | null
}

interface AttendanceRecordType {
  attendance_date: string
  status: 'present' | 'late' | 'absent' | 'none'
  notes?: string | null
}

// ============================================================================
// Helper Functions for Subject Grouping
// ============================================================================

/**
 * 시험명에서 과목 키워드를 추출하여 정규화된 그룹 키를 반환
 * subject_id가 없는 시험도 전월대비 비교가 가능하도록 함
 */
const SUBJECT_KEYWORDS: Record<string, string> = {
  // Reading 관련
  'reading': 'subject_reading',
  'phonics': 'subject_reading',
  // Grammar 관련
  'grammar': 'subject_grammar',
  'writing': 'subject_grammar',
  // Speaking 관련
  'speaking': 'subject_speaking',
  'listening': 'subject_speaking',
  // Vocabulary 관련
  'vocabulary': 'subject_vocabulary',
  'vocab': 'subject_vocabulary',
  '단어': 'subject_vocabulary',
}

/**
 * 시험명에서 과목 키워드를 추출하여 그룹 키 반환
 */
function extractSubjectKeyFromName(examName: string): string | null {
  const lowerName = examName.toLowerCase()

  for (const [keyword, groupKey] of Object.entries(SUBJECT_KEYWORDS)) {
    if (lowerName.includes(keyword)) {
      return groupKey
    }
  }

  return null
}

/**
 * 그룹 키 생성 함수
 * 우선순위: subject_id > 시험명 키워드 추출 > category_code > 시험명
 */
function createGroupKey(
  subjectId: string | null,
  categoryCode: string | null,
  examName: string
): string {
  // 1. subject_id가 있으면 사용
  if (subjectId) {
    return `subject_${subjectId}`
  }

  // 2. 시험명에서 과목 키워드 추출 시도
  const extractedKey = extractSubjectKeyFromName(examName)
  if (extractedKey) {
    return extractedKey
  }

  // 3. category_code가 있으면 사용
  if (categoryCode) {
    return `category_${categoryCode}`
  }

  // 4. 최후의 수단으로 시험명 사용
  return `exam_${examName}`
}

// ============================================================================
// Server Actions
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
    const settings = (academyData.settings as Record<string, any>) || {}
    const academy = {
      name: academyData.name,
      phone: settings.phone || null,
      email: settings.email || null,
      address: settings.address || null,
      website: settings.website || null,
    }

    // 6. 출석 정보 조회
    const attendance = await getAttendanceData(supabase, studentId, periodStartStr, periodEndStr)

    // 7. 숙제 완료율 조회
    const homework = await getHomeworkData(supabase, studentId, periodStartStr, periodEndStr)

    // 8. 성적 정보 조회
    const scores = await getScoresData(
      supabase,
      studentId,
      periodStartStr,
      periodEndStr,
      prevPeriodStartStr,
      prevPeriodEndStr,
      tenantId
    )

    // 9. 강사 코멘트 생성
    const instructorComment = generateInstructorComment(attendance, scores)

    // 10. 차트 데이터 생성
    const gradesChartData = await getGradesChartData(
      supabase,
      studentId,
      periodStartStr,
      periodEndStr
    )
    const attendanceChartData = await getAttendanceChartData(
      supabase,
      studentId,
      periodStartStr,
      periodEndStr
    )

    // 11. 현재 성적 및 추이 데이터 생성
    const currentScore = await getCurrentScoreData(
      supabase,
      studentId,
      periodStartStr,
      periodEndStr
    )

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
    const settings = (academyData.settings as Record<string, any>) || {}
    const academy = {
      name: academyData.name,
      phone: settings.phone || null,
      email: settings.email || null,
      address: settings.address || null,
      website: settings.website || null,
    }

    // 6. 출석 정보 조회
    const attendance = await getAttendanceData(supabase, studentId, periodStartStr, periodEndStr)

    // 7. 숙제 완료율 조회
    const homework = await getHomeworkData(supabase, studentId, periodStartStr, periodEndStr)

    // 8. 성적 정보 조회
    const scores = await getScoresData(
      supabase,
      studentId,
      periodStartStr,
      periodEndStr,
      prevPeriodStartStr,
      prevPeriodEndStr,
      tenantId
    )

    // 9. 강사 코멘트 생성
    const instructorComment = generateInstructorComment(attendance, scores)

    // 10. 차트 데이터 생성
    const gradesChartData = await getGradesChartData(
      supabase,
      studentId,
      periodStartStr,
      periodEndStr
    )
    const attendanceChartData = await getAttendanceChartData(
      supabase,
      studentId,
      periodStartStr,
      periodEndStr
    )

    // 11. 현재 성적 및 추이 데이터 생성
    const currentScore = await getCurrentScoreData(
      supabase,
      studentId,
      periodStartStr,
      periodEndStr
    )
    const scoreTrend = await getScoreTrendData(
      supabase,
      studentId,
      year,
      month
    )

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

    // 4. Insert report
    const { data, error } = await supabase
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
      params.endDate
    )
    const homework = await getHomeworkData(
      supabase,
      params.studentId,
      params.startDate,
      params.endDate
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
출석률: ${attendance.rate}% (출석 ${attendance.present}회, 지각 ${attendance.late}회, 결석 ${attendance.absent}회)
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

      // notification_logs에 기록
      const { error: logError } = await supabase.from('notification_logs').insert({
        tenant_id: tenantId,
        student_id: params.studentId,
        session_id: null,
        notification_type: 'kakao',
        status: 'sent',
        message: `[알림톡 발송] 템플릿ID: ${params.kakaoTemplateId}, 수신자: ${params.recipientName} ${params.recipientContact}`,
        sent_at: new Date().toISOString(),
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
      message: `[발송 대상: ${params.recipientName} ${params.recipientContact}] ${message}`,
      sent_at: new Date().toISOString(),
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

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * 출석 데이터 조회
 */
async function getAttendanceData(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  studentId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data } = await supabase
    .from('attendance')
    .select('status, attendance_date')
    .eq('student_id', studentId)
    .gte('attendance_date', periodStart)
    .lte('attendance_date', periodEnd)

  const total = data?.length || 0
  const present = data?.filter((a) => a.status === 'present').length || 0
  const late = data?.filter((a) => a.status === 'late').length || 0
  const absent = data?.filter((a) => a.status === 'absent').length || 0
  const rate = total > 0 ? Math.round((present / total) * 100) : 0

  return { total, present, late, absent, rate }
}

/**
 * 숙제 완료율 조회
 */
async function getHomeworkData(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  studentId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data } = await supabase
    .from('student_todos')
    .select('completed_at')
    .eq('student_id', studentId)
    .gte('due_date', periodStart)
    .lte('due_date', periodEnd)

  const total = data?.length || 0
  const completed = data?.filter((t) => t.completed_at !== null).length || 0
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, rate }
}

/**
 * 성적 데이터 조회 (카테고리별)
 */
async function getScoresData(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  studentId: string,
  periodStart: string,
  periodEnd: string,
  prevPeriodStart: string,
  prevPeriodEnd: string,
  tenantId: string
) {
  // 날짜 비교 헬퍼 함수
  const extractDatePart = (dateStr: string): string => dateStr.slice(0, 10)

  // 현재 기간 성적 - DB에서 날짜 필터링
  const { data: currentScoresWithDate } = await supabase
    .from('exam_scores')
    .select(`
      percentage,
      feedback,
      is_retest,
      created_at,
      exams!inner!exam_id (
        name,
        exam_date,
        created_at,
        category_code,
        subject_id,
        ref_exam_categories (label),
        subjects (name, color)
      )
    `)
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .gte('exams.exam_date', periodStart)
    .lte('exams.exam_date', periodEnd)

  // exam_date가 NULL인 레거시 데이터 (created_at으로 필터링)
  const { data: currentLegacyScores } = await supabase
    .from('exam_scores')
    .select(`
      percentage,
      feedback,
      is_retest,
      created_at,
      exams!inner!exam_id (
        name,
        exam_date,
        created_at,
        category_code,
        subject_id,
        ref_exam_categories (label),
        subjects (name, color)
      )
    `)
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .is('exams.exam_date', null)

  const filteredLegacy = (currentLegacyScores || []).filter((score: any) => {
    const createdAt = score.exams?.created_at
    if (!createdAt) return false
    const datePart = extractDatePart(createdAt)
    return datePart >= periodStart && datePart <= periodEnd
  })

  const currentScores = [...(currentScoresWithDate || []), ...filteredLegacy]

  // 이전 기간 성적 - DB에서 날짜 필터링
  const { data: prevScoresWithDate } = await supabase
    .from('exam_scores')
    .select(`
      percentage,
      exams!inner!exam_id (name, category_code, subject_id, exam_date, created_at)
    `)
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .gte('exams.exam_date', prevPeriodStart)
    .lte('exams.exam_date', prevPeriodEnd)

  // 이전 기간 레거시 데이터
  const { data: prevLegacyScores } = await supabase
    .from('exam_scores')
    .select(`
      percentage,
      exams!inner!exam_id (name, category_code, subject_id, exam_date, created_at)
    `)
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .is('exams.exam_date', null)

  const filteredPrevLegacy = (prevLegacyScores || []).filter((score: any) => {
    const createdAt = score.exams?.created_at
    if (!createdAt) return false
    const datePart = extractDatePart(createdAt)
    return datePart >= prevPeriodStart && datePart <= prevPeriodEnd
  })

  const previousScores = [...(prevScoresWithDate || []), ...filteredPrevLegacy]

  // 현재 기간의 반 평균 및 재시험률 조회 (카테고리별) - DB에서 날짜 필터링
  const { data: classScoresWithDate } = await supabase
    .from('exam_scores')
    .select(`
      percentage,
      is_retest,
      exams!inner!exam_id (
        name,
        category_code,
        subject_id,
        exam_date,
        created_at
      )
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .gte('exams.exam_date', periodStart)
    .lte('exams.exam_date', periodEnd)

  // exam_date가 NULL인 레거시 데이터
  const { data: classLegacyScores } = await supabase
    .from('exam_scores')
    .select(`
      percentage,
      is_retest,
      exams!inner!exam_id (
        name,
        category_code,
        subject_id,
        exam_date,
        created_at
      )
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .is('exams.exam_date', null)

  const filteredClassLegacy = (classLegacyScores || []).filter((score: any) => {
    const createdAt = score.exams?.created_at
    if (!createdAt) return false
    const datePart = extractDatePart(createdAt)
    return datePart >= periodStart && datePart <= periodEnd
  })

  const classScores = [...(classScoresWithDate || []), ...filteredClassLegacy]

  // 카테고리별로 그룹화
  interface CategoryDataMap {
    category: string
    tests: Array<{
      name: string
      date: string
      percentage: number
      feedback: string | null
    }>
    percentages: number[]
    retestCount: number
    totalCount: number
  }

  const categories = new Map<string, CategoryDataMap>()

  currentScores?.forEach((score) => {
    const examScore = score as unknown as ExamScoreWithDetails & { is_retest?: boolean }

    // percentage가 null인 시험은 건너뛰기 (점수 미입력)
    if (examScore.percentage === null) {
      console.log('[getScoresData] Skipping exam without score:', {
        examName: examScore.exams?.name,
      })
      return
    }

    const subjectId = examScore.exams?.subject_id || null
    const categoryCode = examScore.exams?.category_code || null
    const examName = examScore.exams?.name || '시험'

    // 그룹화 키: subject_id > 시험명 키워드 추출 > category_code > 시험명
    const groupKey = createGroupKey(subjectId, categoryCode, examName)

    // 라벨: 과목명 > 카테고리명 > 시험명 우선순위
    const subjectName = examScore.exams?.subjects?.name
    const categoryLabel = examScore.exams?.ref_exam_categories?.label || categoryCode || ''
    const displayLabel = subjectName || categoryLabel || examName

    if (!categories.has(groupKey)) {
      categories.set(groupKey, {
        category: displayLabel,
        tests: [],
        percentages: [],
        retestCount: 0,
        totalCount: 0,
      })
    }

    const categoryData = categories.get(groupKey)
    if (categoryData) {
      categoryData.tests.push({
        name: examScore.exams?.name || '',
        date: examScore.exams?.exam_date || '',
        percentage: examScore.percentage,
        feedback: examScore.feedback || null,
      })
      categoryData.percentages.push(examScore.percentage)
      categoryData.totalCount++
      if (examScore.is_retest) {
        categoryData.retestCount++
      }
    }
  })

  // 이전 기간 평균 계산
  const prevAverages = new Map<string, number[]>()
  previousScores?.forEach((score) => {
    const examScore = score as unknown as ExamScoreBasicType

    // percentage가 null인 시험은 건너뛰기
    if (examScore.percentage === null) {
      return
    }

    const subjectId = examScore.exams?.subject_id || null
    const categoryCode = examScore.exams?.category_code || null
    const examName = (examScore.exams as any)?.name || '시험'

    // 그룹화 키: subject_id > 시험명 키워드 추출 > category_code > 시험명
    const groupKey = createGroupKey(subjectId, categoryCode, examName)

    if (!prevAverages.has(groupKey)) {
      prevAverages.set(groupKey, [])
    }
    const categoryScores = prevAverages.get(groupKey)
    if (categoryScores) {
      categoryScores.push(examScore.percentage)
    }
  })

  // 카테고리별 반 평균 및 재시험률 계산
  const classAverages = new Map<string, { percentages: number[]; retestCount: number; totalCount: number }>()
  classScores?.forEach((score) => {
    const typedScore = score as unknown as { percentage: number; is_retest?: boolean; exams?: { category_code: string; subject_id: string | null; name?: string } }

    // percentage가 null인 시험은 건너뛰기
    if (typedScore.percentage === null) {
      return
    }

    const subjectId = typedScore.exams?.subject_id || null
    const categoryCode = typedScore.exams?.category_code || null
    const examName = typedScore.exams?.name || '시험'

    // 그룹화 키: subject_id > 시험명 키워드 추출 > category_code > 시험명
    const groupKey = createGroupKey(subjectId, categoryCode, examName)

    if (!classAverages.has(groupKey)) {
      classAverages.set(groupKey, { percentages: [], retestCount: 0, totalCount: 0 })
    }

    const classData = classAverages.get(groupKey)
    if (classData) {
      classData.percentages.push(typedScore.percentage)
      classData.totalCount++
      if (typedScore.is_retest) {
        classData.retestCount++
      }
    }
  })

  // 최종 결과 생성
  return Array.from(categories.entries()).map(([category, data]) => {
    // 성적이 없는 경우 처리
    const currentAvg =
      data.percentages.length > 0
        ? data.percentages.reduce((sum: number, p: number) => sum + p, 0) / data.percentages.length
        : null

    const prevScores = prevAverages.get(category) || []
    const previousAvg =
      prevScores.length > 0
        ? prevScores.reduce((sum, p) => sum + p, 0) / prevScores.length
        : null

    const change =
      currentAvg !== null && previousAvg !== null
        ? Math.round((currentAvg - previousAvg) * 10) / 10
        : null

    // 반 평균 계산
    const classData = classAverages.get(category)
    const average = classData && classData.percentages.length > 0
      ? Math.round((classData.percentages.reduce((sum, p) => sum + p, 0) / classData.percentages.length) * 10) / 10
      : null

    // 재시험률 계산
    const retestRate = classData && classData.totalCount > 0
      ? Math.round((classData.retestCount / classData.totalCount) * 100 * 10) / 10
      : null

    return {
      category: data.category,
      current: currentAvg !== null ? Math.round(currentAvg * 10) / 10 : null,
      previous: previousAvg !== null ? Math.round(previousAvg * 10) / 10 : null,
      change,
      average,
      retestRate,
      tests: data.tests,
    }
  })
}

/**
 * 강사 코멘트 자동 생성
 */
function generateInstructorComment(
  attendance: { total: number; present: number; late: number; absent: number; rate: number },
  scores: Array<{
    category: string
    current: number | null
    previous: number | null
    change: number | null
    tests: unknown[]
  }>
): string {
  const comments: string[] = []

  // 출석 관련 코멘트
  if (attendance.rate >= 95) {
    comments.push('출석률이 매우 우수합니다.')
  } else if (attendance.rate >= 85) {
    comments.push('출석률이 양호합니다.')
  } else {
    comments.push('출석에 더욱 신경 써주시기 바랍니다.')
  }

  // 성적 관련 코멘트
  const improvingCategories = scores.filter((s) => s.change && s.change > 5)
  const decliningCategories = scores.filter((s) => s.change && s.change < -5)

  if (improvingCategories.length > 0) {
    comments.push(
      `${improvingCategories.map((c) => c.category).join(', ')} 영역에서 눈에 띄는 향상을 보이고 있습니다.`
    )
  }

  if (decliningCategories.length > 0) {
    comments.push(
      `${decliningCategories.map((c) => c.category).join(', ')} 영역에 좀 더 집중이 필요합니다.`
    )
  }

  // 전반적인 평가 (성적이 있는 과목만 계산)
  const scoresWithData = scores.filter((s) => s.current !== null)
  if (scoresWithData.length > 0) {
    const avgScore =
      scoresWithData.reduce((sum, s) => sum + (s.current || 0), 0) / scoresWithData.length

    if (avgScore >= 90) {
      comments.push('전반적으로 매우 우수한 성취도를 보이고 있습니다.')
    } else if (avgScore >= 80) {
      comments.push('전반적으로 양호한 성취도를 보이고 있습니다.')
    } else {
      comments.push('전반적인 학습 성취도 향상을 위해 함께 노력하겠습니다.')
    }
  } else {
    comments.push('해당 기간의 성적 데이터가 부족합니다. 정기적인 평가를 진행해주세요.')
  }

  return comments.join(' ')
}

/**
 * 성적 차트 데이터 생성
 */
async function getGradesChartData(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  studentId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data: allExamScores } = await supabase
    .from('exam_scores')
    .select(`
      score,
      total_score,
      percentage,
      exams!exam_id (
        name,
        exam_date,
        created_at
      )
    `)
    .eq('student_id', studentId)
    .is('deleted_at', null)

  // 날짜 비교 헬퍼 함수
  const extractDatePart = (dateStr: string): string => dateStr.slice(0, 10)

  // JavaScript에서 exam_date로 필터링 및 정렬 (fallback: created_at)
  const examScores = allExamScores?.filter((score: any) => {
    const examDate = score.exams?.exam_date || score.exams?.created_at
    if (!examDate) return false
    const examDatePart = extractDatePart(examDate)
    return examDatePart >= periodStart && examDatePart <= periodEnd
  }).sort((a: any, b: any) => {
    const dateA = a.exams?.exam_date || a.exams?.created_at || ''
    const dateB = b.exams?.exam_date || b.exams?.created_at || ''
    return dateA.localeCompare(dateB)
  }) || []

  if (!examScores || examScores.length === 0) {
    return []
  }

  const chartData = examScores.map((examScore) => {
    const typedScore = examScore as unknown as ExamScoreChartType
    const examName = typedScore.exams?.name || '시험'
    const scoreValue = typedScore.percentage || 0
    const date = typedScore.exams?.exam_date

    return {
      examName,
      score: Math.round(scoreValue * 10) / 10,
      classAverage: undefined,
      date,
    }
  })

  return chartData
}

/**
 * 출석 차트 데이터 생성 (히트맵용)
 */
async function getAttendanceChartData(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  studentId: string,
  periodStart: string,
  periodEnd: string
) {
  const { data: attendanceRecords } = await supabase
    .from('attendance')
    .select('attendance_date, status, notes')
    .eq('student_id', studentId)
    .gte('attendance_date', periodStart)
    .lte('attendance_date', periodEnd)
    .order('attendance_date', { ascending: true })

  if (!attendanceRecords) {
    return []
  }

  return attendanceRecords.map((record) => {
    const attendanceRecord = record as unknown as AttendanceRecordType
    return {
      date: new Date(attendanceRecord.attendance_date),
      status: attendanceRecord.status,
      note: attendanceRecord.notes || undefined,
    }
  })
}

/**
 * 현재 성적 데이터 생성 (학생 점수, 반 평균, 최고 점수)
 */
async function getCurrentScoreData(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  studentId: string,
  periodStart: string,
  periodEnd: string
) {
  // 날짜 비교 헬퍼 함수
  const extractDatePart = (dateStr: string): string => dateStr.slice(0, 10)

  // 현재 기간 내 시험 점수 조회 (DB에서 날짜 필터링)
  const { data: allMyScores } = await supabase
    .from('exam_scores')
    .select('percentage, exams!inner!exam_id(exam_date, created_at)')
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .gte('exams.exam_date', periodStart)
    .lte('exams.exam_date', periodEnd)

  // exam_date가 NULL인 레거시 데이터 추가 조회 (created_at으로 필터링)
  const { data: legacyScores } = await supabase
    .from('exam_scores')
    .select('percentage, exams!inner!exam_id(exam_date, created_at)')
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .is('exams.exam_date', null)

  // 레거시 데이터 중 created_at이 범위 내인 것만 포함
  const filteredLegacyScores = (legacyScores || []).filter((score: any) => {
    const createdAt = score.exams?.created_at
    if (!createdAt) return false
    const datePart = extractDatePart(createdAt)
    return datePart >= periodStart && datePart <= periodEnd
  })

  const myScores = [...(allMyScores || []), ...filteredLegacyScores]

  if (!myScores || myScores.length === 0) {
    return {
      myScore: 0,
      classAverage: 0,
      highestScore: 0,
    }
  }

  // 내 평균 점수 계산
  const myAverage =
    myScores.reduce((sum, score) => sum + score.percentage, 0) / myScores.length

  // 같은 기간 내 모든 학생들의 시험 점수 조회 (반 평균 계산용) - DB에서 날짜 필터링
  const { data: allScoresData } = await supabase
    .from('exam_scores')
    .select('percentage, student_id, exams!inner!exam_id(exam_date, created_at)')
    .is('deleted_at', null)
    .gte('exams.exam_date', periodStart)
    .lte('exams.exam_date', periodEnd)

  // exam_date가 NULL인 레거시 데이터 추가 조회
  const { data: allLegacyScores } = await supabase
    .from('exam_scores')
    .select('percentage, student_id, exams!inner!exam_id(exam_date, created_at)')
    .is('deleted_at', null)
    .is('exams.exam_date', null)

  // 레거시 데이터 중 created_at이 범위 내인 것만 포함
  const filteredAllLegacy = (allLegacyScores || []).filter((score: any) => {
    const createdAt = score.exams?.created_at
    if (!createdAt) return false
    const datePart = extractDatePart(createdAt)
    return datePart >= periodStart && datePart <= periodEnd
  })

  const allScores = [...(allScoresData || []), ...filteredAllLegacy]

  let classAverage = myAverage
  let highestScore = myAverage

  if (allScores && allScores.length > 0) {
    // 반 평균 계산
    classAverage =
      allScores.reduce((sum, score) => sum + score.percentage, 0) / allScores.length

    // 최고 점수 계산 (학생별 평균 중 최고)
    const studentAverages = new Map<string, number[]>()
    allScores.forEach((score) => {
      if (!studentAverages.has(score.student_id)) {
        studentAverages.set(score.student_id, [])
      }
      studentAverages.get(score.student_id)?.push(score.percentage)
    })

    const averages = Array.from(studentAverages.values()).map(
      (scores) => scores.reduce((sum, s) => sum + s, 0) / scores.length
    )
    highestScore = Math.max(...averages)
  }

  return {
    myScore: Math.round(myAverage * 10) / 10,
    classAverage: Math.round(classAverage * 10) / 10,
    highestScore: Math.round(highestScore * 10) / 10,
  }
}

/**
 * 성적 추이 데이터 생성 (최근 3개월)
 */
async function getScoreTrendData(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  studentId: string,
  currentYear: number,
  currentMonth: number
) {
  const trendData: Array<{
    name: string
    '학생 점수': number
    '반 평균': number
    '재시험률'?: number
  }> = []

  // 최근 3개월 데이터 생성
  for (let i = 2; i >= 0; i--) {
    const targetDate = new Date(currentYear, currentMonth - 1 - i, 1)
    const targetYear = targetDate.getFullYear()
    const targetMonth = targetDate.getMonth() + 1

    // 타임존 무관하게 날짜 문자열 직접 생성
    const lastDay = new Date(targetYear, targetMonth, 0).getDate()
    const periodStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
    const periodEnd = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // 날짜 비교 헬퍼 함수
    const extractDatePart = (dateStr: string): string => dateStr.slice(0, 10)

    // 해당 월의 학생 점수 조회 (is_retest 포함)
    const { data: allMyScores } = await supabase
      .from('exam_scores')
      .select('percentage, is_retest, exams!exam_id(exam_date, created_at)')
      .eq('student_id', studentId)
      .is('deleted_at', null)

    // JavaScript에서 exam_date로 필터링 (fallback: created_at)
    const myScores = allMyScores?.filter((score: any) => {
      const examDate = score.exams?.exam_date || score.exams?.created_at
      if (!examDate) return false
      const examDatePart = extractDatePart(examDate)
      return examDatePart >= periodStart && examDatePart <= periodEnd
    }) || []

    // 해당 월의 반 평균 조회
    const { data: allScoresData } = await supabase
      .from('exam_scores')
      .select('percentage, exams!exam_id(exam_date, created_at)')
      .is('deleted_at', null)

    // JavaScript에서 exam_date로 필터링 (fallback: created_at)
    const allScores = allScoresData?.filter((score: any) => {
      const examDate = score.exams?.exam_date || score.exams?.created_at
      if (!examDate) return false
      const examDatePart = extractDatePart(examDate)
      return examDatePart >= periodStart && examDatePart <= periodEnd
    }) || []

    const myAverage =
      myScores && myScores.length > 0
        ? myScores.reduce((sum, s) => sum + s.percentage, 0) / myScores.length
        : 0

    const classAverage =
      allScores && allScores.length > 0
        ? allScores.reduce((sum, s) => sum + s.percentage, 0) / allScores.length
        : 0

    // 재시험률 계산
    const retestCount = myScores ? myScores.filter((s: any) => s.is_retest).length : 0
    const totalCount = myScores ? myScores.length : 0
    const retestRate = totalCount > 0 ? Math.round((retestCount / totalCount) * 100 * 10) / 10 : 0

    const dataPoint: {
      name: string
      '학생 점수': number
      '반 평균': number
      '재시험률'?: number
    } = {
      name: `${targetMonth}월`,
      '학생 점수': Math.round(myAverage * 10) / 10,
      '반 평균': Math.round(classAverage * 10) / 10,
    }

    // 재시험률이 0보다 크면 추가
    if (retestRate > 0) {
      dataPoint['재시험률'] = retestRate
    }

    trendData.push(dataPoint)
  }

  return trendData
}

// ============================================================================
// Report List Queries
// ============================================================================

/**
 * Get all reports with filters
 *
 * @param options - Filter options
 * @returns Report list or error
 */
export async function getReports(options?: {
  studentId?: string
  reportType?: string
  limit?: number
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('reports')
      .select(`
        id,
        report_type,
        period_start,
        period_end,
        content,
        generated_at,
        sent_at,
        students!inner (
          id,
          student_code,
          grade,
          users:user_id!inner (
            name,
            email
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .order('generated_at', { ascending: false })

    if (options?.studentId && options.studentId !== 'all') {
      query = query.eq('student_id', options.studentId)
    }

    if (options?.reportType && options.reportType !== 'all') {
      query = query.eq('report_type', options.reportType)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getReports] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get students list for report filtering
 *
 * @returns Students list or error
 */
export async function getStudentsForFilter() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('students')
      .select('id, student_code, user_id!inner(name)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('student_code')

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getStudentsForFilter] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

