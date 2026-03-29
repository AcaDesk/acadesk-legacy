/**
 * Class Server Actions
 *
 * 모든 클래스 관련 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 */

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Validation Schemas
// ============================================================================

const createClassSchema = z.object({
  name: z.string().min(1, '수업명은 필수입니다'),
  description: z.string().optional(),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  instructorId: z.string().uuid('유효한 강사를 선택해주세요').optional(),
  schedule: z.record(z.string(), z.any()).optional(),
  room: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  active: z.boolean().default(true),
})

const updateClassSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, '수업명은 필수입니다').optional(),
  description: z.string().optional(),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  instructorId: z.string().uuid().optional(),
  schedule: z.record(z.string(), z.any()).optional(),
  room: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  active: z.boolean().optional(),
})

// ============================================================================
// Types
// ============================================================================

export interface ClassWithDetails {
  id: string
  name: string
  description: string | null
  subject: string | null
  gradeLevel: string | null
  instructorName: string | null
  studentCount: number
  schedule: Record<string, unknown> | null
  room: string | null
  status: string
  active: boolean
  createdAt: string
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get all classes with instructor names and student counts
 *
 * @returns List of classes with details or error
 */
export async function getClassesWithDetails() {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client for query
    const supabase = createServiceRoleClient()

    // 3. Query classes with instructor information
    const { data: classesData, error } = await supabase
      .from('classes')
      .select(`
        *,
        users!classes_instructor_id_fkey (
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    // 4. 배치 조회: 모든 클래스의 학생 수를 한 번에
    const classIds = (classesData || []).map(c => c.id)

    const { data: enrollments } = classIds.length > 0
      ? await supabase
          .from('class_enrollments')
          .select('class_id')
          .in('class_id', classIds)
          .eq('status', 'active')
      : { data: [] }

    // class_id별 카운트 집계
    const countMap = new Map<string, number>()
    for (const e of enrollments || []) {
      countMap.set(e.class_id, (countMap.get(e.class_id) || 0) + 1)
    }

    // 클래스에 카운트 매핑
    const classesWithDetails = (classesData || []).map(classItem => ({
      id: classItem.id,
      name: classItem.name,
      description: classItem.description,
      subject: classItem.subject,
      gradeLevel: classItem.grade_level,
      instructorName: (classItem.users as { name: string } | null)?.name || null,
      studentCount: countMap.get(classItem.id) || 0,
      schedule: classItem.schedule,
      room: classItem.room,
      status: classItem.status,
      active: classItem.active,
      createdAt: classItem.created_at,
    } as ClassWithDetails))

    return {
      success: true,
      data: classesWithDetails,
      error: null,
    }
  } catch (error) {
    console.error('[getClassesWithDetails] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create a new class
 *
 * @param input - Class data
 * @returns Created class or error
 */
export async function createClass(input: z.infer<typeof createClassSchema>) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Validate input
    const validated = createClassSchema.parse(input)

    // 3. Create service_role client
    const supabase = createServiceRoleClient()

    // 4. Insert class
    const { data, error } = await supabase
      .from('classes')
      .insert({
        tenant_id: tenantId,
        name: validated.name,
        description: validated.description || null,
        subject: validated.subject || null,
        grade_level: validated.gradeLevel || null,
        instructor_id: validated.instructorId || null,
        schedule: validated.schedule || null,
        room: validated.room || null,
        capacity: validated.capacity || null,
        status: 'active',
        active: validated.active,
      })
      .select()
      .single()

    if (error) throw error

    // 5. Revalidate pages
    revalidatePath('/classes')

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createClass] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update a class
 *
 * @param input - Class data to update
 * @returns Updated class or error
 */
export async function updateClass(input: z.infer<typeof updateClassSchema>) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Validate input
    const validated = updateClassSchema.parse(input)

    // 3. Create service_role client
    const supabase = createServiceRoleClient()

    // 4. Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.subject !== undefined) updateData.subject = validated.subject
    if (validated.gradeLevel !== undefined) updateData.grade_level = validated.gradeLevel
    if (validated.instructorId !== undefined) updateData.instructor_id = validated.instructorId
    if (validated.schedule !== undefined) updateData.schedule = validated.schedule
    if (validated.room !== undefined) updateData.room = validated.room
    if (validated.capacity !== undefined) updateData.capacity = validated.capacity
    if (validated.active !== undefined) updateData.active = validated.active

    // 5. Update class
    const { data, error } = await supabase
      .from('classes')
      .update(updateData)
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error

    // 6. Revalidate pages
    revalidatePath('/classes')
    revalidatePath(`/classes/${validated.id}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateClass] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get a single class by ID with details
 *
 * @param classId - Class ID
 * @returns Class with details or error
 */
export async function getClassById(classId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Query class with instructor
    const { data: classData, error } = await supabase
      .from('classes')
      .select(`
        *,
        users!classes_instructor_id_fkey (
          name,
          email
        )
      `)
      .eq('id', classId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    if (!classData) throw new Error('Class not found')

    // 4. Get student count
    const { count } = await supabase
      .from('class_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('status', 'active')

    return {
      success: true,
      data: {
        ...classData,
        instructorName: (classData.users as { name: string } | null)?.name || null,
        studentCount: count || 0,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getClassById] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get all active classes (simpler than getClassesWithDetails)
 *
 * @returns List of active classes or error
 */
export async function getActiveClasses() {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Query active classes
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, subject, active, meta')
      .eq('tenant_id', tenantId)
      .eq('active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getActiveClasses] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get classes for a specific instructor
 *
 * @param instructorId - Instructor user ID
 * @returns List of classes or error
 */
export async function getClassesByInstructor(instructorId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Query classes
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('instructor_id', instructorId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getClassesByInstructor] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update class status (active/inactive)
 *
 * @param classId - Class ID
 * @param active - Active status
 * @returns Updated class or error
 */
export async function updateClassStatus(classId: string, active: boolean) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Update class
    const { data, error } = await supabase
      .from('classes')
      .update({
        active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', classId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error

    // 4. Revalidate pages
    revalidatePath('/classes')
    revalidatePath(`/classes/${classId}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateClassStatus] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get recent class sessions
 *
 * @param classId - Class ID
 * @param limit - Number of sessions to return (default: 5)
 * @returns List of recent sessions or error
 */
export async function getRecentClassSessions(classId: string, limit = 5) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Query recent sessions
    const { data, error } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('class_id', classId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('session_date', { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getRecentClassSessions] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get all instructors for class assignment
 *
 * @returns List of instructors or error
 */
export async function getInstructors() {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Query instructors
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('tenant_id', tenantId)
      .in('role_code', ['owner', 'instructor'])
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) throw error

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getInstructors] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get students enrolled in a class with their statistics
 *
 * @param classId - Class ID
 * @returns List of students with stats or error
 */
export async function getClassStudents(classId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Load students enrolled in this class
    const { data: enrollments, error: enrollError } = await supabase
      .from('class_enrollments')
      .select(`
        student_id,
        students!inner (
          id,
          student_code,
          users!inner (
            name
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('class_id', classId)
      .eq('status', 'active')

    if (enrollError) throw enrollError

    if (!enrollments || enrollments.length === 0) {
      return { success: true, data: [], error: null }
    }

    // 4. Calculate stats for each student
    interface EnrollmentRow {
      student_id: string
      students: {
        id: string
        student_code: string
        users: { name: string } | null
      } | null
    }
    interface ScoreRow { student_id: string; percentage: number }
    interface AttendanceRow { student_id: string; status: string }
    interface TodoRow { student_id: string; completed_at: string | null }

    const studentIds = (enrollments as unknown as EnrollmentRow[]).map((e) => e.student_id).filter(Boolean)

    // Get exam scores
    const { data: scores } = await supabase
      .from('exam_scores')
      .select('student_id, percentage')
      .eq('tenant_id', tenantId)
      .in('student_id', studentIds)

    // Get attendance records
    const { data: attendance } = await supabase
      .from('attendance')
      .select('student_id, status')
      .eq('tenant_id', tenantId)
      .in('student_id', studentIds)

    // Get homework completion
    const { data: todos } = await supabase
      .from('student_todos')
      .select('student_id, completed_at')
      .eq('tenant_id', tenantId)
      .in('student_id', studentIds)

    // 5. Calculate stats per student
    const studentsWithStats = (enrollments as unknown as EnrollmentRow[]).map((enrollment) => {
      const student = enrollment.students
      const studentId = enrollment.student_id

      // Calculate average score
      const studentScores = (scores || [] as ScoreRow[]).filter((s) => s.student_id === studentId)
      const avgScore = studentScores.length > 0
        ? Math.round(studentScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / studentScores.length)
        : 0

      // Calculate attendance rate
      const studentAttendance = (attendance || [] as AttendanceRow[]).filter((a) => a.student_id === studentId)
      const presentCount = studentAttendance.filter((a) => a.status === 'present').length
      const attendanceRate = studentAttendance.length > 0
        ? Math.round((presentCount / studentAttendance.length) * 100)
        : 0

      // Calculate homework completion rate
      const studentTodos = (todos || [] as TodoRow[]).filter((t) => t.student_id === studentId)
      const completedCount = studentTodos.filter((t) => t.completed_at).length
      const homeworkRate = studentTodos.length > 0
        ? Math.round((completedCount / studentTodos.length) * 100)
        : 0

      return {
        id: student?.id || '',
        studentCode: student?.student_code || '',
        name: student?.users?.name || '이름 없음',
        avgScore,
        attendanceRate,
        homeworkRate,
      }
    })

    return {
      success: true,
      data: studentsWithStats,
      error: null,
    }
  } catch (error) {
    console.error('[getClassStudents] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get students NOT enrolled in a class (for enrollment dialog)
 *
 * @param classId - Class ID
 * @returns Students available to enroll or error
 */
export async function getUnenrolledStudents(classId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 현재 active enrollment 학생 ID 목록
    const { data: enrollments, error: enrollError } = await supabase
      .from('class_enrollments')
      .select('student_id')
      .eq('tenant_id', tenantId)
      .eq('class_id', classId)
      .eq('status', 'active')

    if (enrollError) throw enrollError

    const enrolledIds = new Set((enrollments || []).map(e => e.student_id))

    // 전체 학생 조회 후 클라이언트에서 제외
    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        grade,
        school,
        users!inner (
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    interface StudentRow {
      id: string
      student_code: string
      grade: string | null
      school: string | null
      users: { name: string } | null
    }

    const unenrolled = (data as unknown as StudentRow[] || [])
      .filter((s) => !enrolledIds.has(s.id))
      .map((s) => ({
        id: s.id,
        studentCode: s.student_code,
        name: s.users?.name || '이름 없음',
        grade: s.grade || '',
        school: s.school || '',
      }))

    return { success: true as const, data: unenrolled, error: null }
  } catch (error) {
    console.error('[getUnenrolledStudents] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

/**
 * Enroll multiple students in a class
 *
 * @param classId - Class ID
 * @param studentIds - Students to enroll
 * @returns Success or error
 */
export async function enrollStudentsInClass(classId: string, studentIds: string[]) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    if (studentIds.length === 0) return { success: true as const, data: null, error: null }

    // 기존 enrollment 조회 (withdrawn 포함 — 재등록 시 reactivate)
    const { data: existing, error: fetchError } = await supabase
      .from('class_enrollments')
      .select('id, student_id, status')
      .eq('tenant_id', tenantId)
      .eq('class_id', classId)
      .in('student_id', studentIds)

    if (fetchError) throw fetchError

    const existingMap = new Map((existing || []).map(e => [e.student_id, e]))

    const toInsert = studentIds.filter(id => !existingMap.has(id))
    const toReactivate = studentIds
      .filter(id => existingMap.has(id) && existingMap.get(id)!.status !== 'active')
      .map(id => existingMap.get(id)!.id)

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('class_enrollments')
        .insert(toInsert.map(studentId => ({
          tenant_id: tenantId,
          class_id: classId,
          student_id: studentId,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        })))
      if (error) throw error
    }

    if (toReactivate.length > 0) {
      const { error } = await supabase
        .from('class_enrollments')
        .update({
          status: 'active',
          withdrawn_at: null,
          updated_at: new Date().toISOString(),
        })
        .in('id', toReactivate)
      if (error) throw error
    }

    revalidatePath(`/classes/${classId}`)
    revalidatePath('/classes')
    revalidateTag(`attendance-roster:${tenantId}`)

    return { success: true as const, data: null, error: null }
  } catch (error) {
    console.error('[enrollStudentsInClass] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

/**
 * Withdraw a student from a class
 *
 * @param classId - Class ID
 * @param studentId - Student to withdraw
 * @returns Success or error
 */
export async function withdrawStudentFromClass(classId: string, studentId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('class_enrollments')
      .update({
        status: 'withdrawn',
        withdrawn_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('class_id', classId)
      .eq('student_id', studentId)
      .eq('status', 'active')

    if (error) throw error

    revalidatePath(`/classes/${classId}`)
    revalidatePath('/classes')
    revalidateTag(`attendance-roster:${tenantId}`)

    return { success: true as const, data: null, error: null }
  } catch (error) {
    console.error('[withdrawStudentFromClass] Error:', error)
    return { success: false as const, data: null, error: getErrorMessage(error) }
  }
}

/**
 * Delete a class (soft delete)
 *
 * @param classId - Class ID
 * @returns Success status or error
 */
export async function deleteClass(classId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = createServiceRoleClient()

    // 3. Soft delete class
    const { error } = await supabase
      .from('classes')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', classId)
      .eq('tenant_id', tenantId)

    if (error) throw error

    // 4. Revalidate pages
    revalidatePath('/classes')

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[deleteClass] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
