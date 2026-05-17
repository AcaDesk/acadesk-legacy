/**
 * Report Helper Functions
 *
 * 리포트 생성에 사용되는 타입 정의 및 데이터 수집 헬퍼 함수
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'

// ============================================================================
// Shared Types
// ============================================================================

export interface StudentDataWithUser {
  id: string
  student_code: string
  grade: string | null
  users: {
    name: string
  } | null
}

export interface AttendanceRecordType {
  attendance_date: string
  status: 'present' | 'late' | 'left_early' | 'absent' | 'excused' | 'none'
  notes?: string | null
}

export interface ReportPeriod {
  start: string
  end: string
}

export interface TrendPeriod extends ReportPeriod {
  key: string
  label: string
}

export interface ScoreSummaryItem {
  category: string
  current: number | null
  previous: number | null
  change: number | null
  average: number | null
  retestRate: number | null
  tests: Array<{
    name: string
    date: string
    percentage: number
    feedback: string | null
  }>
}

export interface StudentReportMetrics {
  attendance: {
    total: number
    present: number
    late: number
    absent: number
    rate: number
  }
  homework: {
    total: number
    completed: number
    rate: number
  }
  scores: ScoreSummaryItem[]
  gradesChartData: Array<{
    examName: string
    score: number
    classAverage?: number
    date?: string
  }>
  attendanceChartData: Array<{
    date: Date
    status: 'present' | 'late' | 'left_early' | 'absent' | 'excused' | 'none'
    note?: string
  }>
  currentScore: {
    myScore: number
    classAverage: number
    highestScore: number
  }
  scoreTrend: Array<{
    name: string
    '학생 점수': number
    '반 평균': number
    '재시험률'?: number
  }>
}

// ============================================================================
// Subject Grouping
// ============================================================================

/**
 * 시험명에서 과목 키워드를 추출하여 정규화된 그룹 키를 반환
 * subject_id가 없는 시험도 전월대비 비교가 가능하도록 함
 */
const SUBJECT_KEYWORDS: Record<string, string> = {
  reading: 'subject_reading',
  phonics: 'subject_reading',
  grammar: 'subject_grammar',
  writing: 'subject_grammar',
  speaking: 'subject_speaking',
  listening: 'subject_speaking',
  vocabulary: 'subject_vocabulary',
  vocab: 'subject_vocabulary',
  단어: 'subject_vocabulary',
}

const EXAM_CATEGORY_LABELS: Record<string, string> = {
  midterm: '중간고사',
  final: '기말고사',
  mock: '모의고사',
  quiz: '쪽지시험',
  performance: '수행평가',
  placement: '레벨테스트',
  assignment: '과제평가',
  monthly: '월간평가',
  other: '기타',
}

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
  if (subjectId) {
    return `subject_${subjectId}`
  }

  const extractedKey = extractSubjectKeyFromName(examName)
  if (extractedKey) {
    return extractedKey
  }

  if (categoryCode) {
    return `category_${categoryCode}`
  }

  return `exam_${examName}`
}

// ============================================================================
// Supabase Client Type
// ============================================================================

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>

// ============================================================================
// Internal Types
// ============================================================================

interface AttendanceRow {
  student_id: string
  attendance_date: string
  status: string
  notes?: string | null
}

interface HomeworkRow {
  student_id: string
  completed_at: string | null
}

interface ExamRow {
  id: string
  name: string
  exam_date: string | null
  created_at: string
  category_code: string | null
  subject_id: string | null
  subjects?: { name: string; color: string | null } | Array<{ name: string; color: string | null }> | null
}

interface ExamMeta {
  id: string
  name: string
  exam_date: string | null
  created_at: string
  category_code: string | null
  subject_id: string | null
  categoryLabel: string | null
  subjectName: string | null
  subjectColor: string | null
}

interface ScoreRow {
  student_id: string
  exam_id: string
  percentage: number | null
  feedback: string | null
  is_retest: boolean | null
  score: number | null
  total_points: number | null
}

