/**
 * Retest Management Server Actions
 *
 * 재시험 관리를 위한 Server Actions
 */

'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Types
// ============================================================================

export interface RetestStudent {
  exam_score_id: string
  exam_id: string
  student_id: string
  exam_name: string
  exam_date: string
  passing_score: number
  student_score: number
  status: string
  retest_count: number
  student_code: string
  student_name: string
  grade: string | null
  class_name: string | null
  tenant_id: string
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 재시험 대상 학생 목록 조회
 */
export async function getRetestStudents() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('students_requiring_retest')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('exam_date', { ascending: false })

    if (error) {
      throw error
    }

    return {
      success: true,
      data: (data || []) as RetestStudent[],
      error: null,
    }
  } catch (error) {
    console.error('[getRetestStudents] Error:', error)
    return {
      success: false,
      data: [],
      error: getErrorMessage(error),
    }
  }
}

/**
 * 재시험 면제 처리
 */
export async function waiveRetest(examScoreId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 1. Verify exam_score belongs to tenant
    const { data: examScore, error: fetchError } = await supabase
      .from('exam_scores')
      .select('tenant_id, status')
      .eq('id', examScoreId)
      .single()

    if (fetchError || !examScore) {
      throw new Error('성적을 찾을 수 없습니다')
    }

    if (examScore.tenant_id !== tenantId) {
      throw new Error('권한이 없습니다')
    }

    // 2. Update status to retest_waived
    const { error: updateError } = await supabase
      .from('exam_scores')
      .update({
        status: 'retest_waived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', examScoreId)

    if (updateError) {
      throw updateError
    }

    revalidatePath('/grades/retests')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[waiveRetest] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 재시험 연기 (다른 날로 이동)
 */
export async function postponeRetest(examScoreId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 1. Verify exam_score belongs to tenant
    const { data: examScore, error: fetchError } = await supabase
      .from('exam_scores')
      .select('tenant_id, status')
      .eq('id', examScoreId)
      .single()

    if (fetchError || !examScore) {
      throw new Error('성적을 찾을 수 없습니다')
    }

    if (examScore.tenant_id !== tenantId) {
      throw new Error('권한이 없습니다')
    }

    // 2. Update status to pending
    const { error: updateError } = await supabase
      .from('exam_scores')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', examScoreId)

    if (updateError) {
      throw updateError
    }

    revalidatePath('/grades/retests')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[postponeRetest] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 재시험 생성 및 학생 배정
 */
export async function createRetestExam(
  originalExamId: string,
  studentIds: string[]
) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 1. Get original exam
    const { data: originalExam, error: fetchError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', originalExamId)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !originalExam) {
      throw new Error('원본 시험을 찾을 수 없습니다')
    }

    // 2. Create retest exam
    const { data: retestExam, error: createError } = await supabase
      .from('exams')
      .insert({
        tenant_id: tenantId,
        name: `${originalExam.name} - 재시험`,
        subject_id: originalExam.subject_id,
        category_code: originalExam.category_code,
        exam_type: originalExam.exam_type,
        class_id: originalExam.class_id,
        total_questions: originalExam.total_questions,
        passing_score: originalExam.passing_score,
        description: `${originalExam.description || ''}\n[재시험]`,
        exam_date: null, // Set later
      })
      .select('id')
      .single()

    if (createError || !retestExam) {
      throw new Error('재시험 생성 실패: ' + createError?.message)
    }

    // 3. Assign students to retest
    const scoreInserts = studentIds.map((studentId) => ({
      tenant_id: tenantId,
      exam_id: retestExam.id,
      student_id: studentId,
      score: 0,
      total_points: originalExam.total_questions || 100,
      percentage: 0,
      is_retest: true,
      status: 'pending',
    }))

    const { error: assignError } = await supabase
      .from('exam_scores')
      .insert(scoreInserts)

    if (assignError) {
      // Rollback: delete created exam
      await supabase.from('exams').delete().eq('id', retestExam.id)
      throw new Error('학생 배정 실패: ' + assignError.message)
    }

    // 4. Update original scores to mark as retest assigned
    await supabase
      .from('exam_scores')
      .update({
        retest_count: supabase.raw('retest_count + 1'),
      })
      .eq('exam_id', originalExamId)
      .in('student_id', studentIds)

    revalidatePath('/grades/retests')
    revalidatePath('/grades/exams')

    return {
      success: true,
      data: { retestExamId: retestExam.id },
      error: null,
    }
  } catch (error) {
    console.error('[createRetestExam] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
