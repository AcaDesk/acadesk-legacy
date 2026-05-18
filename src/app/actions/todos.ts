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
import { createNotification } from '@/lib/notification-helpers'

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
    const supabase = createServiceRoleClient()

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
    const supabase = createServiceRoleClient()

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
    const supabase = createServiceRoleClient()

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

    // TODO 검증 알림 발송 (fire-and-forget)
    if (eligibleTodoIds.length > 0) {
      void createNotification({
        supabase,
        tenantId,
        actorUserId: userId,
        type: 'todo_verified',
        title: 'TODO 검증 완료',
        message: `${eligibleTodoIds.length}개의 TODO가 검증 처리되었습니다.`,
        referenceType: 'todo',
        referenceId: null,
        actionUrl: '/todos/verify',
      })
    }

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
    const supabase = createServiceRoleClient()

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
    const supabase = createServiceRoleClient()

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
    const supabase = createServiceRoleClient()

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
    const supabase = createServiceRoleClient()

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

// ============================================================================
// Todo Stats (used by /todos/stats page)
// ============================================================================

export type TodoStatsPeriod = 'week' | 'month' | 'all'

export interface TodoOverallStats {
  totalTodos: number
  completedTodos: number
  verifiedTodos: number
  pendingVerification: number
  averageCompletionTime: number
  completionRate: number
}

export interface TodoStudentStats {
  studentId: string
  studentName: string
  studentCode: string
  totalTodos: number
  completedTodos: number
  verifiedTodos: number
  completionRate: number
}

export interface TodoSubjectStats {
  subject: string
  totalTodos: number
  completedTodos: number
  completionRate: number
}

function periodToDateFilter(period: TodoStatsPeriod): string | null {
  const today = new Date()
  if (period === 'week') {
    const d = new Date(today)
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }
  if (period === 'month') {
    const d = new Date(today)
    d.setMonth(d.getMonth() - 1)
    return d.toISOString()
  }
  return null
}

/**
 * /todos/stats 페이지가 필요로 하는 통계 3종을 한 번에 반환
 *
 * RLS 활성화 이후 page.tsx (cookie client) + todo-stats-content.tsx (browser client)
 * 양쪽의 student_todos 쿼리가 모두 차단되던 버그를 해결합니다.
 */
export async function getTodoStats(period: TodoStatsPeriod = 'week'): Promise<{
  success: boolean
  data: {
    overallStats: TodoOverallStats
    studentStats: TodoStudentStats[]
    subjectStats: TodoSubjectStats[]
  }
  error: string | null
}> {
  const fallback = {
    overallStats: {
      totalTodos: 0,
      completedTodos: 0,
      verifiedTodos: 0,
      pendingVerification: 0,
      averageCompletionTime: 0,
      completionRate: 0,
    },
    studentStats: [],
    subjectStats: [],
  }

  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const dateFilter = periodToDateFilter(period)

    // Overall
    let overallQuery = supabase
      .from('student_todos')
      .select('id, completed_at, verified_at, created_at')
      .eq('tenant_id', tenantId)
    if (dateFilter) overallQuery = overallQuery.gte('created_at', dateFilter)

    // Student (joined)
    let studentQuery = supabase
      .from('student_todos')
      .select(`
        id,
        completed_at,
        verified_at,
        student_id,
        students!inner (
          student_code,
          user_id ( name )
        )
      `)
      .eq('tenant_id', tenantId)
    if (dateFilter) studentQuery = studentQuery.gte('created_at', dateFilter)

    // Subject
    let subjectQuery = supabase
      .from('student_todos')
      .select('id, subject, completed_at')
      .eq('tenant_id', tenantId)
      .not('subject', 'is', null)
    if (dateFilter) subjectQuery = subjectQuery.gte('created_at', dateFilter)

    const [
      { data: overallData, error: overallError },
      { data: studentData, error: studentError },
      { data: subjectData, error: subjectError },
    ] = await Promise.all([overallQuery, studentQuery, subjectQuery])

    if (overallError) throw overallError
    if (studentError) throw studentError
    if (subjectError) throw subjectError

    // Overall aggregation
    const totalTodos = overallData?.length || 0
    const completedTodos = overallData?.filter((t) => t.completed_at).length || 0
    const verifiedTodos = overallData?.filter((t) => t.verified_at).length || 0
    const pendingVerification =
      overallData?.filter((t) => t.completed_at && !t.verified_at).length || 0

    const completedWithTimes = overallData?.filter((t) => t.completed_at && t.created_at) || []
    const totalCompletionTime = completedWithTimes.reduce((sum, todo) => {
      const created = new Date(todo.created_at).getTime()
      const completed = new Date(todo.completed_at!).getTime()
      return sum + (completed - created)
    }, 0)
    const averageCompletionTime =
      completedWithTimes.length > 0
        ? totalCompletionTime / completedWithTimes.length / (1000 * 60 * 60)
        : 0
    const completionRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0

    const overallStats: TodoOverallStats = {
      totalTodos,
      completedTodos,
      verifiedTodos,
      pendingVerification,
      averageCompletionTime,
      completionRate,
    }

    // Student aggregation
    interface StudentTodoRow {
      student_id: string
      students: {
        student_code: string
        user_id: { name: string } | null
      } | null
      completed_at: string | null
      verified_at: string | null
    }

    const studentMap = new Map<string, TodoStudentStats>()
    const studentRows = (studentData || []) as unknown as StudentTodoRow[]
    for (const todo of studentRows) {
      const sid = todo.student_id
      const rel = todo.students
      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          studentId: sid,
          studentName: rel?.user_id?.name || '이름 없음',
          studentCode: rel?.student_code || '',
          totalTodos: 0,
          completedTodos: 0,
          verifiedTodos: 0,
          completionRate: 0,
        })
      }
      const stats = studentMap.get(sid)!
      stats.totalTodos++
      if (todo.completed_at) stats.completedTodos++
      if (todo.verified_at) stats.verifiedTodos++
    }
    const studentStats: TodoStudentStats[] = Array.from(studentMap.values())
      .map((s) => ({
        ...s,
        completionRate: s.totalTodos > 0 ? (s.completedTodos / s.totalTodos) * 100 : 0,
      }))
      .sort((a, b) => b.completionRate - a.completionRate)

    // Subject aggregation
    const subjectMap = new Map<string, TodoSubjectStats>()
    for (const todo of subjectData || []) {
      const subject = todo.subject!
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { subject, totalTodos: 0, completedTodos: 0, completionRate: 0 })
      }
      const stats = subjectMap.get(subject)!
      stats.totalTodos++
      if (todo.completed_at) stats.completedTodos++
    }
    const subjectStats: TodoSubjectStats[] = Array.from(subjectMap.values())
      .map((s) => ({
        ...s,
        completionRate: s.totalTodos > 0 ? (s.completedTodos / s.totalTodos) * 100 : 0,
      }))
      .sort((a, b) => b.totalTodos - a.totalTodos)

    return {
      success: true,
      data: { overallStats, studentStats, subjectStats },
      error: null,
    }
  } catch (error) {
    console.error('[getTodoStats] Error:', error)
    return {
      success: false,
      data: fallback,
      error: getErrorMessage(error),
    }
  }
}