interface ScoreRecord extends ScoreRow {
  exam: ExamMeta
}

interface PeriodMembership {
  current: boolean
  previous: boolean
  trendKeys: string[]
}

interface ScoreContext {
  currentStudentScores: Map<string, ScoreRecord[]>
  previousStudentScores: Map<string, ScoreRecord[]>
  currentClassScores: ScoreRecord[]
  trendStudentScores: Map<string, Map<string, ScoreRecord[]>>
  trendClassScores: Map<string, ScoreRecord[]>
}

const STATUS_PRIORITY: Record<string, number> = {
  present: 2,
  late: 1,
  left_early: 1,
  absent: 0,
  excused: 0,
  none: -1,
}

// ============================================================================
// Generic Helpers
// ============================================================================

function toDatePart(value: string | null | undefined): string | null {
  return value ? value.slice(0, 10) : null
}

function isDateInPeriod(date: string | null, period: ReportPeriod): boolean {
  return Boolean(date && date >= period.start && date <= period.end)
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }
  return value ?? null
}

function getCategoryLabel(categoryCode: string | null): string | null {
  if (!categoryCode) return null
  return EXAM_CATEGORY_LABELS[categoryCode] || categoryCode
}

function normalizeExam(row: ExamRow): ExamMeta {
  const subject = firstRelation(row.subjects)

  return {
    id: row.id,
    name: row.name,
    exam_date: row.exam_date,
    created_at: row.created_at,
    category_code: row.category_code,
    subject_id: row.subject_id,
    categoryLabel: getCategoryLabel(row.category_code),
    subjectName: subject?.name || null,
    subjectColor: subject?.color || null,
  }
}

function getEffectiveExamDate(exam: ExamMeta): string {
  return toDatePart(exam.exam_date) || toDatePart(exam.created_at) || ''
}

function pushToMapList<T>(map: Map<string, T[]>, key: string, item: T) {
  const existing = map.get(key)
  if (existing) {
    existing.push(item)
    return
  }
  map.set(key, [item])
}

