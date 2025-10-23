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
import type { StudentDetailData } from '@/types/studentDetail.types'

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
