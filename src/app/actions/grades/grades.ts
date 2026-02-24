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

const getExamScoresSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(15),
  searchTerm: z.string().optional(),
  studentId: z.string().uuid().optional(),
  status: z.enum(['pending', 'completed', 'retest_required', 'retest_waived']).optional(),
})

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
 * 시험 성적 조회 (검색, 필터, 페이지네이션 포함)
 * @param params - 조회 파라미터
 * @returns 성적 목록 및 총 개수
 */
export async function getExamScores(
  params: z.infer<typeof getExamScoresSchema>
) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. 입력값 검증
    const validatedParams = getExamScoresSchema.parse(params)
    const { page, limit, searchTerm, studentId, status } = validatedParams

    // 3. Service Role 클라이언트로 DB 작업
    const supabase = createServiceRoleClient()

    // 페이지네이션 계산
    const from = (page - 1) * limit
    const to = from + limit - 1

    // 기본 쿼리 구성
    let query = supabase
      .from('exam_scores')
      .select(`
        id,
        score,
        total_points,
        percentage,
        feedback,
        status,
        is_retest,
        retest_count,
        created_at,
        exams!exam_id (
          name,
          exam_date,
          category_code
        ),
        students!student_id (
          id,
          student_code,
          users!user_id (
            name
          )
        )
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    // 학생 필터 적용
    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    // 상태 필터 적용
    if (status) {
      query = query.eq('status', status)
    }

    // 검색어 필터 적용 (중첩 관계 검색)
    if (searchTerm && searchTerm.trim()) {
      // 먼저 매칭되는 학생 ID를 찾기
      const { data: matchingStudents } = await supabase
        .from('students')
        .select('id, student_code, users!user_id(name)')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .or(`student_code.ilike.%${searchTerm}%,users.name.ilike.%${searchTerm}%`)

      // 매칭되는 시험 ID를 찾기
      const { data: matchingExams } = await supabase
        .from('exams')
        .select('id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .ilike('name', `%${searchTerm}%`)

      const studentIds = matchingStudents?.map(s => s.id) || []
      const examIds = matchingExams?.map(e => e.id) || []

      // 학생 또는 시험이 매칭되는 성적만 조회
      if (studentIds.length > 0 || examIds.length > 0) {
        const filters: string[] = []
        if (studentIds.length > 0) {
          filters.push(`student_id.in.(${studentIds.join(',')})`)
        }
        if (examIds.length > 0) {
          filters.push(`exam_id.in.(${examIds.join(',')})`)
        }
        query = query.or(filters.join(','))
      } else {
        // 매칭되는 결과가 없으면 빈 배열 반환
        return {
          success: true,
          data: {
            scores: [],
            totalCount: 0,
          },
        }
      }
    }

    // 페이지네이션 및 정렬 적용
    query = query
      .range(from, to)
      .order('created_at', { ascending: false })

    const { data: scores, error, count } = await query

    if (error) {
      throw new Error(`성적 조회 실패: ${error.message}`)
    }

    // 퍼센트 계산 (저장되지 않은 경우)
    const processedScores = (scores || []).map((score) => ({
      ...score,
      percentage: score.percentage ||
        (score.total_points && score.total_points > 0 && score.score !== null
          ? Math.round((score.score / score.total_points) * 10000) / 100
          : 0)
    }))

    return {
      success: true,
      data: {
        scores: processedScores,
        totalCount: count || 0,
      },
    }
  } catch (error) {
    console.error('getExamScores error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

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
    const supabase = createServiceRoleClient()

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
    const supabase = createServiceRoleClient()

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
    const supabase = createServiceRoleClient()

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
