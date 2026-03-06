'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { getTodayKST } from '@/lib/utils'
import { hashKioskPin } from '../kiosk'
import { createStudentCompleteSchema, studentSchema } from './schemas'

/**
 * Create a student with optional guardian (pure service_role implementation)
 *
 * This action:
 * 1. Verifies user authentication and tenant
 * 2. Creates student record with service_role (bypasses RLS)
 * 3. Handles three guardian modes:
 *    - 'new': Creates new guardian + user + links to student
 *    - 'existing': Links existing guardian to student
 *    - 'skip': Creates student only
 * 4. Returns student_id and guardian_id
 *
 * ✅ Fully server-side + service_role based (no RPC)
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

    let guardianId: string | null = null
    let studentId: string | null = null

    // 4. Handle guardian creation/linking based on mode
    if (validated.guardianMode === 'new' && validated.guardian && 'name' in validated.guardian) {
      // Mode: Create new guardian
      const guardianData = validated.guardian

      // 4-1. Create user record for guardian
      const guardianEmail = guardianData.email || null
      const guardianPhone = guardianData.phone || null

      // 이메일이 있는 경우, 중복 체크
      if (guardianEmail) {
        const { data: existingUser } = await serviceClient
          .from('users')
          .select('id, name')
          .eq('email', guardianEmail)
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .maybeSingle()

        if (existingUser) {
          throw new Error(`이메일 '${guardianEmail}'은(는) 이미 등록되어 있습니다. 학부모 검색에서 '${existingUser.name}'을(를) 선택하거나 다른 이메일을 사용해주세요.`)
        }
      }

      const { data: userData, error: userError } = await serviceClient
        .from('users')
        .insert({
          tenant_id: tenantId,
          email: guardianEmail,
          phone: guardianPhone,
          name: guardianData.name,
          role_code: 'parent',
          approval_status: 'approved',
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (userError || !userData) {
        // 중복 에러인 경우 더 자세한 메시지 제공
        if (userError?.code === '23505' && userError?.message?.includes('uq_users_email_active')) {
          throw new Error(`이메일이 이미 사용 중입니다. 학부모 검색에서 기존 보호자를 선택하거나 다른 이메일을 사용해주세요.`)
        }
        console.error('[createStudentComplete] Guardian user creation error:', userError?.message)
        throw new Error('보호자 사용자 생성에 실패했습니다')
      }

      // 4-2. Create guardian record
      const { data: guardianRecord, error: guardianError } = await serviceClient
        .from('guardians')
        .insert({
          user_id: userData.id,
          tenant_id: tenantId,
          name: guardianData.name,
          relationship: guardianData.relationship || null,
          occupation: guardianData.occupation || null,
          address: guardianData.address || null,
        })
        .select('id')
        .single()

      if (guardianError || !guardianRecord) {
        console.error('[createStudentComplete] Guardian record creation error:', guardianError?.message)
        throw new Error('보호자 정보 생성에 실패했습니다')
      }

      guardianId = guardianRecord.id
    } else if (validated.guardianMode === 'existing' && validated.guardian && 'id' in validated.guardian) {
      // Mode: Use existing guardian
      guardianId = validated.guardian.id

      // Verify guardian belongs to tenant
      const { data: existingGuardian, error: guardianCheckError } = await serviceClient
        .from('guardians')
        .select('id, tenant_id')
        .eq('id', guardianId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (guardianCheckError || !existingGuardian) {
        throw new Error('보호자를 찾을 수 없습니다')
      }
    }
    // Mode: 'skip' - guardianId remains null

    // 5. Generate unique student_code
    const studentCodePrefix = `STU${new Date().getFullYear().toString().slice(-2)}`
    const randomBytes = new Uint32Array(1)
    crypto.getRandomValues(randomBytes)
    const randomSuffix = (randomBytes[0] % 100000).toString().padStart(5, '0')
    const studentCode = `${studentCodePrefix}-${randomSuffix}`

    // 6. Create user record for student
    const studentEmail = validated.student.email || null
    const studentPhone = validated.student.student_phone || null

    const { data: studentUserData, error: studentUserError } = await serviceClient
      .from('users')
      .insert({
        tenant_id: tenantId,
        email: studentEmail,
        phone: studentPhone,
        name: validated.student.name,
        role_code: 'student',
        approval_status: 'approved',
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (studentUserError || !studentUserData) {
      console.error('[createStudentComplete] Student user creation error:', studentUserError?.message)
      throw new Error('학생 사용자 생성에 실패했습니다')
    }

    // 7. Hash kiosk_pin if provided
    let hashedKioskPin: string | null = null
    if (validated.student.kiosk_pin) {
      hashedKioskPin = await hashKioskPin(validated.student.kiosk_pin)
    }

    // 8. Create student record
    const { data: studentRecord, error: studentError } = await serviceClient
      .from('students')
      .insert({
        user_id: studentUserData.id,
        tenant_id: tenantId,
        name: validated.student.name,
        student_code: studentCode,
        grade: validated.student.grade,
        school: validated.student.school || null,
        birth_date: validated.student.birth_date || null,
        gender: validated.student.gender || null,
        student_phone: studentPhone,
        profile_image_url: validated.student.profile_image_url || null,
        enrollment_date: validated.student.enrollment_date || getTodayKST(),
        notes: validated.student.notes || null,
        commute_method: validated.student.commute_method || null,
        marketing_source: validated.student.marketing_source || null,
        kiosk_pin: hashedKioskPin,
      })
      .select('id')
      .single()

    if (studentError || !studentRecord) {
      console.error('[createStudentComplete] Student record creation error:', studentError?.message)
      throw new Error('학생 정보 생성에 실패했습니다')
    }

    studentId = studentRecord.id

    // 9. Link guardian to student (if guardian exists)
    if (guardianId && studentId) {
      const guardianLinkData =
        validated.guardianMode === 'existing' && validated.guardian && 'id' in validated.guardian
          ? {
              tenant_id: tenantId,
              student_id: studentId,
              guardian_id: guardianId,
              is_primary: validated.guardian.is_primary_contact ?? true,
              is_primary_contact: validated.guardian.is_primary_contact ?? true,
              receives_notifications: validated.guardian.receives_notifications ?? true,
              receives_billing: validated.guardian.receives_billing ?? false,
              can_pickup: validated.guardian.can_pickup ?? true,
            }
          : validated.guardianMode === 'new' && validated.guardian && 'name' in validated.guardian
          ? {
              tenant_id: tenantId,
              student_id: studentId,
              guardian_id: guardianId,
              is_primary: validated.guardian.is_primary_contact ?? true,
              is_primary_contact: validated.guardian.is_primary_contact ?? true,
              receives_notifications: validated.guardian.receives_notifications ?? true,
              receives_billing: validated.guardian.receives_billing ?? false,
              can_pickup: validated.guardian.can_pickup ?? true,
            }
          : null

      if (guardianLinkData) {
        const { error: linkError } = await serviceClient
          .from('student_guardians')
          .insert(guardianLinkData)

        if (linkError) {
          console.error('[createStudentComplete] Guardian link error:', linkError.message)
          throw new Error('보호자와 학생을 연결하는 데 실패했습니다')
        }
      }
    }

    // 10. Revalidate pages
    revalidatePath('/students')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        studentId: studentId!,
        guardianId: guardianId,
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
  updates: Partial<z.infer<typeof studentSchema>> & {
    name?: string
    email?: string | null
    phone?: string | null
    emergency_contact?: string | null
    kiosk_pin?: string | null
    profile_image_url?: string | null
  }
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Verify student belongs to tenant and get user_id
    const { data: existingStudent, error: fetchError } = await serviceClient
      .from('students')
      .select('id, tenant_id, user_id')
      .eq('id', studentId)
      .is('deleted_at', null)
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

    // 4. Separate user updates from student updates
    const userUpdates: Record<string, unknown> = {}
    const studentUpdates: Record<string, unknown> = {}

    // User table fields
    if (updates.name !== undefined) userUpdates.name = updates.name
    if (updates.email !== undefined) userUpdates.email = updates.email
    if (updates.phone !== undefined) userUpdates.phone = updates.phone

    // Student table fields
    if (updates.grade !== undefined) studentUpdates.grade = updates.grade
    if (updates.school !== undefined) studentUpdates.school = updates.school
    if (updates.birth_date !== undefined) studentUpdates.birth_date = updates.birth_date
    if (updates.gender !== undefined) studentUpdates.gender = updates.gender
    if (updates.student_phone !== undefined) studentUpdates.student_phone = updates.student_phone
    if (updates.notes !== undefined) studentUpdates.notes = updates.notes
    if (updates.commute_method !== undefined) studentUpdates.commute_method = updates.commute_method
    if (updates.marketing_source !== undefined) studentUpdates.marketing_source = updates.marketing_source
    if (updates.emergency_contact !== undefined) studentUpdates.emergency_contact = updates.emergency_contact
    if (updates.profile_image_url !== undefined) studentUpdates.profile_image_url = updates.profile_image_url

    // Hash kiosk_pin before storing
    if (updates.kiosk_pin !== undefined) {
      if (updates.kiosk_pin === null || updates.kiosk_pin === '') {
        studentUpdates.kiosk_pin = null
      } else {
        studentUpdates.kiosk_pin = await hashKioskPin(updates.kiosk_pin)
      }
    }

    // 5. Update users table if needed
    if (Object.keys(userUpdates).length > 0 && existingStudent.user_id) {
      const { error: userUpdateError } = await serviceClient
        .from('users')
        .update({
          ...userUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingStudent.user_id)

      if (userUpdateError) {
        throw userUpdateError
      }
    }

    // 6. Update students table if needed
    if (Object.keys(studentUpdates).length > 0) {
      const { error: studentUpdateError } = await serviceClient
        .from('students')
        .update({
          ...studentUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)

      if (studentUpdateError) {
        throw studentUpdateError
      }
    }

    // 7. Revalidate pages
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
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError || !existingStudent) {
      return {
        success: false,
        error: '학생을 찾을 수 없거나 이미 삭제되었습니다',
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
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError || !existingStudent) {
      return {
        success: false,
        error: '학생을 찾을 수 없거나 이미 삭제되었습니다',
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
