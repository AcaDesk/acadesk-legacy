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
  }[] | null
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
    const supabase = await createServiceRoleClient()

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
      .select('id, student_code, grade, tenant_id, users(name)')
      .eq('id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (studentError || !studentData) {
      throw new Error('학생을 찾을 수 없습니다.')
    }

    const typedStudentData = studentData as unknown as StudentDataWithUser

    // 5. 출석 정보 조회
    const attendance = await getAttendanceData(supabase, studentId, periodStartStr, periodEndStr)

    // 6. 숙제 완료율 조회
    const homework = await getHomeworkData(supabase, studentId, periodStartStr, periodEndStr)

    // 7. 성적 정보 조회
    const scores = await getScoresData(
      supabase,
      studentId,
      periodStartStr,
      periodEndStr,
      prevPeriodStartStr,
      prevPeriodEndStr
    )

    // 8. 강사 코멘트 생성
    const instructorComment = generateInstructorComment(
      typedStudentData,
      attendance,
      scores
    )

    // 9. 차트 데이터 생성
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

    const reportData: ReportData = {
      student: {
        id: typedStudentData.id,
        name: typedStudentData.users?.[0]?.name || 'Unknown',
        grade: typedStudentData.grade || '',
        student_code: typedStudentData.student_code,
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
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = await createServiceRoleClient()

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
    const supabase = await createServiceRoleClient()

    // 3. Query students
    const { data, error } = await supabase
      .from('students')
      .select('id, student_code, users(name)')
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
    const supabase = await createServiceRoleClient()

    // 3. 학생 정보 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, grade, users(name)')
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
    const studentName = typedStudent.users?.[0]?.name || '학생'
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
  }

  const categories = new Map<string, CategoryDataMap>()

  currentScores?.forEach((score) => {
    const examScore = score as unknown as ExamScoreWithDetails
    const category = examScore.exams?.category_code || ''
    const label = examScore.exams?.ref_exam_categories?.label || category

    if (!categories.has(category)) {
      categories.set(category, {
        category: label,
        tests: [],
        percentages: [],
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

    return {
      category: data.category,
      current: Math.round(currentAvg * 10) / 10,
      previous: previousAvg !== null ? Math.round(previousAvg * 10) / 10 : null,
      change,
      tests: data.tests,
    }
  })
}

/**
 * 강사 코멘트 자동 생성
 */
function generateInstructorComment(
  student: StudentDataWithUser,
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
