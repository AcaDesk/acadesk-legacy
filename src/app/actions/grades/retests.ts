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
import { getTodayKST } from '@/lib/utils'

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
// Helpers
// ============================================================================

async function updateExamScoreStatus(examScoreId: string, newStatus: string) {
  const { tenantId } = await verifyStaff()
  const supabase = createServiceRoleClient()

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

  const { error: updateError } = await supabase
    .from('exam_scores')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', examScoreId)

  if (updateError) throw updateError

  revalidatePath('/grades/retests')
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

    // Query exam_scores directly with joins instead of using a view
    const { data, error } = await supabase
      .from('exam_scores')
      .select(`
        id,
        exam_id,
        student_id,
        score,
        percentage,
        status,
        retest_count,
        exams!inner (
          id,
          name,
          exam_date,
          passing_score
        ),
        students!inner (
          id,
          student_code,
          grade,
          users!inner (name)
        )
      `)
      .eq('status', 'retest_required')
      .eq('tenant_id', tenantId)
      .eq('exams.tenant_id', tenantId)
      .eq('students.tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Get student IDs to fetch class information
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const studentIds = (data || []).map((item: any) => item.students?.[0]?.id ?? item.student_id).filter(Boolean)

    // Fetch class information separately via student_classes junction table
    const { data: studentClassData } = await supabase
      .from('student_classes')
      .select(`
        student_id,
        classes!inner (name)
      `)
      .in('student_id', studentIds)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    // Create a map of student_id to class_name
    const classMap = new Map<string, string>()
    if (studentClassData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      studentClassData.forEach((sc: any) => {
        if (!classMap.has(sc.student_id)) {
          classMap.set(sc.student_id, sc.classes?.name || '')
        }
      })
    }

    // Transform data to match RetestStudent interface
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedData: RetestStudent[] = (data || []).map((item: any) => ({
      exam_score_id: item.id,
      exam_id: item.exams?.id || '',
      student_id: item.students?.id || '',
      exam_name: item.exams?.name || '',
      exam_date: item.exams?.exam_date || '',
      passing_score: item.exams?.passing_score || 0,
      student_score: item.percentage || 0,
      status: item.status,
      retest_count: item.retest_count || 0,
      student_code: item.students?.student_code || '',
      student_name: item.students?.users?.name || '',
      grade: item.students?.grade || null,
      class_name: classMap.get(item.students?.id) || null,
      tenant_id: tenantId,
    }))

    return {
      success: true,
      data: transformedData,
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
    await updateExamScoreStatus(examScoreId, 'retest_waived')
    return { success: true, error: null }
  } catch (error) {
    console.error('[waiveRetest] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * 재시험 연기 (다른 날로 이동)
 */
export async function postponeRetest(examScoreId: string) {
  try {
    await updateExamScoreStatus(examScoreId, 'pending')
    return { success: true, error: null }
  } catch (error) {
    console.error('[postponeRetest] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * 재시험 생성 및 학생 배정
 */
export async function createRetestExam(
  originalExamId: string,
  studentIds: string[],
  retestDate?: string
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
    // Format original exam date for display
    const originalExamDate = originalExam.exam_date
      ? new Date(originalExam.exam_date).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '날짜 미정'

    // Use provided retest date or default to today
    const examDate = retestDate || getTodayKST()

    const { data: retestExam, error: createError } = await supabase
      .from('exams')
      .insert({
        tenant_id: tenantId,
        name: `[재시험] ${originalExam.name}`,
        subject_id: originalExam.subject_id,
        category_code: originalExam.category_code,
        exam_type: originalExam.exam_type,
        class_id: originalExam.class_id,
        total_questions: originalExam.total_questions,
        passing_score: originalExam.passing_score,
        description: `원본 시험: ${originalExam.name} (시험일: ${originalExamDate})\n${originalExam.description || ''}\n\n※ 이 시험은 원본 시험의 재시험입니다.`,
        exam_date: examDate,
      })
      .select('id')
      .single()

    if (createError || !retestExam) {
      console.error('[createRetestExam] Creation error:', createError?.message)
      throw new Error('재시험 생성에 실패했습니다')
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
      console.error('[createRetestExam] Student assignment error:', assignError.message)
      throw new Error('학생 배정에 실패했습니다')
    }

    // 4. Update original scores to mark as retest assigned
    // ✅ N+1 쿼리 제거: 순차 UPDATE → 병렬 UPDATE (Promise.all)
    const { data: currentScores, error: fetchScoresError } = await supabase
      .from('exam_scores')
      .select('id, retest_count')
      .eq('exam_id', originalExamId)
      .in('student_id', studentIds)

    if (!fetchScoresError && currentScores && currentScores.length > 0) {
      // 병렬로 모든 점수 업데이트 (N번 순차 → N번 병렬)
      await Promise.all(
        currentScores.map(score =>
          supabase
            .from('exam_scores')
            .update({
              retest_count: (score.retest_count || 0) + 1,
            })
            .eq('id', score.id)
        )
      )
    }

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
