/**
 * Grade Entry Server Actions
 *
 * 성적 입력 전용 Server Actions
 */

'use server'

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

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get exams ready for grade entry, grouped by status
 *
 * 최적화: N+1 쿼리 문제 해결
 * - Before: 시험 30개 = 31번 쿼리 (1 + 30)
 * - After: 시험 30개 = 2번 쿼리 (시험 1회 + 점수 1회)
 */
export async function getExamsForGradeEntry() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 1. Fetch all exams with related data (1 query)
    const { data: exams, error: examsError } = await supabase
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
      .order('exam_date', { ascending: false })

    if (examsError) {
      throw examsError
    }

    if (!exams || exams.length === 0) {
      return { success: true, data: [], error: null }
    }

    // 2. Get all exam IDs
    const examIds = exams.map((exam: any) => exam.id)

    // 3. Fetch ALL scores for all exams in a single query (1 query)
    const { data: allScores, error: scoresError } = await supabase
      .from('exam_scores')
      .select('exam_id, percentage, status')
      .in('exam_id', examIds)
      .is('deleted_at', null)

    if (scoresError) {
      console.error('[getExamsForGradeEntry] Error fetching scores:', scoresError)
      // Continue without scores rather than failing entirely
    }

    // 4. Group scores by exam_id for O(1) lookup
    const scoresByExamId = new Map<string, Array<{ percentage: number | null; status: string | null }>>()
    for (const score of (allScores || [])) {
      const examScores = scoresByExamId.get(score.exam_id) || []
      examScores.push({ percentage: score.percentage, status: score.status })
      scoresByExamId.set(score.exam_id, examScores)
    }

    // 5. Map exams with their statistics (no additional queries)
    const examsWithStats: ExamForGradeEntry[] = exams.map((exam: any) => {
      const examScores = scoresByExamId.get(exam.id) || []

      const totalStudents = examScores.length
      const gradedStudents = examScores.filter(
        (s) => s.percentage !== null && s.percentage > 0
      ).length
      const pendingStudents = totalStudents - gradedStudents

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
      success: true,
      data: examsWithStats,
      error: null,
    }
  } catch (error) {
    console.error('[getExamsForGradeEntry] Error:', error)
    return {
      success: false,
      data: [],
      error: getErrorMessage(error),
    }
  }
}
