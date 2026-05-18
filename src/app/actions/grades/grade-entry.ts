/**
 * Grade Entry Server Actions
 *
 * 성적 입력 전용 Server Actions
 */

'use server'

import { unstable_cache } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Types
// ============================================================================

export interface ExamForGradeEntry {
  id: string
  name: string
  exam_date: string | null
  total_questions: number | null
  category_code: string | null
  exam_type: string | null
  passing_score: number | null
  status: string | null
  // Calculated fields
  total_students: number
  graded_students: number
  pending_students: number
  average_score: number | null
  // Relations
  subject: {
    id: string
    name: string
    code: string | null
    color: string | null
  } | null
  classes: {
    id: string
    name: string
  } | null
}

interface ExamRow {
  id: string
  name: string
  exam_date: string | null
  total_questions: number | null
  category_code: string | null
  exam_type: string | null
  passing_score: number | null
  status: string | null
  class_id: string | null
  subjects?: {
    id: string
    name: string
    code: string | null
    color: string | null
  } | null
  classes?: {
    id: string
    name: string
  } | null
}

type GradeEntryPeriod = 'this_month' | 'last_15_days' | 'last_3_months' | 'all'

function getDateRangeByPeriod(period: GradeEntryPeriod) {
  const today = new Date()
  const to = today.toISOString().slice(0, 10)

  if (period === 'all') {
    return { from: null as string | null, to: null as string | null }
  }

  if (period === 'this_month') {
    const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
    return { from, to }
  }

  const fromDate = new Date(today)
  if (period === 'last_15_days') {
    fromDate.setDate(fromDate.getDate() - 15)
  } else {
    fromDate.setMonth(fromDate.getMonth() - 3)
  }

  return { from: fromDate.toISOString().slice(0, 10), to }
}

async function autoArchiveOldCompletedExams(params: {
  tenantId: string
  supabase: ReturnType<typeof createServiceRoleClient>
}) {
  const { tenantId, supabase } = params
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - 15)
  const thresholdDate = threshold.toISOString().slice(0, 10)

  const { error } = await supabase
    .from('exams')
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .is('deleted_at', null)
    .is('archived_at', null)
    .not('exam_date', 'is', null)
    .lte('exam_date', thresholdDate)

  if (error) {
    console.error('[grade-entry:autoArchiveOldCompletedExams] Error:', error)
  }
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get exams ready for grade entry, grouped by status
 *
 * 최적화: N+1 쿼리 문제 해결
 * - Before: 시험 30개 = 31번 쿼리 (1 + 30)
 * - After: 시험 30개 = 2번 쿼리 (시험 1회 + 점수 1회)
 *
 * @param params.completed - true: 완료 시험, false: 미완료 시험(기본)
 * @param params.month - 'YYYY-MM' 형식, completed=true일 때만 사용
 */
export async function getExamsForGradeEntry(params?: {
  completed?: boolean
  month?: string
  period?: GradeEntryPeriod
}) {
  const completed = params?.completed ?? false
  const period = params?.period ?? 'this_month'
  const month = params?.month ?? ''

  try {
    const { tenantId } = await verifyStaff()

    // 60초 TTL — 시험/점수 mutation 시 revalidateTag(`grade-entry:${tenantId}`) 로 즉시 무효화.
    // 캐시 miss 시에만 autoArchive 가 실행되어 archive UPDATE 빈도도 자연스럽게 감소.
    return unstable_cache(
      () => computeExamsForGradeEntry(tenantId, { completed, period, month: month || undefined }),
      ['grade-entry-exams', tenantId, completed ? 'completed' : 'pending', period, month || 'no-month'],
      { revalidate: 60, tags: [`grade-entry:${tenantId}`] }
    )()
  } catch (error) {
    console.error('[getExamsForGradeEntry] Error:', error)
    return {
      success: false,
      data: [],
      error: getErrorMessage(error),
    }
  }
}

