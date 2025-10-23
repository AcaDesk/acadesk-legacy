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
import { SupabaseDataSource } from '@infra/db/datasource/SupabaseDataSource'
import { TodoRepository } from '@infra/db/repositories/todo.repository'
import { CreateTodosForStudentsUseCase } from '@core/application/use-cases/todo/CreateTodosForStudentsUseCase'
import { VerifyTodosUseCase } from '@core/application/use-cases/todo/VerifyTodosUseCase'
import { RejectTodoUseCase } from '@core/application/use-cases/todo/RejectTodoUseCase'
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
    const { tenantId, userId } = await verifyStaff()

    // 2. Validate input
    const validated = createTodosForStudentsSchema.parse(input)

    // 3. Create service_role client and repository
    const serviceClient = createServiceRoleClient()
    const dataSource = new SupabaseDataSource(serviceClient)
    const todoRepository = new TodoRepository(dataSource)

    // 4. Create Use Case with service_role repository
    const useCase = new CreateTodosForStudentsUseCase(todoRepository)

    // 5. Execute Use Case
    const result = await useCase.execute({
      tenantId,
      studentIds: validated.studentIds,
      title: validated.title,
      description: validated.description,
      subject: validated.subject,
      dueDate: new Date(validated.dueDate),
      priority: validated.priority,
      estimatedDurationMinutes: validated.estimatedDurationMinutes,
    })

    if (result.error) {
      throw result.error
    }

    // 6. Revalidate pages
    revalidatePath('/todos/planner')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        todoCount: result.todoCount,
        todoIds: result.todoIds,
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

    // 3. Create service_role client and repository
    const serviceClient = createServiceRoleClient()
    const dataSource = new SupabaseDataSource(serviceClient)
    const todoRepository = new TodoRepository(dataSource)

    // 4. Create Use Case with service_role repository
    const useCase = new VerifyTodosUseCase(todoRepository)

    // 5. Execute Use Case
    const result = await useCase.execute({
      todoIds: validated.todoIds,
      verifiedBy: userId,
      tenantId,
    })

    if (result.error) {
      throw result.error
    }

    // 6. Revalidate pages
    revalidatePath('/todos/verify')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        verifiedCount: result.verifiedCount,
        verifiedTodoIds: result.verifiedTodoIds,
        failedTodoIds: result.failedTodoIds,
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

    // 3. Create service_role client and repository
    const serviceClient = createServiceRoleClient()
    const dataSource = new SupabaseDataSource(serviceClient)
    const todoRepository = new TodoRepository(dataSource)

    // 4. Create Use Case with service_role repository
    const useCase = new RejectTodoUseCase(todoRepository)

    // 5. Execute Use Case
    const rejectedTodo = await useCase.execute({
      todoId: validated.todoId,
      rejectedBy: userId,
      rejectionReason: validated.rejectionReason,
      tenantId,
    })

    // 6. Revalidate pages
    revalidatePath('/todos/verify')
    revalidatePath('/dashboard')

    return {
      success: true,
      data: {
        todo: rejectedTodo.toDTO(),
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

    // 2. Create service_role client and repository
    const serviceClient = createServiceRoleClient()
    const dataSource = new SupabaseDataSource(serviceClient)
    const todoRepository = new TodoRepository(dataSource)

    // 3. Verify TODO belongs to tenant and delete
    const existingTodo = await todoRepository.findById(todoId, tenantId)
    if (!existingTodo) {
      return {
        success: false,
        error: 'TODO를 찾을 수 없습니다',
      }
    }

    // 4. Delete with service_role
    await todoRepository.delete(todoId, tenantId)

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
