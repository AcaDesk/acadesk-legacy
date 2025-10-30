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
 */
export async function getExamsForGradeEntry() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Fetch exams with related data
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

    // For each exam, get student statistics
    const examsWithStats = await Promise.all(
      (exams || []).map(async (exam: any) => {
        // Get exam scores statistics
        const { data: scoresData, error: scoresError } = await supabase
          .from('exam_scores')
          .select('id, percentage, status')
          .eq('exam_id', exam.id)

        if (scoresError) {
          console.error(`Error fetching scores for exam ${exam.id}:`, scoresError)
          return null
        }

        const totalStudents = scoresData?.length || 0
        const gradedStudents = scoresData?.filter(
          (s) => s.percentage !== null && s.percentage > 0
        ).length || 0
        const pendingStudents = totalStudents - gradedStudents

        // Calculate average score
        const gradedScores = scoresData?.filter(
          (s) => s.percentage !== null && s.percentage > 0
        )
        const averageScore =
          gradedScores && gradedScores.length > 0
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
        } as ExamForGradeEntry
      })
    )

    // Filter out nulls and return
    const validExams = examsWithStats.filter((exam) => exam !== null)

    return {
      success: true,
      data: validExams,
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
