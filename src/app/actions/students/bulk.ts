'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

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

    // 3. Update all students in parallel (N+1 순차 → N번 병렬)
    const now = new Date().toISOString()
    const updateResults = await Promise.all(
      updates.map(update =>
        serviceClient
          .from('students')
          .update({
            grade: update.grade,
            school: update.school,
            updated_at: now,
          })
          .eq('id', update.id)
          .eq('tenant_id', tenantId)
      )
    )

    // 에러 로깅
    updateResults.forEach((result, idx) => {
      if (result.error) {
        console.error(`Failed to update student ${updates[idx].id}:`, result.error)
      }
    })

    // 4. Revalidate
    revalidatePath('/students')

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
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Soft delete each student
    const { error } = await serviceClient
      .from('students')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', studentIds)
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`학생 삭제 실패: ${error.message}`)
    }

    // 4. Revalidate
    revalidatePath('/students')

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

    // 3. Create enrollment records
    const enrollments = studentIds.map(studentId => ({
      tenant_id: tenantId,
      class_id: classId,
      student_id: studentId,
      enrolled_at: new Date().toISOString(),
    }))

    const { error } = await serviceClient
      .from('class_enrollments')
      .upsert(enrollments, {
        onConflict: 'class_id,student_id',
      })

    if (error) {
      throw new Error(`수업 배정 실패: ${error.message}`)
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
    const { tenantId, userId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. First, get current enrollments
    const { data: currentEnrollments, error: fetchError } = await supabase
      .from('class_enrollments')
      .select('id, class_id')
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)

    if (fetchError) throw fetchError

    const currentClassIds = (currentEnrollments || []).map(e => e.class_id)

    // 4. Determine what to add and what to remove
    const toAdd = classIds.filter(id => !currentClassIds.includes(id))
    const toRemove = currentEnrollments
      ?.filter(e => !classIds.includes(e.class_id))
      .map(e => e.id) || []

    // 5. Add new enrollments
    if (toAdd.length > 0) {
      const newEnrollments = toAdd.map(classId => ({
        tenant_id: tenantId,
        student_id: studentId,
        class_id: classId,
        status: 'active',
        enrolled_at: new Date().toISOString(),
        enrolled_by: userId,
      }))

      const { error: insertError } = await supabase
        .from('class_enrollments')
        .insert(newEnrollments)

      if (insertError) throw insertError
    }

    // 6. Soft delete removed enrollments
    if (toRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('class_enrollments')
        .update({
          status: 'withdrawn',
          withdrawn_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', toRemove)

      if (deleteError) throw deleteError
    }

    // 7. Revalidate pages
    revalidatePath(`/students/${studentId}`)
    revalidatePath('/students')

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
