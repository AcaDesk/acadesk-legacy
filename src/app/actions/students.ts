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
import type { StudentDetailData } from '@/core/types/studentDetail.types'

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

    // 7. Create student record
    const { data: studentRecord, error: studentError } = await serviceClient
      .from('students')
      .insert({
        user_id: studentUserData.id,
        tenant_id: tenantId,
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
        kiosk_pin: validated.student.kiosk_pin || null,
      })
      .select('id')
      .single()

    if (studentError || !studentRecord) {
      throw new Error('학생 정보 생성에 실패했습니다: ' + studentError?.message)
    }

    studentId = studentRecord.id

    // 8. Link guardian to student (if guardian exists)
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

    // 9. Revalidate pages
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

    // 2. Create service_role client (for read operations with tenant filtering)
    const serviceClient = createServiceRoleClient()

    // 3. Fetch student detail with related data
    const { data: student, error: studentError } = await serviceClient
      .from('students')
      .select(`
        id,
        student_code,
        grade,
        school,
        enrollment_date,
        birth_date,
        gender,
        student_phone,
        profile_image_url,
        commute_method,
        marketing_source,
        emergency_contact,
        notes,
        users (
          name,
          email,
          phone
        ),
        student_guardians (
          guardians (
            id,
            relationship,
            users (
              name,
              phone
            )
          )
        ),
        class_enrollments (
          id,
          class_id,
          status,
          enrolled_at,
          end_date,
          withdrawal_reason,
          notes,
          classes (
            id,
            name,
            subject,
            instructor_id
          )
        ),
        student_schedules (
          day_of_week,
          scheduled_arrival_time
        )
      `)
      .eq('id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (studentError || !student) {
      return {
        success: false,
        error: '학생을 찾을 수 없습니다',
        data: null,
      }
    }

    // 4. Fetch related data in parallel
    const [scoresResult, todosResult, consultationsResult, attendanceResult, invoicesResult] =
      await Promise.all([
        // Recent exam scores
        serviceClient
          .from('exam_scores')
          .select(`
            id,
            percentage,
            created_at,
            exam_id,
            exams (
              id,
              name,
              exam_date,
              category_code,
              class_id
            )
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(10),

        // Recent todos
        serviceClient
          .from('student_todos')
          .select(`
            id,
            title,
            description,
            priority,
            due_date,
            completed_at,
            verified_at,
            created_at
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(20),

        // Consultations
        serviceClient
          .from('consultations')
          .select(`
            id,
            consultation_type,
            summary,
            created_at,
            users!consultations_instructor_id_fkey (
              name
            )
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(10),

        // Attendance records
        serviceClient
          .from('attendance')
          .select(`
            id,
            status,
            session_id,
            attendance_sessions (
              id,
              session_date,
              class_id
            )
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(30),

        // Invoices (billing)
        serviceClient
          .from('invoices')
          .select(`
            id,
            amount,
            status,
            due_date,
            created_at
          `)
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

    const recentScores = scoresResult.data || []
    const recentTodos = todosResult.data || []
    const consultations = consultationsResult.data || []
    const attendanceRecords = attendanceResult.data || []
    const invoices = invoicesResult.data || []

    // 5. Calculate KPIs
    const attendanceRate =
      attendanceRecords.length > 0
        ? Math.round(
            (attendanceRecords.filter((r) => r.status === 'present').length /
              attendanceRecords.length) *
              100
          )
        : 0

    const avgScore =
      recentScores.length > 0
        ? Math.round(
            recentScores.reduce((sum, s) => sum + s.percentage, 0) / recentScores.length
          )
        : 0

    const homeworkRate =
      recentTodos.length > 0
        ? Math.round(
            (recentTodos.filter((t) => t.completed_at).length / recentTodos.length) * 100
          )
        : 0

    // 6. Calculate class averages (simple average by exam)
    const classAverages: Record<string, number> = {}
    for (const score of recentScores) {
      const exam = score.exams as any
      if (exam?.class_id) {
        const classId = exam.class_id as string
        if (!classAverages[classId]) {
          classAverages[classId] = score.percentage
        }
      }
    }

    // 7. Transform data to match StudentDetailData type
    const transformedData: StudentDetailData = {
      student: student as any, // Supabase returns correct structure
      recentScores: recentScores.map((s) => ({
        id: s.id,
        percentage: s.percentage,
        created_at: s.created_at,
        exam_id: s.exam_id,
        exams: Array.isArray(s.exams) ? s.exams[0] : s.exams,
      })),
      classAverages,
      recentTodos: recentTodos.map((t) => ({
        id: t.id,
        title: t.title,
        due_date: t.due_date,
        subject: null, // Not returned from DB
        completed_at: t.completed_at,
      })),
      consultations: consultations.map((c: any) => ({
        id: c.id,
        consultation_date: c.created_at,
        consultation_type: c.consultation_type,
        content: c.summary,
        created_at: c.created_at,
        instructor_id: c.users?.id || undefined,
      })),
      attendanceRecords: attendanceRecords.map((a: any) => ({
        id: a.id,
        status: a.status,
        check_in_at: null,
        check_out_at: null,
        notes: null,
        attendance_sessions: a.attendance_sessions
          ? {
              session_date: a.attendance_sessions.session_date,
              scheduled_start_at: '',
              scheduled_end_at: '',
              classes: null,
            }
          : null,
      })),
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        billing_month: '',
        issue_date: inv.created_at,
        due_date: inv.due_date,
        total_amount: inv.amount,
        paid_amount: 0,
        status: inv.status,
        notes: null,
        created_at: inv.created_at,
        invoice_items: [],
        payments: [],
      })),
      kpis: {
        attendanceRate,
        avgScore,
        homeworkRate,
      },
    }

    return {
      success: true,
      error: null,
      data: transformedData,
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
    const serviceClient = createServiceRoleClient()

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
