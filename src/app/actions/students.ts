/**
 * Student Management Server Actions
 *
 * 모든 학생 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
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

const guardianSchema = z.object({
  name: z.string().min(1, '보호자 이름은 필수입니다'),
  phone: z.string().nullable().optional(),
  email: z.string().email('유효한 이메일을 입력하세요').nullable().optional(),
  relationship: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  is_primary_contact: z.boolean().default(true),
  receives_notifications: z.boolean().default(true),
  receives_billing: z.boolean().default(false),
  can_pickup: z.boolean().default(true),
})

const existingGuardianSchema = z.object({
  id: z.string().uuid(),
  is_primary_contact: z.boolean().default(true),
  receives_notifications: z.boolean().default(true),
  receives_billing: z.boolean().default(false),
  can_pickup: z.boolean().default(true),
})

const studentSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  birth_date: z.string().nullable().optional(),
  grade: z.string().min(1, '학년은 필수입니다'),
  school: z.string().nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  email: z.string().email().nullable().optional(),
  student_phone: z.string().nullable().optional(),
  profile_image_url: z.string().url().nullable().optional(),
  enrollment_date: z.string().optional(),
  notes: z.string().nullable().optional(),
  commute_method: z.string().nullable().optional(),
  marketing_source: z.string().nullable().optional(),
  kiosk_pin: z.string().nullable().optional(),
})

const createStudentCompleteSchema = z.object({
  student: studentSchema,
  guardian: z.union([guardianSchema, existingGuardianSchema]).nullable().optional(),
  guardianMode: z.enum(['new', 'existing', 'skip']),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Create a student with optional guardian (uses create_student_complete RPC)
 *
 * This action:
 * 1. Verifies user authentication and tenant
 * 2. Calls create_student_complete RPC with service_role
 * 3. Handles three guardian modes: new, existing, skip
 * 4. Returns student_id and guardian_id
 *
 * @param input - Student and guardian data
 * @returns Created student/guardian IDs or error
 */
export async function createStudentComplete(
  input: z.infer<typeof createStudentCompleteSchema>
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Validate input
    const validated = createStudentCompleteSchema.parse(input)

    // 3. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 4. Call RPC with service_role (bypasses RLS)
    const { data, error } = await serviceClient.rpc('create_student_complete', {
      _student: validated.student as any,
      _guardian: validated.guardian as any,
      _guardian_mode: validated.guardianMode,
    })

    if (error) {
      console.error('[createStudentComplete] RPC error:', error)
      throw new Error(error.message || '학생 생성에 실패했습니다')
    }

    if (!data) {
      throw new Error('학생 생성 결과를 받지 못했습니다')
    }

    // 5. Revalidate pages
    revalidatePath('/students')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        studentId: data.student_id,
        guardianId: data.guardian_id,
      },
      error: null,
    }
  } catch (error) {
    console.error('[createStudentComplete] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update student basic information
 *
 * @param studentId - Student ID
 * @param updates - Fields to update
 * @returns Success or error
 */
export async function updateStudent(
  studentId: string,
  updates: Partial<z.infer<typeof studentSchema>>
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Verify student belongs to tenant
    const { data: existingStudent, error: fetchError } = await serviceClient
      .from('students')
      .select('id, tenant_id')
      .eq('id', studentId)
      .maybeSingle()

    if (fetchError || !existingStudent) {
      return {
        success: false,
        error: '학생을 찾을 수 없습니다',
      }
    }

    if (existingStudent.tenant_id !== tenantId) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    // 4. Update with service_role
    const { error: updateError } = await serviceClient
      .from('students')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)

    if (updateError) {
      throw updateError
    }

    // 5. Revalidate pages
    revalidatePath('/students')
    revalidatePath(`/students/${studentId}`)
    revalidatePath('/dashboard')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[updateStudent] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Soft delete a student (sets deleted_at timestamp)
 *
 * @param studentId - Student ID
 * @returns Success or error
 */
export async function deleteStudent(studentId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Verify student belongs to tenant
    const { data: existingStudent, error: fetchError } = await serviceClient
      .from('students')
      .select('id, tenant_id')
      .eq('id', studentId)
      .maybeSingle()

    if (fetchError || !existingStudent) {
      return {
        success: false,
        error: '학생을 찾을 수 없습니다',
      }
    }

    if (existingStudent.tenant_id !== tenantId) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    // 4. Soft delete with service_role
    const { error: deleteError } = await serviceClient
      .from('students')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', studentId)

    if (deleteError) {
      throw deleteError
    }

    // 5. Revalidate pages
    revalidatePath('/students')
    revalidatePath('/dashboard')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[deleteStudent] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Withdraw a student (sets withdrawal_date)
 *
 * @param studentId - Student ID
 * @param withdrawalDate - Withdrawal date (ISO string)
 * @param reason - Withdrawal reason
 * @returns Success or error
 */
export async function withdrawStudent(
  studentId: string,
  withdrawalDate: string,
  reason?: string
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Verify student belongs to tenant
    const { data: existingStudent, error: fetchError } = await serviceClient
      .from('students')
      .select('id, tenant_id')
      .eq('id', studentId)
      .maybeSingle()

    if (fetchError || !existingStudent) {
      return {
        success: false,
        error: '학생을 찾을 수 없습니다',
      }
    }

    if (existingStudent.tenant_id !== tenantId) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    // 4. Update withdrawal status with service_role
    const { error: updateError } = await serviceClient
      .from('students')
      .update({
        withdrawal_date: withdrawalDate,
        withdrawal_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)

    if (updateError) {
      throw updateError
    }

    // 5. Revalidate pages
    revalidatePath('/students')
    revalidatePath(`/students/${studentId}`)
    revalidatePath('/dashboard')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[withdrawStudent] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
