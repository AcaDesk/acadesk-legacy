/**
 * Report Helper Functions
 *
 * 리포트 생성에 사용되는 타입 정의 및 데이터 수집 헬퍼 함수
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ============================================================================
// Helper Types
// ============================================================================

export interface StudentDataWithUser {
  id: string
  student_code: string
  grade: string | null
  users: {
    name: string
  } | null
}

export interface ExamScoreWithDetails {
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

export interface ExamScoreBasicType {
  percentage: number
  exams?: {
    category_code: string
    subject_id: string | null
    name?: string
  } | null
}

export interface ExamScoreChartType {
  score: number
  total_score: number
  percentage: number
  exams?: {
    name: string
    exam_date: string
  } | null
}

interface ScoreWithExamDates {
  percentage: number
  is_retest?: boolean
  created_at?: string
  student_id?: string
  exams?: {
    name?: string
    exam_date?: string | null
    created_at?: string
    category_code?: string
    subject_id?: string | null
    ref_exam_categories?: { label: string } | null
    subjects?: { name: string; color: string } | null
  } | null
}

/** Supabase !inner 조인 결과를 ScoreWithExamDates 배열로 캐스팅 (런타임: 객체, TS 추론: 배열 보정) */
function castScores(data: unknown[] | null): ScoreWithExamDates[] {
  return (data ?? []) as ScoreWithExamDates[]
}

