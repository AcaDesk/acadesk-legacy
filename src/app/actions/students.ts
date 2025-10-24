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
import { verifyStaffPermission } from '@/lib/auth/service-role-helpers'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import type { StudentDetailData } from '@/core/types/studentDetail.types'
import { hashKioskPin } from './kiosk'

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
    const serviceClient = await createServiceRoleClient()

    let guardianId: string | null = null
    let studentId: string | null = null

    // 4. Handle guardian creation/linking based on mode
    if (validated.guardianMode === 'new' && validated.guardian && 'name' in validated.guardian) {
      // Mode: Create new guardian
      const guardianData = validated.guardian

      // 4-1. Create user record for guardian
      const guardianEmail = guardianData.email || null
      const guardianPhone = guardianData.phone || null

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
        throw new Error('보호자 사용자 생성에 실패했습니다: ' + userError?.message)
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
        throw new Error('보호자 정보 생성에 실패했습니다: ' + guardianError?.message)
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
    const randomSuffix = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0')
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
      throw new Error('학생 사용자 생성에 실패했습니다: ' + studentUserError?.message)
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
        enrollment_date: validated.student.enrollment_date || new Date().toISOString().split('T')[0],
        notes: validated.student.notes || null,
        commute_method: validated.student.commute_method || null,
        marketing_source: validated.student.marketing_source || null,
        kiosk_pin: hashedKioskPin,
      })
      .select('id')
      .single()

    if (studentError || !studentRecord) {
      throw new Error('학생 정보 생성에 실패했습니다: ' + studentError?.message)
    }

    studentId = studentRecord.id

    // 9. Link guardian to student (if guardian exists)
    if (guardianId && studentId) {
      const guardianLinkData =
        validated.guardianMode === 'existing' && validated.guardian && 'id' in validated.guardian
          ? {
              student_id: studentId,
              guardian_id: guardianId,
              is_primary_contact: validated.guardian.is_primary_contact ?? true,
              receives_notifications: validated.guardian.receives_notifications ?? true,
              receives_billing: validated.guardian.receives_billing ?? false,
              can_pickup: validated.guardian.can_pickup ?? true,
            }
          : validated.guardianMode === 'new' && validated.guardian && 'name' in validated.guardian
          ? {
              student_id: studentId,
              guardian_id: guardianId,
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
          console.warn('[createStudentComplete] Failed to link guardian:', linkError)
          // Don't throw - student is created, just log the warning
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
    const serviceClient = await createServiceRoleClient()

    // 3. Verify student belongs to tenant and get user_id
    const { data: existingStudent, error: fetchError } = await serviceClient
      .from('students')
      .select('id, tenant_id, user_id')
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

    // 4. Separate user updates from student updates
    const userUpdates: Record<string, any> = {}
    const studentUpdates: Record<string, any> = {}

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
    const serviceClient = await createServiceRoleClient()

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
    const serviceClient = await createServiceRoleClient()

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

// ============================================================================
// Query Actions (Read Operations)
// ============================================================================

/**
 * Get student detail with all related data
 *
 * @param studentId - Student ID
 * @returns Student detail data or error
 */
export async function getStudentDetail(studentId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = await createServiceRoleClient()

    // 3. Call RPC function to get complete student detail
    const { data, error: rpcError } = await serviceClient
      .rpc('get_student_detail', {
        p_student_id: studentId,
        p_tenant_id: tenantId,
      })
      .single()

    if (rpcError) {
      console.error('[getStudentDetail] RPC Error:', {
        studentId,
        tenantId,
        error: rpcError,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      })
      throw rpcError
    }

    if (!data) {
      console.log('[getStudentDetail] Student not found:', {
        studentId,
        tenantId,
      })
      return {
        success: false,
        error: '학생을 찾을 수 없습니다',
        data: null,
      }
    }

    // 4. Return the data (DB already returns StudentDetailData format)
    return {
      success: true,
      error: null,
      data: data as StudentDetailData,
    }
  } catch (error) {
    console.error('[getStudentDetail] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
      data: null,
    }
  }
}

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
    const serviceClient = await createServiceRoleClient()

    // 3. Update each student
    for (const update of updates) {
      const { error } = await serviceClient
        .from('students')
        .update({
          grade: update.grade,
          school: update.school,
          updated_at: new Date().toISOString(),
        })
        .eq('id', update.id)
        .eq('tenant_id', tenantId)

      if (error) {
        console.error(`Failed to update student ${update.id}:`, error)
      }
    }

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
    const serviceClient = await createServiceRoleClient()

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
    const serviceClient = await createServiceRoleClient()

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
 * Get students with filters (service_role based)
 *
 * This action:
 * 1. Verifies user authentication and tenant
 * 2. Uses service_role to query students (bypasses RLS)
 * 3. Applies filters: grade, class, school, commute method, marketing source, enrollment date range
 * 4. Returns students with enrollment and guardian info
 *
 * @param filters - Filter criteria
 * @returns Students list or error
 */
export async function getStudents(filters?: {
  grade?: string
  classId?: string
  school?: string
  commuteMethod?: string
  marketingSource?: string
  enrollmentDateFrom?: string
  enrollmentDateTo?: string
}) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = await createServiceRoleClient()

    // 3. Build query
    let query = serviceClient
      .from('students')
      .select(`
        id,
        student_code,
        grade,
        school,
        enrollment_date,
        commute_method,
        marketing_source,
        users!inner (
          name,
          email,
          phone
        ),
        class_enrollments (
          id,
          status,
          classes (
            id,
            name
          )
        ),
        student_guardians (
          guardians (
            id,
            users!inner (
              name,
              phone
            )
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    // 4. Apply filters
    if (filters?.grade && filters.grade !== 'all') {
      query = query.eq('grade', filters.grade)
    }

    if (filters?.school && filters.school !== 'all') {
      query = query.eq('school', filters.school)
    }

    if (filters?.commuteMethod && filters.commuteMethod !== 'all') {
      query = query.eq('commute_method', filters.commuteMethod)
    }

    if (filters?.marketingSource && filters.marketingSource !== 'all') {
      query = query.eq('marketing_source', filters.marketingSource)
    }

    if (filters?.enrollmentDateFrom) {
      query = query.gte('enrollment_date', filters.enrollmentDateFrom)
    }

    if (filters?.enrollmentDateTo) {
      query = query.lte('enrollment_date', filters.enrollmentDateTo)
    }

    // 5. Execute query
    const { data: students, error } = await query

    if (error) {
      throw new Error(`학생 조회 실패: ${error.message}`)
    }

    // 6. Transform data
    const transformedStudents = students?.map((student: any) => ({
      id: student.id,
      student_code: student.student_code,
      name: student.users?.name || 'Unknown',
      email: student.users?.email,
      phone: student.users?.phone,
      grade: student.grade,
      school: student.school,
      enrollment_date: student.enrollment_date,
      commute_method: student.commute_method,
      marketing_source: student.marketing_source,
      classes: student.class_enrollments
        ?.filter((e: any) => e.status === 'active')
        .map((e: any) => ({
          id: e.classes?.id,
          name: e.classes?.name,
        })) || [],
      guardians: student.student_guardians?.map((sg: any) => ({
        id: sg.guardians?.id,
        name: sg.guardians?.users?.name,
        phone: sg.guardians?.users?.phone,
      })) || [],
    })) || []

    // 7. Filter by class if specified (post-query filter for simplicity)
    let filteredStudents = transformedStudents
    if (filters?.classId && filters.classId !== 'all') {
      filteredStudents = transformedStudents.filter(s =>
        s.classes.some((c: any) => c.id === filters.classId)
      )
    }

    return {
      success: true,
      data: filteredStudents,
      error: null,
    }
  } catch (error) {
    console.error('[getStudents] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get filter options for students (service_role based)
 *
 * This action:
 * 1. Verifies user authentication and tenant
 * 2. Uses service_role to query distinct values (bypasses RLS)
 * 3. Returns unique grades, schools, active classes
 *
 * @returns Filter options or error
 */
export async function getStudentFilterOptions() {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = await createServiceRoleClient()

    // 3. Fetch filter options in parallel
    const [gradesResult, schoolsResult, classesResult] = await Promise.allSettled([
      // Unique grades
      serviceClient
        .from('students')
        .select('grade')
        .eq('tenant_id', tenantId)
        .not('grade', 'is', null)
        .order('grade', { ascending: true }),

      // Unique schools
      serviceClient
        .from('students')
        .select('school')
        .eq('tenant_id', tenantId)
        .not('school', 'is', null)
        .order('school', { ascending: true }),

      // Active classes
      serviceClient
        .from('classes')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('name', { ascending: true }),
    ])

    // 4. Process results
    const grades = gradesResult.status === 'fulfilled' && gradesResult.value.data
      ? Array.from(new Set(gradesResult.value.data.map((s: any) => s.grade).filter(Boolean)))
      : []

    const schools = schoolsResult.status === 'fulfilled' && schoolsResult.value.data
      ? Array.from(new Set(schoolsResult.value.data.map((s: any) => s.school).filter(Boolean)))
      : []

    const classes = classesResult.status === 'fulfilled' && classesResult.value.data
      ? classesResult.value.data
      : []

    return {
      success: true,
      data: {
        grades,
        schools,
        classes,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getStudentFilterOptions] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Student Points Management
// ============================================================================

/**
 * 학생 포인트 잔액 조회
 *
 * ✅ Service Role 기반 구현 (RPC 대체)
 *
 * TODO: 포인트 시스템 구현 시 실제 테이블 쿼리로 변경 필요
 * 현재는 placeholder 로직 (항상 0 반환)
 *
 * @param studentId - 학생 ID
 * @returns 포인트 잔액 또는 에러
 */
export async function getStudentPointBalance(studentId: string) {
  const requestId = crypto.randomUUID()

  try {
    console.log('[getStudentPointBalance] Request started:', {
      requestId,
      studentId,
    })

    // 1. Verify permissions
    const permissionResult = await verifyStaffPermission()
    if (!permissionResult.success || !permissionResult.data) {
      return {
        success: false,
        data: null,
        error: permissionResult.error || '권한이 없습니다.',
      }
    }

    const { tenant_id } = permissionResult.data

    // 2. Service role로 포인트 조회
    const serviceClient = await createServiceRoleClient()

    // TODO: 실제 구현 시 student_points 테이블에서 조회
    // const { data: pointsData } = await serviceClient
    //   .from('student_points')
    //   .select('points')
    //   .eq('student_id', studentId)
    //   .eq('tenant_id', tenant_id)
    //   .order('created_at', { ascending: false })
    //   .limit(1)
    //   .maybeSingle()

    // Placeholder: 항상 0 반환
    const balance = 0

    console.log('[getStudentPointBalance] Request completed:', {
      requestId,
      balance,
    })

    return {
      success: true,
      data: balance,
      error: null,
    }
  } catch (error) {
    console.error('[getStudentPointBalance] Error:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 학생 포인트 이력 조회
 *
 * ✅ Service Role 기반 구현 (RPC 대체)
 *
 * TODO: 포인트 시스템 구현 시 실제 테이블 쿼리로 변경 필요
 * 현재는 placeholder 로직 (빈 배열 반환)
 *
 * @param studentId - 학생 ID
 * @param limit - 조회할 최대 개수 (기본: 20)
 * @returns 포인트 이력 배열 또는 에러
 */
export async function getStudentPointHistory(studentId: string, limit = 20) {
  const requestId = crypto.randomUUID()

  try {
    console.log('[getStudentPointHistory] Request started:', {
      requestId,
      studentId,
      limit,
    })

    // 1. Verify permissions
    const permissionResult = await verifyStaffPermission()
    if (!permissionResult.success || !permissionResult.data) {
      return {
        success: false,
        data: null,
        error: permissionResult.error || '권한이 없습니다.',
      }
    }

    const { tenant_id } = permissionResult.data

    // 2. Service role로 포인트 이력 조회
    const serviceClient = await createServiceRoleClient()

    // TODO: 실제 구현 시 student_point_history 테이블에서 조회
    // const { data: historyData } = await serviceClient
    //   .from('student_point_history')
    //   .select(`
    //     id,
    //     point_type,
    //     point_label,
    //     points,
    //     reason,
    //     awarded_date,
    //     awarded_by_name,
    //     created_at
    //   `)
    //   .eq('student_id', studentId)
    //   .eq('tenant_id', tenant_id)
    //   .order('awarded_date', { ascending: false })
    //   .limit(limit)

    // Placeholder: 빈 배열 반환
    const history: any[] = []

    console.log('[getStudentPointHistory] Request completed:', {
      requestId,
      count: history.length,
    })

    return {
      success: true,
      data: history,
      error: null,
    }
  } catch (error) {
    console.error('[getStudentPointHistory] Error:', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })

    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get student activity logs
 *
 * @param studentId - Student ID
 * @param limit - Number of logs to return (default: 50)
 * @returns List of activity logs or error
 */
export async function getStudentActivityLogs(studentId: string, limit = 50) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = await createServiceRoleClient()

    // 3. Query activity logs with activity type information
    const { data, error } = await supabase
      .from('student_activity_logs')
      .select(`
        *,
        ref_activity_types (
          label,
          icon,
          color
        )
      `)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .order('activity_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getStudentActivityLogs] Error:', error)
    return {
      success: false,
      data: null,
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
    const supabase = await createServiceRoleClient()

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
