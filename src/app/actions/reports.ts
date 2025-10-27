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
    ref_exam_categories?: {
      label: string
    } | null
  } | null
}

interface ExamScoreBasicType {
  percentage: number
  exams?: {
    category_code: string
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
  note?: string | null
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
      prevPeriodEndStr
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
      '내 점수': number
      '반 평균': number
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

    // 3. 기간 설정
    const periodStart = new Date(year, month - 1, 1)
    const periodEnd = new Date(year, month, 0)
    const periodStartStr = periodStart.toISOString().split('T')[0]
    const periodEndStr = periodEnd.toISOString().split('T')[0]

    // 이전 달 기간
    const prevPeriodStart = new Date(year, month - 2, 1)
    const prevPeriodEnd = new Date(year, month - 1, 0)
    const prevPeriodStartStr = prevPeriodStart.toISOString().split('T')[0]
    const prevPeriodEndStr = prevPeriodEnd.toISOString().split('T')[0]

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
      prevPeriodEndStr
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

    // 3. Query students
    const { data, error } = await supabase
      .from('students')
      .select('id, student_code, users!inner(name)')
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
    } else {
      // Email/Kakao: 준비 중
      throw new Error(`${params.channel} 채널은 준비 중입니다.`)
    }

    // 6. notification_logs에 기록 (실제 발송은 외부 시스템 연동 필요)
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
    .select('status')
    .eq('student_id', studentId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)

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
  prevPeriodEnd: string
) {
  // 현재 기간 성적
  const { data: currentScores } = await supabase
    .from('exam_scores')
    .select(`
      percentage,
      feedback,
      is_retest,
      exams (
        name,
        exam_date,
        category_code,
        ref_exam_categories (label)
      )
    `)
    .eq('student_id', studentId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)
    .order('created_at', { ascending: false })

  // 이전 기간 성적
  const { data: previousScores } = await supabase
    .from('exam_scores')
    .select(`
      percentage,
      exams (category_code)
    `)
    .eq('student_id', studentId)
    .gte('created_at', prevPeriodStart)
    .lte('created_at', prevPeriodEnd)

  // 현재 기간의 반 평균 및 재시험률 조회 (카테고리별)
  const { data: classScores } = await supabase
    .from('exam_scores')
    .select(`
      percentage,
      is_retest,
      exams!inner (
        category_code,
        exam_date
      )
    `)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)

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
    const category = examScore.exams?.category_code || ''
    const label = examScore.exams?.ref_exam_categories?.label || category

    if (!categories.has(category)) {
      categories.set(category, {
        category: label,
        tests: [],
        percentages: [],
        retestCount: 0,
        totalCount: 0,
      })
    }

    const categoryData = categories.get(category)
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
    const category = examScore.exams?.category_code || ''
    if (!prevAverages.has(category)) {
      prevAverages.set(category, [])
    }
    const categoryScores = prevAverages.get(category)
    if (categoryScores) {
      categoryScores.push(examScore.percentage)
    }
  })

  // 카테고리별 반 평균 및 재시험률 계산
  const classAverages = new Map<string, { percentages: number[]; retestCount: number; totalCount: number }>()
  classScores?.forEach((score) => {
    const typedScore = score as unknown as { percentage: number; is_retest?: boolean; exams?: { category_code: string } }
    const category = typedScore.exams?.category_code || ''

    if (!classAverages.has(category)) {
      classAverages.set(category, { percentages: [], retestCount: 0, totalCount: 0 })
    }

    const classData = classAverages.get(category)
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
    const currentAvg =
      data.percentages.reduce((sum: number, p: number) => sum + p, 0) /
      data.percentages.length

    const prevScores = prevAverages.get(category) || []
    const previousAvg =
      prevScores.length > 0
        ? prevScores.reduce((sum, p) => sum + p, 0) / prevScores.length
        : null

    const change =
      previousAvg !== null ? Math.round((currentAvg - previousAvg) * 10) / 10 : null

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
      current: Math.round(currentAvg * 10) / 10,
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
    current: number
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

  // 전반적인 평가
  const avgScore =
    scores.reduce((sum, s) => sum + s.current, 0) / (scores.length || 1)

  if (avgScore >= 90) {
    comments.push('전반적으로 매우 우수한 성취도를 보이고 있습니다.')
  } else if (avgScore >= 80) {
    comments.push('전반적으로 양호한 성취도를 보이고 있습니다.')
  } else {
    comments.push('전반적인 학습 성취도 향상을 위해 함께 노력하겠습니다.')
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
  const { data: examScores } = await supabase
    .from('exam_scores')
    .select(`
      score,
      total_score,
      percentage,
      exams (
        name,
        exam_date
      )
    `)
    .eq('student_id', studentId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)
    .order('created_at', { ascending: true })

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
    .select('attendance_date, status, note')
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
      note: attendanceRecord.note || undefined,
    }
  })
}