export interface AttendanceRecordType {
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
export function createGroupKey(
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
// Supabase Client Type
// ============================================================================

type ServiceRoleClient = Awaited<ReturnType<typeof createServiceRoleClient>>

// ============================================================================
// Data Collection Helpers
// ============================================================================

/**
 * 출석 데이터 조회
 */
export async function getAttendanceData(
  supabase: ServiceRoleClient,
  studentId: string,
  periodStart: string,
  periodEnd: string,
  tenantId: string
) {
  const { data } = await supabase
    .from('attendance')
    .select('status, attendance_date')
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .gte('attendance_date', periodStart)
    .lte('attendance_date', periodEnd)

  // 같은 날 복수 세션이 있을 경우 일수 기준으로 dedupe
  // 우선순위: present > late > absent (최선 상태 채택)
  const STATUS_PRIORITY: Record<string, number> = { present: 2, late: 1, absent: 0 }
  const dateMap = new Map<string, string>()
  for (const record of data || []) {
    const date = record.attendance_date
    const existing = dateMap.get(date)
    if (!existing || (STATUS_PRIORITY[record.status] ?? 0) > (STATUS_PRIORITY[existing] ?? 0)) {
      dateMap.set(date, record.status)
    }
  }

  const dedupedStatuses = Array.from(dateMap.values())
  const total = dedupedStatuses.length
  const present = dedupedStatuses.filter((s) => s === 'present').length
  const late = dedupedStatuses.filter((s) => s === 'late').length
  const absent = dedupedStatuses.filter((s) => s === 'absent').length
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0

  return { total, present, late, absent, rate }
}

/**
 * 숙제 완료율 조회
 */
export async function getHomeworkData(
  supabase: ServiceRoleClient,
  studentId: string,
  periodStart: string,
  periodEnd: string,
  tenantId: string
) {
  const { data } = await supabase
    .from('student_todos')
    .select('completed_at')
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
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
export async function getScoresData(
  supabase: ServiceRoleClient,
  studentId: string,
  periodStart: string,
  periodEnd: string,
  prevPeriodStart: string,
  prevPeriodEnd: string,
  tenantId: string
) {
  // 날짜 비교 헬퍼 함수
  const extractDatePart = (dateStr: string): string => dateStr.slice(0, 10)

  // JS 레벨 날짜 범위 필터 (exam_date 우선, 없으면 exams.created_at 폴백)
  // PostgREST의 !inner 조인 + 관련 테이블 칼럼 필터는 간헐적으로 0건을 반환하는 경우가 있어
  // 학생 점수는 날짜 필터 없이 전체 조회 후 JS에서 필터링한다
  function isInPeriod(score: ScoreWithExamDates, start: string, end: string): boolean {
    const effectiveDate =
      score.exams?.exam_date?.slice(0, 10) || score.exams?.created_at?.slice(0, 10)
    return !!effectiveDate && effectiveDate >= start && effectiveDate <= end
  }

  // 3개 쿼리 병렬 실행:
  // 1) 학생 전체 성적 (날짜 필터 없음 → JS 필터)
  // 2) 반 평균 현재 기간 (exam_date 있는 것, PostgREST 필터)
  // 3) 반 평균 레거시 (exam_date NULL, created_at JS 필터)
  const [
    { data: allStudentScores },
    { data: classScoresWithDate },
    { data: classLegacyScores },
  ] = await Promise.all([
    supabase
      .from('exam_scores')
      .select(`
        percentage,
        feedback,
        is_retest,
        created_at,
        exams!inner (
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
      .is('deleted_at', null),
    supabase
      .from('exam_scores')
      .select(`
        percentage,
        is_retest,
        exams!inner (name, category_code, subject_id, exam_date, created_at)
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('exams.exam_date', periodStart)
      .lte('exams.exam_date', periodEnd),
    supabase
      .from('exam_scores')
      .select(`
        percentage,
        is_retest,
        exams!inner (name, category_code, subject_id, exam_date, created_at)
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .is('exams.exam_date', null),
  ])

  const allScores = castScores(allStudentScores)
  const currentScores = allScores.filter((s) => isInPeriod(s, periodStart, periodEnd))
  const previousScores = allScores.filter((s) => isInPeriod(s, prevPeriodStart, prevPeriodEnd))

  const filteredClassLegacy = castScores(classLegacyScores).filter((score) => {
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
    const examName = examScore.exams?.name || '시험'

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
export function generateInstructorComment(
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
export async function getGradesChartData(
  supabase: ServiceRoleClient,
  studentId: string,
  periodStart: string,
  periodEnd: string,
  tenantId: string
) {
  // 날짜 비교 헬퍼 함수
  const extractDatePart = (dateStr: string): string => dateStr.slice(0, 10)

  const selectFields = `
    score,
    total_score,
    percentage,
    exams!inner (
      name,
      exam_date,
      created_at
    )
  `

  // DB 레벨 날짜 필터 + 레거시(NULL exam_date) 병렬 조회
  const [{ data: scoresWithDate }, { data: legacyScores }] = await Promise.all([
    supabase
      .from('exam_scores')
      .select(selectFields)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('exams.exam_date', periodStart)
      .lte('exams.exam_date', periodEnd),
    supabase
      .from('exam_scores')
      .select(selectFields)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .is('exams.exam_date', null),
  ])

  // 레거시 데이터 중 created_at이 범위 내인 것만 포함
  const filteredLegacy = castScores(legacyScores).filter((score) => {
    const createdAt = score.exams?.created_at
    if (!createdAt) return false
    const datePart = extractDatePart(createdAt)
    return datePart >= periodStart && datePart <= periodEnd
  })

  const examScores = [...castScores(scoresWithDate), ...filteredLegacy].sort((a, b) => {
    const dateA = a.exams?.exam_date || a.exams?.created_at || ''
    const dateB = b.exams?.exam_date || b.exams?.created_at || ''
    return dateA.localeCompare(dateB)
  })

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
export async function getAttendanceChartData(
  supabase: ServiceRoleClient,
  studentId: string,
  periodStart: string,
  periodEnd: string,
  tenantId: string
) {
  const { data: attendanceRecords } = await supabase
    .from('attendance')
    .select('attendance_date, status, notes')
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .gte('attendance_date', periodStart)
    .lte('attendance_date', periodEnd)
    .order('attendance_date', { ascending: true })

  if (!attendanceRecords) {
    return []
  }

  // 같은 날 복수 세션이 있을 경우 일수 기준으로 dedupe
  // 우선순위: present > late > absent (최선 상태 채택)
  const STATUS_PRIORITY: Record<string, number> = { present: 2, late: 1, absent: 0 }
  const dateMap = new Map<string, typeof attendanceRecords[number]>()
  for (const record of attendanceRecords) {
    const date = record.attendance_date
    const existing = dateMap.get(date)
    const recordPriority = STATUS_PRIORITY[record.status] ?? 0
    const existingPriority = existing ? (STATUS_PRIORITY[existing.status] ?? 0) : -1
    if (!existing || recordPriority > existingPriority) {
      dateMap.set(date, record)
    }
  }

  return Array.from(dateMap.values()).map((record) => {
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
export async function getCurrentScoreData(
  supabase: ServiceRoleClient,
  studentId: string,
  periodStart: string,
  periodEnd: string,
  tenantId: string
) {
  // 날짜 비교 헬퍼 함수
  const extractDatePart = (dateStr: string): string => dateStr.slice(0, 10)

  // 4개 쿼리 병렬 실행 (학생 점수 + 레거시, 전체 점수 + 레거시)
  const [
    { data: allMyScores },
    { data: legacyScores },
    { data: allScoresData },
    { data: allLegacyScores },
  ] = await Promise.all([
    supabase
      .from('exam_scores')
      .select('percentage, exams!inner(exam_date, created_at)')
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('exams.exam_date', periodStart)
      .lte('exams.exam_date', periodEnd),
    supabase
      .from('exam_scores')
      .select('percentage, exams!inner(exam_date, created_at)')
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .is('exams.exam_date', null),
    supabase
      .from('exam_scores')
      .select('percentage, student_id, exams!inner(exam_date, created_at)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .gte('exams.exam_date', periodStart)
      .lte('exams.exam_date', periodEnd),
    supabase
      .from('exam_scores')
      .select('percentage, student_id, exams!inner(exam_date, created_at)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .is('exams.exam_date', null),
  ])

  // 레거시 데이터 중 created_at이 범위 내인 것만 포함
  const filteredLegacyScores = castScores(legacyScores).filter((score) => {
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

  // 레거시 데이터 중 created_at이 범위 내인 것만 포함
  const filteredAllLegacy = castScores(allLegacyScores).filter((score) => {
    const createdAt = score.exams?.created_at
    if (!createdAt) return false
    const datePart = extractDatePart(createdAt)
    return datePart >= periodStart && datePart <= periodEnd
  })

  const allScores = [...castScores(allScoresData), ...filteredAllLegacy]

  let classAverage = myAverage
  let highestScore = myAverage

  if (allScores && allScores.length > 0) {
    // 반 평균 계산
    classAverage =
      allScores.reduce((sum, score) => sum + score.percentage, 0) / allScores.length

    // 최고 점수 계산 (학생별 평균 중 최고)
    const studentAverages = new Map<string, number[]>()
    allScores.forEach((score) => {
      const sid = score.student_id
      if (!sid) return
      if (!studentAverages.has(sid)) {
        studentAverages.set(sid, [])
      }
      studentAverages.get(sid)?.push(score.percentage)
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
export async function getScoreTrendData(
  supabase: ServiceRoleClient,
  studentId: string,
  currentYear: number,
  currentMonth: number,
  tenantId: string
) {
  // 날짜 비교 헬퍼 함수
  const extractDatePart = (dateStr: string): string => dateStr.slice(0, 10)

  // 최근 3개월 기간 정보 사전 계산
  const monthConfigs = [2, 1, 0].map((i) => {
    const targetDate = new Date(currentYear, currentMonth - 1 - i, 1)
    const targetYear = targetDate.getFullYear()
    const targetMonth = targetDate.getMonth() + 1
    const lastDay = new Date(targetYear, targetMonth, 0).getDate()
    const periodStart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
    const periodEnd = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { targetMonth, periodStart, periodEnd }
  })

  // 3개월 × 4개 쿼리 = 12개 쿼리 동시 실행 (날짜 필터 포함)
  const monthResults = await Promise.all(
    monthConfigs.map(async ({ targetMonth, periodStart, periodEnd }) => {
      const [
        { data: myScoresWithDate },
        { data: myLegacyScores },
        { data: classScoresWithDate },
        { data: classLegacyScores },
      ] = await Promise.all([
        supabase
          .from('exam_scores')
          .select('percentage, is_retest, exams!inner(exam_date, created_at)')
          .eq('student_id', studentId)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .gte('exams.exam_date', periodStart)
          .lte('exams.exam_date', periodEnd),
        supabase
          .from('exam_scores')
          .select('percentage, is_retest, exams!inner(exam_date, created_at)')
          .eq('student_id', studentId)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .is('exams.exam_date', null),
        supabase
          .from('exam_scores')
          .select('percentage, exams!inner(exam_date, created_at)')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .gte('exams.exam_date', periodStart)
          .lte('exams.exam_date', periodEnd),
        supabase
          .from('exam_scores')
          .select('percentage, exams!inner(exam_date, created_at)')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .is('exams.exam_date', null),
      ])

      // 레거시 데이터 필터링 (created_at 기준)
      const filteredMyLegacy = castScores(myLegacyScores).filter((score) => {
        const createdAt = score.exams?.created_at
        if (!createdAt) return false
        const datePart = extractDatePart(createdAt)
        return datePart >= periodStart && datePart <= periodEnd
      })
      const myScores = [...castScores(myScoresWithDate), ...filteredMyLegacy]

      const filteredClassLegacy = castScores(classLegacyScores).filter((score) => {
        const createdAt = score.exams?.created_at
        if (!createdAt) return false
        const datePart = extractDatePart(createdAt)
        return datePart >= periodStart && datePart <= periodEnd
      })
      const allScores = [...castScores(classScoresWithDate), ...filteredClassLegacy]

      const myAverage =
        myScores.length > 0
          ? myScores.reduce((sum, s) => sum + s.percentage, 0) / myScores.length
          : 0

      const classAverage =
        allScores.length > 0
          ? allScores.reduce((sum, s) => sum + s.percentage, 0) / allScores.length
          : 0

      // 재시험률 계산
      const retestCount = myScores.filter((s) => s.is_retest).length
      const totalCount = myScores.length
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

      if (retestRate > 0) {
        dataPoint['재시험률'] = retestRate
      }

      return dataPoint
    })
  )

  // 시험 데이터가 없는 달(학생 점수 = 0)은 추이 차트에서 제외
  // PostgREST !inner 조인 날짜 필터가 간헐적으로 0건을 반환하는 케이스도 함께 처리
  return monthResults.filter((p) => p['학생 점수'] > 0)
}
