'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { detachStudentActiveRelations } from './relations'

/**
 * Bulk update students (e.g., grade change)
 * @param updates - Array of student updates
 * @returns Success or error
 */
export async function bulkUpdateStudents(
  updates: Array<{ id: string; grade?: string; school?: string }>
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. 동일 변경값끼리 그룹핑 → 그룹당 UPDATE 1회 (학생 N명 → 그룹 G개 쿼리)
    // 진급/학교 변경은 대부분 같은 값이라 실질 1~수 개 쿼리로 줄어든다.
    // (upsert 단일화는 타 테넌트 id 충돌 시 테넌트 가드가 불가능해 배제)
    const now = new Date().toISOString()
    const groups = new Map<string, { grade?: string; school?: string; ids: string[] }>()
    for (const update of updates) {
      const key = JSON.stringify([update.grade ?? null, update.school ?? null])
      const group = groups.get(key)
      if (group) {
        group.ids.push(update.id)
      } else {
        groups.set(key, { grade: update.grade, school: update.school, ids: [update.id] })
      }
    }

    const updateResults = await Promise.all(
      [...groups.values()].map((group) =>
        serviceClient
          .from('students')
          .update({
            ...(group.grade !== undefined && { grade: group.grade }),
            ...(group.school !== undefined && { school: group.school }),
            updated_at: now,
          })
          .in('id', group.ids)
          .eq('tenant_id', tenantId)
      )
    )

    // 에러 로깅
    const groupList = [...groups.values()]
    updateResults.forEach((result, idx) => {
      if (result.error) {
        console.error(`Failed to update students ${groupList[idx].ids.join(', ')}:`, result.error)
      }
    })

    // 4. Revalidate
    revalidatePath('/students')
    revalidateTag(`students-master:${tenantId}`)

    return { success: true, error: null }
  } catch (error) {
    console.error('[bulkUpdateStudents] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Bulk delete students (soft delete)
 * @param studentIds - Array of student IDs
 * @returns Success or error
 */
export async function bulkDeleteStudents(studentIds: string[]) {
  try {
    const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)))

    if (uniqueStudentIds.length === 0) {
      return {
        success: false,
        error: '삭제할 학생을 선택해주세요',
      }
    }

    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. 관계 해제 + 소프트삭제를 단일 트랜잭션 RPC로 수행 (부분 실패 시 전체 롤백)
    const { classIds, affectedCount } = await detachStudentActiveRelations(serviceClient, {
      tenantId,
      studentIds: uniqueStudentIds,
      reason: '학생 일괄 삭제로 인한 자동 해제',
      unlinkGuardians: true,
      closeOpenTodos: true,
      softDeleteStudents: true,
    })

    if (affectedCount === 0) {
      return {
        success: false,
        error: '삭제할 학생을 찾을 수 없습니다',
      }
    }

    // 4. Revalidate
    revalidatePath('/students')
    revalidatePath('/classes')
    classIds.forEach((classId) => revalidatePath(`/classes/${classId}`))
    revalidatePath('/dashboard')
    revalidatePath('/todos')
    revalidatePath('/todos/planner')
    revalidatePath('/todos/verify')
    revalidateTag(`attendance-roster:${tenantId}`)
    revalidateTag(`students-master:${tenantId}`)

    return { success: true, error: null }
  } catch (error) {
    console.error('[bulkDeleteStudents] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Bulk enroll students in a class
 * @param studentIds - Array of student IDs
 * @param classId - Class ID
 * @returns Success or error
 */
export async function bulkEnrollClass(studentIds: string[], classId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. class_id 소유 검증 — 타 테넌트 수업으로의 배정 차단
    const { data: ownedClass, error: classError } = await serviceClient
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (classError) throw classError
    if (!ownedClass) {
      return { success: false, error: '수업을 찾을 수 없습니다.' }
    }

    // 4. student_id 소유 검증 — 현재 테넌트 소속 학생만 배정 (upsert가 타 테넌트 행을 덮어쓰는 것을 방지)
    const { data: ownedStudents, error: studentsError } = await serviceClient
      .from('students')
      .select('id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .in('id', studentIds)

    if (studentsError) throw studentsError

    const ownedStudentIds = (ownedStudents ?? []).map((s) => s.id)
    if (ownedStudentIds.length === 0) {
      return { success: false, error: '배정할 학생을 찾을 수 없습니다.' }
    }

    // 5. 기존 활성 등록을 제외하고 신규 등록 생성
    // (유니크가 "활성 등록"에만 걸리는 부분 인덱스로 바뀌어 upsert onConflict를
    //  쓸 수 없다 — 탈퇴 이력 행은 보존하고 재등록은 새 행으로 추가한다)
    const { data: existingActive, error: existingError } = await serviceClient
      .from('class_enrollments')
      .select('student_id')
      .eq('tenant_id', tenantId)
      .eq('class_id', classId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .in('student_id', ownedStudentIds)

    if (existingError) throw existingError

    const alreadyEnrolled = new Set((existingActive ?? []).map((e) => e.student_id))
    const enrollments = ownedStudentIds
      .filter((studentId) => !alreadyEnrolled.has(studentId))
      .map((studentId) => ({
        tenant_id: tenantId,
        class_id: classId,
        student_id: studentId,
        status: 'active',
        enrolled_at: new Date().toISOString(),
      }))

    if (enrollments.length > 0) {
      const { error } = await serviceClient
        .from('class_enrollments')
        .insert(enrollments)

      if (error) {
        console.error('[bulkAssignClass] Assignment error:', error.message)
        throw new Error('수업 배정에 실패했습니다')
      }
    }

    // 4. Revalidate
    revalidatePath('/students')
    revalidatePath('/classes')

    return { success: true, error: null }
  } catch (error) {
    console.error('[bulkEnrollClass] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update student class enrollments
 * Replaces all current enrollments with the new set
 *
 * @param studentId - Student ID
 * @param classIds - Array of class IDs to enroll in
 * @returns Success status or error
 */
export async function updateStudentClassEnrollments(
  studentId: string,
  classIds: string[]
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Get all existing enrollments (active + withdrawn) for this student
    const { data: allEnrollments, error: fetchError } = await supabase
      .from('class_enrollments')
      .select('id, class_id, status')
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)

    if (fetchError) throw fetchError

    const enrollmentMap = new Map((allEnrollments || []).map(e => [e.class_id, e]))
    const activeClassIds = (allEnrollments || [])
      .filter(e => e.status === 'active')
      .map(e => e.class_id)

    // 4. Determine what to insert, reactivate, or withdraw
    const toInsert = classIds.filter(id => !enrollmentMap.has(id))
    const toReactivate = classIds
      .filter(id => enrollmentMap.has(id) && enrollmentMap.get(id)!.status !== 'active')
      .map(id => enrollmentMap.get(id)!.id)
    const toWithdraw = activeClassIds
      .filter(id => !classIds.includes(id))
      .map(id => enrollmentMap.get(id)!.id)

    // 5. Insert brand-new enrollments
    if (toInsert.length > 0) {
      const newEnrollments = toInsert.map(classId => ({
        tenant_id: tenantId,
        student_id: studentId,
        class_id: classId,
        status: 'active',
        enrolled_at: new Date().toISOString(),
      }))

      const { error: insertError } = await supabase
        .from('class_enrollments')
        .insert(newEnrollments)

      if (insertError) throw insertError
    }

    // 6. Reactivate previously withdrawn enrollments
    if (toReactivate.length > 0) {
      const { error: reactivateError } = await supabase
        .from('class_enrollments')
        .update({
          status: 'active',
          end_date: null,
          withdrawal_reason: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', toReactivate)

      if (reactivateError) throw reactivateError
    }

    // 7. Withdraw removed enrollments
    if (toWithdraw.length > 0) {
      const { error: withdrawError } = await supabase
        .from('class_enrollments')
        .update({
          status: 'withdrawn',
          end_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .in('id', toWithdraw)

      if (withdrawError) throw withdrawError
    }

    // 8. Revalidate pages and attendance roster cache
    revalidatePath(`/students/${studentId}`)
    revalidatePath('/students')
    revalidateTag(`attendance-roster:${tenantId}`)

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[updateStudentClassEnrollments] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