/**
 * 현재 성적 데이터 생성 (내 점수, 반 평균, 최고 점수)
 */
async function getCurrentScoreData(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  studentId: string,
  periodStart: string,
  periodEnd: string
) {
  // 현재 기간 내 모든 시험 점수 조회
  const { data: myScores } = await supabase
    .from('exam_scores')
    .select('percentage')
    .eq('student_id', studentId)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)

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

  // 같은 기간 내 모든 학생들의 시험 점수 조회 (반 평균 계산용)
  const { data: allScores } = await supabase
    .from('exam_scores')
    .select('percentage, student_id')
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)

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
    '내 점수': number
    '반 평균': number
    '재시험률'?: number
  }> = []

  // 최근 3개월 데이터 생성
  for (let i = 2; i >= 0; i--) {
    const targetDate = new Date(currentYear, currentMonth - 1 - i, 1)
    const targetYear = targetDate.getFullYear()
    const targetMonth = targetDate.getMonth() + 1

    const periodStart = new Date(targetYear, targetMonth - 1, 1).toISOString().split('T')[0]
    const periodEnd = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0]

    // 해당 월의 내 점수 조회 (is_retest 포함)
    const { data: myScores } = await supabase
      .from('exam_scores')
      .select('percentage, is_retest')
      .eq('student_id', studentId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    // 해당 월의 반 평균 조회
    const { data: allScores } = await supabase
      .from('exam_scores')
      .select('percentage')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

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
      '내 점수': number
      '반 평균': number
      '재시험률'?: number
    } = {
      name: `${targetMonth}월`,
      '내 점수': Math.round(myAverage * 10) / 10,
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
// Report Sending Functions
// ============================================================================

import {
  generateShortCode,
  generateReportShareUrl,
  generateSmsShortUrl,
  generateReportSmsMessage,
  calculateLinkExpiry,
} from '@/lib/short-url'

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
          relationship
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
        phone: string
        relationship: string
      }

      if (!guardian.phone) {
        console.warn(`Guardian ${guardian.id} has no phone number, skipping`)
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
          recipient_phone: guardian.phone,
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
      const month = new Date(report.content.period.start).getMonth() + 1

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
        recipientPhone: guardian.phone,
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

    // 3. report_send 정보 조회
    const { data: reportSend, error } = await supabase
      .from('report_sends')
      .select('*')
      .eq('id', reportSendId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error || !reportSend) {
      throw new Error('발송 정보를 찾을 수 없습니다')
    }

    // 4. 알리고 API 호출 (IMessageProvider 사용)
    const { createAligoProvider } = await import('@/infra/messaging/AligoProvider')
    const { MessageChannel } = await import('@/core/domain/messaging/IMessageProvider')

    const messageProvider = createAligoProvider()

    const sendResult = await messageProvider.send({
      channel: reportSend.message_type === 'SMS' ? MessageChannel.SMS : MessageChannel.LMS,
      recipient: {
        name: reportSend.recipient_name,
        phone: reportSend.recipient_phone,
      },
      content: {
        body: reportSend.message_body,
      },
      metadata: {
        tenantId: tenantId,
        reportId: reportSend.report_id,
      },
    })

    if (!sendResult.success || !sendResult.messageId) {
      throw new Error(sendResult.error || '메시지 발송 실패')
    }

    const aligoMsgid = sendResult.messageId

    // 5. report_sends 업데이트 (발송 완료)
    await supabase
      .from('report_sends')
      .update({
        send_status: 'sent',
        aligo_msgid: aligoMsgid,
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

    // 7. Revalidate
    revalidatePath('/reports')
    revalidatePath(`/reports/${reportSend.report_id}`)

    return {
      success: true,
      data: { msgid: aligoMsgid },
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