function pushToNestedMapList<T>(
  map: Map<string, Map<string, T[]>>,
  outerKey: string,
  innerKey: string,
  item: T
) {
  const nested = map.get(outerKey)
  if (!nested) {
    const inner = new Map<string, T[]>()
    inner.set(innerKey, [item])
    map.set(outerKey, inner)
    return
  }

  pushToMapList(nested, innerKey, item)
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function roundOneDecimal(value: number | null): number | null {
  if (value === null) return null
  return Math.round(value * 10) / 10
}

function getScorePercentage(score: Pick<ScoreRow, 'percentage' | 'score' | 'total_points'>): number | null {
  if (score.percentage !== null && score.percentage !== undefined) {
    return score.percentage
  }

  if (
    score.score === null ||
    score.score === undefined ||
    score.total_points === null ||
    score.total_points === undefined ||
    score.total_points <= 0
  ) {
    return null
  }

  return roundOneDecimal((score.score / score.total_points) * 100)
}

function dedupeAttendanceRecords(records: AttendanceRow[]): AttendanceRow[] {
  const dateMap = new Map<string, AttendanceRow>()

  for (const record of records) {
    const date = record.attendance_date
    const existing = dateMap.get(date)
    const recordPriority = STATUS_PRIORITY[record.status] ?? -1
    const existingPriority = existing ? (STATUS_PRIORITY[existing.status] ?? -1) : -1

    if (!existing || recordPriority > existingPriority) {
      dateMap.set(date, record)
    }
  }

  return Array.from(dateMap.values()).sort((a, b) =>
    a.attendance_date.localeCompare(b.attendance_date)
  )
}

function buildAttendanceMetrics(records: AttendanceRow[]) {
  const deduped = dedupeAttendanceRecords(records)

  const total = deduped.length
  const present = deduped.filter((record) => record.status === 'present').length
  const late = deduped.filter((record) => record.status === 'late').length
  const leftEarly = deduped.filter((record) => record.status === 'left_early').length
  const excused = deduped.filter((record) => record.status === 'excused').length
  const absent = deduped.filter((record) => record.status === 'absent').length + excused
  const adjustedLate = late + leftEarly
  const rate = total > 0 ? Math.round(((present + adjustedLate) / total) * 100) : 0

  return { total, present, late: adjustedLate, absent, rate }
}

function buildAttendanceChart(
  records: AttendanceRow[]
): Array<{ date: Date; status: 'present' | 'late' | 'left_early' | 'absent' | 'excused' | 'none'; note?: string }> {
  return dedupeAttendanceRecords(records).map((record) => {
    const status: 'present' | 'late' | 'left_early' | 'absent' | 'excused' | 'none' =
      record.status === 'present' ||
      record.status === 'late' ||
      record.status === 'left_early' ||
      record.status === 'absent' ||
      record.status === 'excused'
        ? record.status
        : 'none'

    return {
      date: new Date(record.attendance_date),
      status,
      note: record.notes || undefined,
    }
  })
}

function buildHomeworkMetrics(records: HomeworkRow[]) {
  const total = records.length
  const completed = records.filter((record) => record.completed_at !== null).length
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0

  return { total, completed, rate }
}

function buildScoresSummary(
  currentScores: ScoreRecord[],
  previousScores: ScoreRecord[],
  classCurrentScores: ScoreRecord[]
): ScoreSummaryItem[] {
  interface CategoryBucket {
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

  const categories = new Map<string, CategoryBucket>()

  for (const score of currentScores) {
    const percentage = getScorePercentage(score)
    if (percentage === null) continue

    const groupKey = createGroupKey(
      score.exam.subject_id,
      score.exam.category_code,
      score.exam.name
    )
    const displayLabel =
      score.exam.subjectName ||
      score.exam.categoryLabel ||
      score.exam.name

    if (!categories.has(groupKey)) {
      categories.set(groupKey, {
        category: displayLabel,
        tests: [],
        percentages: [],
        retestCount: 0,
        totalCount: 0,
      })
    }

    const bucket = categories.get(groupKey)!
    bucket.tests.push({
      name: score.exam.name,
      date: getEffectiveExamDate(score.exam),
      percentage,
      feedback: score.feedback || null,
    })
    bucket.percentages.push(percentage)
    bucket.totalCount++
    if (score.is_retest) {
      bucket.retestCount++
    }
  }

  const previousByCategory = new Map<string, number[]>()
  for (const score of previousScores) {
    const percentage = getScorePercentage(score)
    if (percentage === null) continue

    const groupKey = createGroupKey(
      score.exam.subject_id,
      score.exam.category_code,
      score.exam.name
    )
    pushToMapList(previousByCategory, groupKey, percentage)
  }

  const classByCategory = new Map<
    string,
    { percentages: number[]; retestCount: number; totalCount: number }
  >()

  for (const score of classCurrentScores) {
    const percentage = getScorePercentage(score)
    if (percentage === null) continue

    const groupKey = createGroupKey(
      score.exam.subject_id,
      score.exam.category_code,
      score.exam.name
    )

    const existing = classByCategory.get(groupKey)
    if (existing) {
      existing.percentages.push(percentage)
      existing.totalCount++
      if (score.is_retest) {
        existing.retestCount++
      }
      continue
    }

    classByCategory.set(groupKey, {
      percentages: [percentage],
      retestCount: score.is_retest ? 1 : 0,
      totalCount: 1,
    })
  }

  return Array.from(categories.entries()).map(([categoryKey, bucket]) => {
    const currentAvg = average(bucket.percentages)
    const previousAvg = average(previousByCategory.get(categoryKey) || [])
    const classBucket = classByCategory.get(categoryKey)
    const classAverage = classBucket
      ? average(classBucket.percentages)
      : null
    const retestRate =
      classBucket && classBucket.totalCount > 0
        ? Math.round((classBucket.retestCount / classBucket.totalCount) * 1000) / 10
        : null

    return {
      category: bucket.category,
      current: roundOneDecimal(currentAvg),
      previous: roundOneDecimal(previousAvg),
      change:
        currentAvg !== null && previousAvg !== null
          ? roundOneDecimal(currentAvg - previousAvg)
          : null,
      average: roundOneDecimal(classAverage),
      retestRate,
      tests: bucket.tests.sort((a, b) => a.date.localeCompare(b.date)),
    }
  })
}

function buildGradesChartData(currentScores: ScoreRecord[]) {
  return currentScores
    .map((score) => ({
      score,
      percentage: getScorePercentage(score),
    }))
    .filter((entry) => entry.percentage !== null)
    .sort((a, b) => getEffectiveExamDate(a.score.exam).localeCompare(getEffectiveExamDate(b.score.exam)))
    .map(({ score, percentage }) => ({
      examName: score.exam.name,
      score: Math.round((percentage || 0) * 10) / 10,
      classAverage: undefined,
      date: score.exam.exam_date || undefined,
    }))
}

function buildCurrentScoreSummary(
  currentStudentScores: ScoreRecord[],
  currentClassScores: ScoreRecord[]
) {
  const myPercentages = currentStudentScores
    .map((score) => getScorePercentage(score))
    .filter((value): value is number => value !== null)

  if (myPercentages.length === 0) {
    return {
      myScore: 0,
      classAverage: 0,
      highestScore: 0,
    }
  }

  const myAverage = average(myPercentages) || 0
  const classScores = currentClassScores
    .map((score) => ({
      studentId: score.student_id,
      percentage: getScorePercentage(score),
    }))
    .filter((value): value is { studentId: string; percentage: number } => value.percentage !== null)

  if (classScores.length === 0) {
    const rounded = Math.round(myAverage * 10) / 10
    return {
      myScore: rounded,
      classAverage: rounded,
      highestScore: rounded,
    }
  }

  const classAverage = average(classScores.map((score) => score.percentage)) || myAverage
  const averagesByStudent = new Map<string, number[]>()

  for (const score of classScores) {
    pushToMapList(averagesByStudent, score.studentId, score.percentage)
  }

  const highestScore = Math.max(
    ...Array.from(averagesByStudent.values()).map((scores) => average(scores) || 0)
  )

  return {
    myScore: Math.round(myAverage * 10) / 10,
    classAverage: Math.round(classAverage * 10) / 10,
    highestScore: Math.round(highestScore * 10) / 10,
  }
}

function buildScoreTrendData(
  trendPeriods: TrendPeriod[],
  studentScoresByPeriod: Map<string, ScoreRecord[]>,
  classScoresByPeriod: Map<string, ScoreRecord[]>
) {
  return trendPeriods
    .map((trendPeriod) => {
      const myScores = (studentScoresByPeriod.get(trendPeriod.key) || [])
        .map((score) => ({
          isRetest: score.is_retest,
          percentage: getScorePercentage(score),
        }))
        .filter((score): score is { isRetest: boolean | null; percentage: number } => score.percentage !== null)
      const classScores = (classScoresByPeriod.get(trendPeriod.key) || [])
        .map((score) => getScorePercentage(score))
        .filter((score): score is number => score !== null)

      const myAverage = average(myScores.map((score) => score.percentage)) || 0
      const classAverage = average(classScores) || 0
      const retestCount = myScores.filter((score) => score.isRetest).length
      const retestRate =
        myScores.length > 0
          ? Math.round((retestCount / myScores.length) * 1000) / 10
          : 0

      const point: {
        name: string
        '학생 점수': number
        '반 평균': number
        '재시험률'?: number
      } = {
        name: trendPeriod.label,
        '학생 점수': Math.round(myAverage * 10) / 10,
        '반 평균': Math.round(classAverage * 10) / 10,
      }

      if (retestRate > 0) {
        point['재시험률'] = retestRate
      }

      return point
    })
    .filter((point) => point['학생 점수'] > 0)
}

function createEmptyScoreContext(): ScoreContext {
  return {
    currentStudentScores: new Map(),
    previousStudentScores: new Map(),
    currentClassScores: [],
    trendStudentScores: new Map(),
    trendClassScores: new Map(),
  }
}

// ============================================================================
// Attendance / Homework Fetchers
// ============================================================================

async function fetchAttendanceRows(
  supabase: ServiceRoleClient,
  studentIds: string[],
  period: ReportPeriod,
  tenantId: string
) {
  if (studentIds.length === 0) {
    return new Map<string, AttendanceRow[]>()
  }

  const { data, error } = await supabase
    .from('attendance')
    .select('student_id, attendance_date, status, notes')
    .eq('tenant_id', tenantId)
    .in('student_id', studentIds)
    .gte('attendance_date', period.start)
    .lte('attendance_date', period.end)

  if (error) {
    console.error('[fetchAttendanceRows] Supabase error:', error.message)
  }

  const attendanceByStudent = new Map<string, AttendanceRow[]>()
  for (const row of (data || []) as AttendanceRow[]) {
    pushToMapList(attendanceByStudent, row.student_id, row)
  }

  return attendanceByStudent
}

async function fetchHomeworkRows(
  supabase: ServiceRoleClient,
  studentIds: string[],
  period: ReportPeriod,
  tenantId: string
) {
  if (studentIds.length === 0) {
    return new Map<string, HomeworkRow[]>()
  }

  // 3개 소스 fallback chain — 병렬 실행 후 우선순위 순서로 첫 번째 비어있지 않은 결과 선택.
  // 기존 순차 await 패턴은 worst-case에서 3 round trip 발생. 병렬 실행 시 1 round trip.
  // 빈 결과 소스의 쿼리 비용은 발생하지만 모두 indexed (tenant_id, student_id IN, due_date range).
  const [studentTodosResult, todosResult, studentTasksResult] = await Promise.allSettled([
    supabase
      .from('student_todos')
      .select('student_id, completed_at')
      .eq('tenant_id', tenantId)
      .in('student_id', studentIds)
      .gte('due_date', period.start)
      .lte('due_date', period.end)
      .is('deleted_at', null),
    supabase
      .from('todos')
      .select('student_id, completed_at')
      .eq('tenant_id', tenantId)
      .in('student_id', studentIds)
      .gte('due_date', period.start)
      .lte('due_date', period.end)
      .is('deleted_at', null),
    supabase
      .from('student_tasks')
      .select('student_id, completed_at')
      .eq('tenant_id', tenantId)
      .eq('kind', 'homework')
      .in('student_id', studentIds)
      .gte('due_date', period.start)
      .lte('due_date', period.end)
      .is('deleted_at', null),
  ])

  const sources = [
    { name: 'student_todos', settled: studentTodosResult },
    { name: 'todos', settled: todosResult },
    { name: 'student_tasks', settled: studentTasksResult },
  ] as const

  let data: HomeworkRow[] = []

  for (const { name, settled } of sources) {
    if (settled.status === 'rejected') {
      console.error(`[fetchHomeworkRows] ${name} rejected:`, settled.reason)
      continue
    }

    const result = settled.value
    if (result.error) {
      console.error(`[fetchHomeworkRows] ${name} error:`, result.error.message)
      continue
    }

    if ((result.data || []).length > 0) {
      data = result.data as HomeworkRow[]
      break
    }
  }

  const homeworkByStudent = new Map<string, HomeworkRow[]>()
  for (const row of data) {
    pushToMapList(homeworkByStudent, row.student_id, row)
  }

  return homeworkByStudent
}

// ============================================================================
// Score Fetchers
// ============================================================================

async function fetchRelevantExams(
  supabase: ServiceRoleClient,
  tenantId: string,
  currentPeriod: ReportPeriod,
  previousPeriod?: ReportPeriod,
  trendPeriods: TrendPeriod[] = []
) {
  const periods = [
    currentPeriod,
    ...(previousPeriod ? [previousPeriod] : []),
    ...trendPeriods,
  ]

  if (periods.length === 0) {
    return new Map<string, ExamMeta>()
  }

  const starts = periods.map((period) => period.start).sort()
  const ends = periods.map((period) => period.end).sort()
  const minStart = starts[0]
  const maxEnd = ends[ends.length - 1]

  async function loadExamBatch(selectFields: string) {
    return Promise.all([
      supabase
        .from('exams')
        .select(selectFields)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('exam_date', minStart)
        .lte('exam_date', maxEnd),
      supabase
        .from('exams')
        .select(selectFields)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .is('exam_date', null)
        .gte('created_at', `${minStart}T00:00:00`)
        .lte('created_at', `${maxEnd}T23:59:59.999`),
    ])
  }

  let [datedExamsResult, legacyExamsResult] = await loadExamBatch(
    'id, name, exam_date, created_at, category_code, subject_id, subjects(name, color)'
  )

  if (datedExamsResult.error) {
    console.error('[fetchRelevantExams] datedExams error:', datedExamsResult.error.message)
  }
  if (legacyExamsResult.error) {
    console.error('[fetchRelevantExams] legacyExams error:', legacyExamsResult.error.message)
  }

  if (datedExamsResult.error || legacyExamsResult.error) {
    ;[datedExamsResult, legacyExamsResult] = await loadExamBatch(
      'id, name, exam_date, created_at, category_code, subject_id'
    )
  }

  const datedExams = (datedExamsResult.data || []) as unknown as ExamRow[]
  const legacyExams = (legacyExamsResult.data || []) as unknown as ExamRow[]

  const examMap = new Map<string, ExamMeta>()
  for (const row of [...datedExams, ...legacyExams]) {
    const exam = normalizeExam(row)
    const effectiveDate = getEffectiveExamDate(exam)

    if (!effectiveDate) continue
    if (effectiveDate < minStart || effectiveDate > maxEnd) continue

    examMap.set(exam.id, exam)
  }

  return examMap
}

function buildPeriodMemberships(
  exams: Map<string, ExamMeta>,
  currentPeriod: ReportPeriod,
  previousPeriod?: ReportPeriod,
  trendPeriods: TrendPeriod[] = []
) {
  const memberships = new Map<string, PeriodMembership>()

  for (const [examId, exam] of exams.entries()) {
    const effectiveDate = getEffectiveExamDate(exam)
    const membership: PeriodMembership = {
      current: isDateInPeriod(effectiveDate, currentPeriod),
      previous: previousPeriod ? isDateInPeriod(effectiveDate, previousPeriod) : false,
      trendKeys: trendPeriods
        .filter((trendPeriod) => isDateInPeriod(effectiveDate, trendPeriod))
        .map((trendPeriod) => trendPeriod.key),
    }

    memberships.set(examId, membership)
  }

  return memberships
}

async function fetchScoreContext(
  supabase: ServiceRoleClient,
  tenantId: string,
  studentIds: string[],
  currentPeriod: ReportPeriod,
  previousPeriod?: ReportPeriod,
  trendPeriods: TrendPeriod[] = []
): Promise<ScoreContext> {
  const exams = await fetchRelevantExams(
    supabase,
    tenantId,
    currentPeriod,
    previousPeriod,
    trendPeriods
  )

  if (exams.size === 0 || studentIds.length === 0) {
    return createEmptyScoreContext()
  }

  const memberships = buildPeriodMemberships(exams, currentPeriod, previousPeriod, trendPeriods)
  const studentExamIds = Array.from(exams.keys())
  const classExamIds = Array.from(
    new Set(
      studentExamIds.filter((examId) => {
        const membership = memberships.get(examId)
        return Boolean(membership?.current || (membership?.trendKeys.length || 0) > 0)
      })
    )
  )

  const scoreSelect =
    'student_id, exam_id, percentage, feedback, is_retest, score, total_points'

  const [studentScoreResult, classScoreResult] = await Promise.all([
    supabase
      .from('exam_scores')
      .select(scoreSelect)
      .eq('tenant_id', tenantId)
      .in('student_id', studentIds)
      .in('exam_id', studentExamIds)
      .is('deleted_at', null),
    classExamIds.length > 0
      ? supabase
          .from('exam_scores')
          .select(scoreSelect)
          .eq('tenant_id', tenantId)
          .in('exam_id', classExamIds)
          .is('deleted_at', null)
      : Promise.resolve({ data: [] as ScoreRow[], error: null }),
  ])

  if (studentScoreResult.error) {
    console.error('[fetchScoreContext] studentScores error:', studentScoreResult.error.message)
  }
  if (classScoreResult.error) {
    console.error('[fetchScoreContext] classScores error:', classScoreResult.error.message)
  }

  const studentScoreRows = studentScoreResult.data

  const context = createEmptyScoreContext()

  for (const row of (studentScoreRows || []) as ScoreRow[]) {
    const exam = exams.get(row.exam_id)
    const membership = memberships.get(row.exam_id)

    if (!exam || !membership) continue

    const record: ScoreRecord = {
      ...row,
      exam,
    }

    if (membership.current) {
      pushToMapList(context.currentStudentScores, row.student_id, record)
    }

    if (membership.previous) {
      pushToMapList(context.previousStudentScores, row.student_id, record)
    }

    for (const trendKey of membership.trendKeys) {
      pushToNestedMapList(context.trendStudentScores, trendKey, row.student_id, record)
    }
  }

  for (const row of ((classScoreResult.data || []) as ScoreRow[])) {
    const exam = exams.get(row.exam_id)
    const membership = memberships.get(row.exam_id)

    if (!exam || !membership) continue

    const record: ScoreRecord = {
      ...row,
      exam,
    }

    if (membership.current) {
      context.currentClassScores.push(record)
    }

    for (const trendKey of membership.trendKeys) {
      pushToMapList(context.trendClassScores, trendKey, record)
    }
  }

  return context
}

// ============================================================================
// Public Batch Metric Collector
// ============================================================================

export async function collectReportMetricsByStudent(
  supabase: ServiceRoleClient,
  params: {
    studentIds: string[]
    tenantId: string
    currentPeriod: ReportPeriod
    previousPeriod?: ReportPeriod
    trendPeriods?: TrendPeriod[]
  }
) {
  const uniqueStudentIds = Array.from(new Set(params.studentIds.filter(Boolean)))
  const trendPeriods = params.trendPeriods || []

  const [attendanceByStudent, homeworkByStudent, scoreContext] = await Promise.all([
    fetchAttendanceRows(supabase, uniqueStudentIds, params.currentPeriod, params.tenantId),
    fetchHomeworkRows(supabase, uniqueStudentIds, params.currentPeriod, params.tenantId),
    fetchScoreContext(
      supabase,
      params.tenantId,
      uniqueStudentIds,
      params.currentPeriod,
      params.previousPeriod,
      trendPeriods
    ),
  ])

  const metricsByStudent = new Map<string, StudentReportMetrics>()

  for (const studentId of uniqueStudentIds) {
    const attendanceRecords = attendanceByStudent.get(studentId) || []
    const homeworkRecords = homeworkByStudent.get(studentId) || []
    const currentScores = scoreContext.currentStudentScores.get(studentId) || []
    const previousScores = scoreContext.previousStudentScores.get(studentId) || []
    const trendScoresByPeriod = new Map<string, ScoreRecord[]>()

    for (const trendPeriod of trendPeriods) {
      trendScoresByPeriod.set(
        trendPeriod.key,
        scoreContext.trendStudentScores.get(trendPeriod.key)?.get(studentId) || []
      )
    }

    metricsByStudent.set(studentId, {
      attendance: buildAttendanceMetrics(attendanceRecords),
      homework: buildHomeworkMetrics(homeworkRecords),
      scores: buildScoresSummary(
        currentScores,
        previousScores,
        scoreContext.currentClassScores
      ),
      gradesChartData: buildGradesChartData(currentScores),
      attendanceChartData: buildAttendanceChart(attendanceRecords),
      currentScore: buildCurrentScoreSummary(
        currentScores,
        scoreContext.currentClassScores
      ),
      scoreTrend: buildScoreTrendData(
        trendPeriods,
        trendScoresByPeriod,
        scoreContext.trendClassScores
      ),
    })
  }

  return metricsByStudent
}

export function getMonthlyTrendPeriods(currentYear: number, currentMonth: number): TrendPeriod[] {
  return [2, 1, 0].map((offset) => {
    const targetDate = new Date(currentYear, currentMonth - 1 - offset, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1
    const lastDay = new Date(year, month, 0).getDate()
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    return {
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: `${month}월`,
      start,
      end,
    }
  })
}

// ============================================================================
// Public Single-Student Wrappers
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
  const attendanceByStudent = await fetchAttendanceRows(
    supabase,
    [studentId],
    { start: periodStart, end: periodEnd },
    tenantId
  )

  return buildAttendanceMetrics(attendanceByStudent.get(studentId) || [])
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
  const homeworkByStudent = await fetchHomeworkRows(
    supabase,
    [studentId],
    { start: periodStart, end: periodEnd },
    tenantId
  )

  return buildHomeworkMetrics(homeworkByStudent.get(studentId) || [])
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
  const metrics = await collectReportMetricsByStudent(supabase, {
    studentIds: [studentId],
    tenantId,
    currentPeriod: {
      start: periodStart,
      end: periodEnd,
    },
    previousPeriod: {
      start: prevPeriodStart,
      end: prevPeriodEnd,
    },
  })

  return metrics.get(studentId)?.scores || []
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

  if (attendance.rate >= 95) {
    comments.push('출석률이 매우 우수합니다.')
  } else if (attendance.rate >= 85) {
    comments.push('출석률이 양호합니다.')
  } else {
    comments.push('출석에 더욱 신경 써주시기 바랍니다.')
  }

  const improvingCategories = scores.filter((score) => score.change && score.change > 5)
  const decliningCategories = scores.filter((score) => score.change && score.change < -5)

  if (improvingCategories.length > 0) {
    comments.push(
      `${improvingCategories.map((category) => category.category).join(', ')} 영역에서 눈에 띄는 향상을 보이고 있습니다.`
    )
  }

  if (decliningCategories.length > 0) {
    comments.push(
      `${decliningCategories.map((category) => category.category).join(', ')} 영역에 좀 더 집중이 필요합니다.`
    )
  }

  const scoresWithData = scores.filter((score) => score.current !== null)
  if (scoresWithData.length > 0) {
    const avgScore =
      scoresWithData.reduce((sum, score) => sum + (score.current || 0), 0) /
      scoresWithData.length

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
  const metrics = await collectReportMetricsByStudent(supabase, {
    studentIds: [studentId],
    tenantId,
    currentPeriod: {
      start: periodStart,
      end: periodEnd,
    },
  })

  return metrics.get(studentId)?.gradesChartData || []
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
  const attendanceByStudent = await fetchAttendanceRows(
    supabase,
    [studentId],
    { start: periodStart, end: periodEnd },
    tenantId
  )

  return buildAttendanceChart(attendanceByStudent.get(studentId) || [])
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
  const metrics = await collectReportMetricsByStudent(supabase, {
    studentIds: [studentId],
    tenantId,
    currentPeriod: {
      start: periodStart,
      end: periodEnd,
    },
  })

  return (
    metrics.get(studentId)?.currentScore || {
      myScore: 0,
      classAverage: 0,
      highestScore: 0,
    }
  )
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
  const trendPeriods = getMonthlyTrendPeriods(currentYear, currentMonth)
  const currentPeriod = trendPeriods[trendPeriods.length - 1]

  const metrics = await collectReportMetricsByStudent(supabase, {
    studentIds: [studentId],
    tenantId,
    currentPeriod: {
      start: currentPeriod.start,
      end: currentPeriod.end,
    },
    trendPeriods,
  })

  return metrics.get(studentId)?.scoreTrend || []
}