async function computeExamsForGradeEntry(
  tenantId: string,
  params: { completed: boolean; period: GradeEntryPeriod; month?: string }
) {
  const { completed, period, month } = params

  try {
    const supabase = createServiceRoleClient()

    // archive 와 메인 쿼리 병렬 — archive 결과가 이번 read 에 반영 안 될 수 있지만
    // 다음 cache miss 에서 정정됨. archive 빈도가 낮아 사용자 체감 zero.
    const [, examsResult] = await Promise.all([
      autoArchiveOldCompletedExams({ tenantId, supabase }),
      fetchExamsQuery(supabase, tenantId, completed, period, month),
    ])

    const { data: exams, error: examsError } = examsResult

    if (examsError) {
      throw examsError
    }

    if (!exams || exams.length === 0) {
      return { success: true as const, data: [], error: null }
    }

    // 2. Get all exam IDs and class IDs
    const examRows = exams as unknown as ExamRow[]
    const examIds = examRows.map((exam) => exam.id)
    const classIds = [...new Set(
      examRows.map((exam) => exam.class_id).filter(Boolean)
    )] as string[]

    // 3. Fetch ALL scores for all exams + enrollment counts in parallel
    const [scoresResult, enrollmentsResult] = await Promise.all([
      supabase
        .from('exam_scores')
        .select('exam_id, percentage, status')
        .in('exam_id', examIds)
        .is('deleted_at', null),
      classIds.length > 0
        ? supabase
            .from('class_enrollments')
            .select('class_id, student_id')
            .in('class_id', classIds)
            .eq('status', 'active')
            .eq('tenant_id', tenantId)
        : Promise.resolve({ data: [], error: null }),
    ])

    const { data: allScores, error: scoresError } = scoresResult
    if (scoresError) {
      console.error('[getExamsForGradeEntry] Error fetching scores:', scoresError)
    }

    const { data: enrollments, error: enrollError } = enrollmentsResult
    if (enrollError) {
      console.error('[getExamsForGradeEntry] Error fetching enrollments:', enrollError)
    }

    // 응시인원은 class_enrollments 기준으로 산정
    const enrollmentCountByClassId = new Map<string, number>()
    for (const e of (enrollments || [])) {
      enrollmentCountByClassId.set(
        e.class_id,
        (enrollmentCountByClassId.get(e.class_id) || 0) + 1
      )
    }

    // 5. Group scores by exam_id for O(1) lookup
    const scoresByExamId = new Map<string, Array<{ percentage: number | null; status: string | null }>>()
    for (const score of (allScores || [])) {
      const examScores = scoresByExamId.get(score.exam_id) || []
      examScores.push({ percentage: score.percentage, status: score.status })
      scoresByExamId.set(score.exam_id, examScores)
    }

    // 6. Map exams with their statistics (no additional queries)
    const examsWithStats: ExamForGradeEntry[] = examRows.map((exam) => {
      const examScores = scoresByExamId.get(exam.id) || []

      // 응시인원: class_enrollments 기준 (없으면 exam_scores 수로 폴백)
      const totalStudents = exam.class_id
        ? (enrollmentCountByClassId.get(exam.class_id) || 0)
        : examScores.length
      const gradedStudents = examScores.filter(
        (s) => s.percentage !== null && s.percentage > 0
      ).length
      const pendingStudents = Math.max(totalStudents - gradedStudents, 0)

      // Calculate average score
      const gradedScores = examScores.filter(
        (s) => s.percentage !== null && s.percentage > 0
      )
      const averageScore =
        gradedScores.length > 0
          ? Math.round(
              gradedScores.reduce((sum, s) => sum + (s.percentage || 0), 0) /
                gradedScores.length
            )
          : null

      return {
        id: exam.id,
        name: exam.name,
        exam_date: exam.exam_date,
        total_questions: exam.total_questions,
        category_code: exam.category_code,
        exam_type: exam.exam_type,
        passing_score: exam.passing_score,
        status: exam.status,
        total_students: totalStudents,
        graded_students: gradedStudents,
        pending_students: pendingStudents,
        average_score: averageScore,
        subject: exam.subjects ? {
          id: exam.subjects.id,
          name: exam.subjects.name,
          code: exam.subjects.code,
          color: exam.subjects.color,
        } : null,
        classes: exam.classes ? {
          id: exam.classes.id,
          name: exam.classes.name,
        } : null,
      }
    })

    return {
      success: true as const,
      data: examsWithStats,
      error: null,
    }
  } catch (error) {
    console.error('[computeExamsForGradeEntry] Error:', error)
    return {
      success: false as const,
      data: [],
      error: getErrorMessage(error),
    }
  }
}

function fetchExamsQuery(
  supabase: ReturnType<typeof createServiceRoleClient>,
  tenantId: string,
  completed: boolean,
  period: GradeEntryPeriod,
  month?: string
) {
  let query = supabase
    .from('exams')
    .select(`
      id,
      name,
      exam_date,
      total_questions,
      category_code,
      exam_type,
      passing_score,
      status,
      subject_id,
      class_id,
      subjects (
        id,
        name,
        code,
        color
      ),
      classes (
        id,
        name
      )
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .is('archived_at', null)
    .order('exam_date', { ascending: false })

  // Apply status filter
  if (completed) {
    query = query.eq('status', 'completed')
    // Apply month filter for completed exams
    if (month) {
      const [year, m] = month.split('-').map(Number)
      const startDate = `${year}-${String(m).padStart(2, '0')}-01`
      const endDate = new Date(year, m, 0).toISOString().split('T')[0]
      query = query.gte('exam_date', startDate).lte('exam_date', endDate)
    }
  } else {
    query = query.or('status.is.null,status.neq.completed')
  }

  const periodRange = getDateRangeByPeriod(period)
  if (periodRange.from) {
    query = query.gte('exam_date', periodRange.from)
  }
  if (periodRange.to) {
    query = query.lte('exam_date', periodRange.to)
  }

  return query
}
