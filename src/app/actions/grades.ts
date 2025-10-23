/**
 * Grades Management Server Actions
 *
 * 모든 성적 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 * 클라이언트에서 직접 Supabase CUD를 사용하지 않습니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Validation Schemas
// ============================================================================

const createExamScoreSchema = z.object({
  exam_id: z.string().uuid('유효한 시험 ID가 아닙니다'),
  student_id: z.string().uuid('유효한 학생 ID가 아닙니다'),
  correct_answers: z.number().int().min(0, '맞은 문항 수는 0 이상이어야 합니다'),
  total_questions: z.number().int().min(1, '전체 문항 수는 1 이상이어야 합니다'),
  feedback: z.string().nullable().optional(),
  is_retest: z.boolean().default(false),
  retest_count: z.number().int().min(0).default(0),
})

const bulkUpsertExamScoresSchema = z.object({
  exam_id: z.string().uuid('유효한 시험 ID가 아닙니다'),
  scores: z.array(
    z.object({
      student_id: z.string().uuid('유효한 학생 ID가 아닙니다'),
      score: z.number().int().min(0, '점수는 0 이상이어야 합니다'),
      total_points: z.number().int().min(1, '전체 점수는 1 이상이어야 합니다'),
      percentage: z.number().min(0).max(100),
      feedback: z.string().nullable().optional(),
    })
  ),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 시험 성적 생성
 * @param data - 성적 데이터
 * @returns 생성된 성적 또는 에러
 */
export async function createExamScore(
  data: z.infer<typeof createExamScoreSchema>
) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. 입력값 검증
    const validatedData = createExamScoreSchema.parse(data)

    // 3. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    const { data: examScore, error } = await supabase
      .from('exam_scores')
      .insert({
        tenant_id: tenantId,
        exam_id: validatedData.exam_id,
        student_id: validatedData.student_id,
        correct_answers: validatedData.correct_answers,
        total_questions: validatedData.total_questions,
        feedback: validatedData.feedback,
        is_retest: validatedData.is_retest,
        retest_count: validatedData.retest_count,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`성적 입력 실패: ${error.message}`)
    }

    // 4. 캐시 무효화
    revalidatePath('/grades')
    revalidatePath(`/grades/exams/${validatedData.exam_id}`)

    return { success: true, data: examScore }
  } catch (error) {
    console.error('createExamScore error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 시험 성적 일괄 입력/수정
 * @param data - 성적 데이터 배열
 * @returns 생성/수정된 성적 기록 또는 에러
 */
export async function bulkUpsertExamScores(
  data: z.infer<typeof bulkUpsertExamScoresSchema>
) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. 입력값 검증
    const validatedData = bulkUpsertExamScoresSchema.parse(data)

    if (validatedData.scores.length === 0) {
      throw new Error('최소 1명 이상의 성적을 입력해주세요')
    }

    // 3. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    const scoresToSave = validatedData.scores.map((score) => ({
      tenant_id: tenantId,
      exam_id: validatedData.exam_id,
      student_id: score.student_id,
      score: score.score,
      total_points: score.total_points,
      percentage: score.percentage,
      feedback: score.feedback,
    }))

    const { data: examScores, error } = await supabase
      .from('exam_scores')
      .upsert(scoresToSave, {
        onConflict: 'exam_id,student_id',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      throw new Error(`성적 일괄 입력 실패: ${error.message}`)
    }

    // 4. 캐시 무효화
    revalidatePath('/grades')
    revalidatePath(`/grades/exams/${validatedData.exam_id}`)

    return { success: true, data: examScores }
  } catch (error) {
    console.error('bulkUpsertExamScores error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 시험 성적 삭제 (Soft Delete)
 * @param examScoreId - 성적 ID
 * @returns 성공 여부
 */
export async function deleteExamScore(examScoreId: string) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    const { error } = await supabase
      .from('exam_scores')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', examScoreId)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`성적 삭제 실패: ${error.message}`)
    }

    // 3. 캐시 무효화
    revalidatePath('/grades')

    return { success: true }
  } catch (error) {
    console.error('deleteExamScore error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
