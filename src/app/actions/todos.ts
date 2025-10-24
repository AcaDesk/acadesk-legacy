/**
 * TODO Management Server Actions
 *
 * TODO 플래너 및 검증 기능의 모든 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
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

const createTodosForStudentsSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, '최소 한 명의 학생을 선택해야 합니다'),
  title: z.string().min(1, 'TODO 제목은 필수입니다'),
  description: z.string().optional(),
  subject: z.string().optional(),
  dueDate: z.string(), // ISO date string
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  estimatedDurationMinutes: z.number().int().positive().optional(),
})

const verifyTodosSchema = z.object({
  todoIds: z.array(z.string().uuid()).min(1, '검증할 TODO를 선택해야 합니다'),
})

const rejectTodoSchema = z.object({
  todoId: z.string().uuid(),
  rejectionReason: z.string().min(1, '피드백은 필수입니다'),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get all TODOs with student information
 *
 * @returns TODO list with student info or error
 */
export async function getTodosWithStudent() {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = await createServiceRoleClient()

    // 3. Query TODOs with student info
    const { data, error } = await supabase
      .from('todos')
      .select(`
        *,
        students!inner (
          id,
          student_code,
          users!inner (
            name
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (error) {
      console.error('[getTodosWithStudent] Query error:', error)
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getTodosWithStudent] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create TODOs for multiple students (Weekly Planner)
 *
 * @param input - TODO data and student IDs
 * @returns Created TODO count or error
 */
export async function createTodosForStudents(
  input: z.infer<typeof createTodosForStudentsSchema>
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Validate input
    const validated = createTodosForStudentsSchema.parse(input)

    // 3. Create service_role client
    const supabase = await createServiceRoleClient()

    // 4. Create TODOs for each student
    const todoRecords = validated.studentIds.map((studentId) => ({
      tenant_id: tenantId,
      student_id: studentId,
      title: validated.title.trim(),
      description: validated.description?.trim() || null,
      subject: validated.subject?.trim() || null,
      due_date: validated.dueDate,
      priority: validated.priority,
      estimated_duration_minutes: validated.estimatedDurationMinutes || null,
      completed_at: null,
      verified_at: null,
      notes: null,
    }))

    // 5. Bulk insert
    const { data: createdTodos, error: insertError } = await supabase
      .from('todos')
      .insert(todoRecords)
      .select('id')

    if (insertError) {
      throw insertError
    }

    // 6. Revalidate pages
    revalidatePath('/todos/planner')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        todoCount: createdTodos?.length || 0,
        todoIds: createdTodos?.map((t) => t.id) || [],
      },
      error: null,
    }
  } catch (error) {
    console.error('[createTodosForStudents] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Verify multiple TODOs (bulk verification)
 *
 * @param input - TODO IDs to verify
 * @returns Verified count or error
 */
export async function verifyTodos(input: z.infer<typeof verifyTodosSchema>) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId, userId } = await verifyStaff()

    // 2. Validate input
    const validated = verifyTodosSchema.parse(input)

    // 3. Create service_role client
    const supabase = await createServiceRoleClient()

    // 4. Fetch TODOs to verify eligibility
    const { data: todos, error: fetchError } = await supabase
      .from('student_todos')
      .select('id, completed_at, verified_at')
      .in('id', validated.todoIds)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (fetchError) {
      throw fetchError
    }

    // 5. Filter eligible TODOs (completed but not verified)
    const eligibleTodoIds: string[] = []
    const failedTodoIds: { id: string; reason: string }[] = []

    validated.todoIds.forEach((todoId) => {
      const todo = todos?.find((t) => t.id === todoId)

      if (!todo) {
        failedTodoIds.push({ id: todoId, reason: 'TODO를 찾을 수 없습니다' })
      } else if (!todo.completed_at) {
        failedTodoIds.push({ id: todoId, reason: '완료되지 않은 TODO는 검증할 수 없습니다' })
      } else if (todo.verified_at) {
        failedTodoIds.push({ id: todoId, reason: '이미 검증된 TODO입니다' })
      } else {
        eligibleTodoIds.push(todoId)
      }
    })

    // 6. Bulk update eligible TODOs
    if (eligibleTodoIds.length > 0) {
      const { error: updateError } = await supabase
        .from('student_todos')
        .update({
          verified_at: new Date().toISOString(),
          verified_by: userId,
          updated_at: new Date().toISOString(),
        })
        .in('id', eligibleTodoIds)

      if (updateError) {
        throw updateError
      }
    }

    // 7. Revalidate pages
    revalidatePath('/todos/verify')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        verifiedCount: eligibleTodoIds.length,
        verifiedTodoIds: eligibleTodoIds,
        failedTodoIds,
      },
      error: null,
    }
  } catch (error) {
    console.error('[verifyTodos] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Reject a TODO with feedback
 *
 * @param input - TODO ID and rejection feedback
 * @returns Success or error
 */
export async function rejectTodo(input: z.infer<typeof rejectTodoSchema>) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId, userId } = await verifyStaff()

    // 2. Validate input
    const validated = rejectTodoSchema.parse(input)

    // 3. Create service_role client
    const supabase = await createServiceRoleClient()

    // 4. Fetch TODO to verify eligibility
    const { data: todo, error: fetchError } = await supabase
      .from('student_todos')
      .select('id, completed_at, verified_at, notes')
      .eq('id', validated.todoId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError || !todo) {
      return {
        success: false,
        data: null,
        error: 'TODO를 찾을 수 없습니다',
      }
    }

    // 5. Validate state
    if (!todo.completed_at) {
      return {
        success: false,
        data: null,
        error: '완료되지 않은 TODO는 반려할 수 없습니다',
      }
    }

    if (todo.verified_at) {
      return {
        success: false,
        data: null,
        error: '이미 검증된 TODO는 반려할 수 없습니다',
      }
    }

    // 6. Build rejection note
    const rejectionNote = validated.rejectionReason
      ? `[반려 사유] ${validated.rejectionReason} (반려자: ${userId}, 반려일: ${new Date().toISOString()})`
      : `[반려됨] 다시 완료해주세요 (반려자: ${userId}, 반려일: ${new Date().toISOString()})`

    // 7. Update TODO: uncomplete and add rejection note
    const { data: updatedTodo, error: updateError } = await supabase
      .from('student_todos')
      .update({
        completed_at: null,
        notes: rejectionNote,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.todoId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // 8. Revalidate pages
    revalidatePath('/todos/verify')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        todo: updatedTodo,
      },
      error: null,
    }
  } catch (error) {
    console.error('[rejectTodo] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete a TODO (soft delete)
 *
 * @param todoId - TODO ID
 * @returns Success or error
 */
export async function deleteTodo(todoId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const supabase = await createServiceRoleClient()

    // 3. Verify TODO exists and belongs to tenant
    const { data: existingTodo, error: fetchError } = await supabase
      .from('student_todos')
      .select('id')
      .eq('id', todoId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError || !existingTodo) {
      return {
        success: false,
        error: 'TODO를 찾을 수 없습니다',
      }
    }

    // 4. Soft delete with service_role
    const { error: deleteError } = await supabase
      .from('student_todos')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', todoId)

    if (deleteError) {
      throw deleteError
    }

    // 5. Revalidate pages
    revalidatePath('/todos/planner')
    revalidatePath('/todos/verify')
    revalidatePath('/dashboard')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[deleteTodo] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update TODO basic information
 *
 * @param todoId - TODO ID
 * @param updates - Fields to update
 * @returns Success or error
 */
export async function updateTodo(
  todoId: string,
  updates: {
    title?: string
    description?: string | null
    subject?: string | null
    dueDate?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    estimatedDurationMinutes?: number | null
  }
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Verify TODO belongs to tenant
    const { data: existingTodo, error: fetchError } = await serviceClient
      .from('student_todos')
      .select('id, tenant_id')
      .eq('id', todoId)
      .maybeSingle()

    if (fetchError || !existingTodo) {
      return {
        success: false,
        error: 'TODO를 찾을 수 없습니다',
      }
    }

    if (existingTodo.tenant_id !== tenantId) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    // 4. Update with service_role
    const { error: updateError } = await serviceClient
      .from('student_todos')
      .update({
        ...updates,
        due_date: updates.dueDate ? updates.dueDate : undefined,
        estimated_duration_minutes: updates.estimatedDurationMinutes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', todoId)

    if (updateError) {
      throw updateError
    }

    // 5. Revalidate pages
    revalidatePath('/todos/planner')
    revalidatePath('/todos/verify')
    revalidatePath('/dashboard')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[updateTodo] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Complete a TODO (mark as done)
 *
 * @param todoId - TODO ID
 * @returns Success or error
 */
export async function completeTodo(todoId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Validate input
    if (!todoId) {
      return {
        success: false,
        error: 'TODO ID는 필수입니다',
      }
    }

    // 3. Create service_role client
    const supabase = await createServiceRoleClient()

    // 4. Fetch TODO to verify state
    const { data: todo, error: fetchError } = await supabase
      .from('student_todos')
      .select('id, completed_at')
      .eq('id', todoId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError || !todo) {
      return {
        success: false,
        data: null,
        error: 'TODO를 찾을 수 없습니다',
      }
    }

    // 5. Check if already completed
    if (todo.completed_at) {
      return {
        success: false,
        data: null,
        error: '이미 완료된 TODO입니다',
      }
    }

    // 6. Update TODO: mark as complete
    const { data: updatedTodo, error: updateError } = await supabase
      .from('student_todos')
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', todoId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // 7. Revalidate pages
    revalidatePath('/todos')
    revalidatePath('/students/[id]', 'page')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        todo: updatedTodo,
      },
      error: null,
    }
  } catch (error) {
    console.error('[completeTodo] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Uncomplete a TODO (mark as not done)
 *
 * @param todoId - TODO ID
 * @returns Success or error
 */
export async function uncompleteTodo(todoId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Validate input
    if (!todoId) {
      return {
        success: false,
        error: 'TODO ID는 필수입니다',
      }
    }

    // 3. Create service_role client
    const supabase = await createServiceRoleClient()

    // 4. Fetch TODO to verify state
    const { data: todo, error: fetchError } = await supabase
      .from('student_todos')
      .select('id, completed_at, verified_at')
      .eq('id', todoId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError || !todo) {
      return {
        success: false,
        data: null,
        error: 'TODO를 찾을 수 없습니다',
      }
    }

    // 5. Check if not completed
    if (!todo.completed_at) {
      return {
        success: false,
        data: null,
        error: '완료되지 않은 TODO입니다',
      }
    }

    // 6. Check if verified
    if (todo.verified_at) {
      return {
        success: false,
        data: null,
        error: '검증된 TODO는 완료 취소할 수 없습니다',
      }
    }

    // 7. Update TODO: mark as incomplete
    const { data: updatedTodo, error: updateError } = await supabase
      .from('student_todos')
      .update({
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', todoId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // 8. Revalidate pages
    revalidatePath('/todos')
    revalidatePath('/students/[id]', 'page')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        todo: updatedTodo,
      },
      error: null,
    }
  } catch (error) {
    console.error('[uncompleteTodo] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
