/**
 * Class Server Actions
 *
 * 모든 클래스 관련 작업은 이 Server Action을 통해 service_role로 실행됩니다.
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

    // 4. For each class, get student count from enrollments
    const classesWithDetails = await Promise.all(
      (classesData || []).map(async (classItem) => {
        const { count, error: countError } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classItem.id)
          .eq('status', 'active')

        if (countError) {
          console.error('[getClassesWithDetails] Error counting students:', countError)
        }

        return {
          id: classItem.id,
          name: classItem.name,
          description: classItem.description,
          subject: classItem.subject,
          gradeLevel: classItem.grade_level,
          instructorName: (classItem.users as { name: string } | null)?.name || null,
          studentCount: count || 0,
          schedule: classItem.schedule,
          room: classItem.room,
          status: classItem.status,
          active: classItem.active,
          createdAt: classItem.created_at,
        } as ClassWithDetails
      })
    )

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
    const updateData: Record<string, any> = {
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
      .select('id, name, subject, active')
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
