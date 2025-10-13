/**
 * TODO Repository
 *
 * 학생 TODO 데이터 접근 레이어 - 순수 CRUD 작업만 수행
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError, NotFoundError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

// ==================== Types ====================

export interface StudentTodo {
  id: string
  tenant_id: string
  student_id: string
  title: string
  description: string | null
  subject: string | null
  due_date: string
  due_day_of_week: number
  priority: 'low' | 'normal' | 'high' | 'urgent'
  completed_at: string | null
  verified_at: string | null
  verified_by: string | null
  created_at: string
  updated_at: string
}

export interface StudentTodoWithStudent extends StudentTodo {
  students: {
    student_code: string
    users: {
      name: string
    } | null
  } | null
}

export interface TodoFilters {
  studentId?: string
  status?: 'pending' | 'completed' | 'verified'
  priority?: string
  subject?: string
  dueDateFrom?: string
  dueDateTo?: string
}

// ==================== Repository ====================

export class TodoRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * TODO ID로 조회
   */
  async findById(todoId: string): Promise<StudentTodo | null> {
    try {
      const { data, error } = await this.supabase
        .from('student_todos')
        .select('*')
        .eq('id', todoId)
        .maybeSingle()

      if (error) {
        logError(error, {
          repository: 'TodoRepository',
          method: 'findById',
          todoId
        })
        throw new DatabaseError('TODO를 조회할 수 없습니다', error)
      }

      return data as StudentTodo | null
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'findById' })
      throw new DatabaseError('TODO를 조회할 수 없습니다')
    }
  }

  /**
   * TODO ID로 조회 (NotFound 에러 발생)
   */
  async findByIdOrThrow(todoId: string): Promise<StudentTodo> {
    const todo = await this.findById(todoId)

    if (!todo) {
      throw new NotFoundError('TODO')
    }

    return todo
  }

  /**
   * 전체 TODO 목록 조회 (필터 적용 가능)
   */
  async findAll(filters?: TodoFilters, limit: number = 100): Promise<StudentTodoWithStudent[]> {
    try {
      let query = this.supabase
        .from('student_todos')
        .select(`
          *,
          students (
            student_code,
            users (
              name
            )
          )
        `)
        .order('due_date', { ascending: false })
        .limit(limit)

      // 필터 적용
      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId)
      }

      if (filters?.status === 'pending') {
        query = query.is('completed_at', null)
      } else if (filters?.status === 'completed') {
        query = query.not('completed_at', 'is', null).is('verified_at', null)
      } else if (filters?.status === 'verified') {
        query = query.not('verified_at', 'is', null)
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }

      if (filters?.subject) {
        query = query.eq('subject', filters.subject)
      }

      if (filters?.dueDateFrom) {
        query = query.gte('due_date', filters.dueDateFrom)
      }

      if (filters?.dueDateTo) {
        query = query.lte('due_date', filters.dueDateTo)
      }

      const { data, error } = await query

      if (error) {
        logError(error, {
          repository: 'TodoRepository',
          method: 'findAll',
          filters
        })
        throw new DatabaseError('TODO 목록을 조회할 수 없습니다', error)
      }

      return (data || []) as StudentTodoWithStudent[]
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'findAll' })
      throw new DatabaseError('TODO 목록을 조회할 수 없습니다')
    }
  }

  /**
   * 학생별 TODO 목록 조회
   */
  async findByStudent(studentId: string, includeCompleted: boolean = true): Promise<StudentTodo[]> {
    try {
      let query = this.supabase
        .from('student_todos')
        .select('*')
        .eq('student_id', studentId)
        .order('due_date', { ascending: true, nullsFirst: false })

      if (!includeCompleted) {
        query = query.is('completed_at', null)
      }

      const { data, error } = await query

      if (error) {
        logError(error, {
          repository: 'TodoRepository',
          method: 'findByStudent',
          studentId
        })
        throw new DatabaseError('학생 TODO를 조회할 수 없습니다', error)
      }

      return (data || []) as StudentTodo[]
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'findByStudent' })
      throw new DatabaseError('학생 TODO를 조회할 수 없습니다')
    }
  }

  /**
   * TODO 생성 (단일)
   */
  async create(data: {
    tenant_id: string
    student_id: string
    title: string
    description?: string
    subject?: string
    due_date: string
    priority: string
  }): Promise<StudentTodo> {
    try {
      const dueDate = new Date(data.due_date)
      const dayOfWeek = dueDate.getDay()

      const { data: todo, error } = await this.supabase
        .from('student_todos')
        .insert({
          tenant_id: data.tenant_id,
          student_id: data.student_id,
          title: data.title,
          description: data.description || null,
          subject: data.subject || null,
          due_date: data.due_date,
          due_day_of_week: dayOfWeek,
          priority: data.priority,
        })
        .select()
        .single()

      if (error) {
        logError(error, {
          repository: 'TodoRepository',
          method: 'create',
          data
        })
        throw new DatabaseError('TODO를 생성할 수 없습니다', error)
      }

      return todo as StudentTodo
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'create' })
      throw new DatabaseError('TODO를 생성할 수 없습니다')
    }
  }

  /**
   * TODO 일괄 생성
   */
  async createBulk(todos: Array<{
    tenant_id: string
    student_id: string
    title: string
    description?: string
    subject?: string
    due_date: string
    priority: string
  }>): Promise<StudentTodo[]> {
    try {
      const todosWithDayOfWeek = todos.map(todo => ({
        tenant_id: todo.tenant_id,
        student_id: todo.student_id,
        title: todo.title,
        description: todo.description || null,
        subject: todo.subject || null,
        due_date: todo.due_date,
        due_day_of_week: new Date(todo.due_date).getDay(),
        priority: todo.priority,
      }))

      const { data, error } = await this.supabase
        .from('student_todos')
        .insert(todosWithDayOfWeek)
        .select()

      if (error) {
        logError(error, {
          repository: 'TodoRepository',
          method: 'createBulk',
          count: todos.length
        })
        throw new DatabaseError('TODO를 일괄 생성할 수 없습니다', error)
      }

      return (data || []) as StudentTodo[]
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'createBulk' })
      throw new DatabaseError('TODO를 일괄 생성할 수 없습니다')
    }
  }

  /**
   * TODO 업데이트
   */
  async update(
    todoId: string,
    updates: Partial<Omit<StudentTodo, 'id' | 'tenant_id' | 'student_id' | 'created_at'>>
  ): Promise<StudentTodo> {
    try {
      const { data, error } = await this.supabase
        .from('student_todos')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', todoId)
        .select()
        .single()

      if (error) {
        logError(error, {
          repository: 'TodoRepository',
          method: 'update',
          todoId,
          updates
        })
        throw new DatabaseError('TODO를 수정할 수 없습니다', error)
      }

      return data as StudentTodo
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'update' })
      throw new DatabaseError('TODO를 수정할 수 없습니다')
    }
  }

  /**
   * TODO 완료 처리
   */
  async complete(todoId: string): Promise<StudentTodo> {
    return this.update(todoId, {
      completed_at: new Date().toISOString()
    })
  }

  /**
   * TODO 검증 처리
   */
  async verify(todoId: string, verifiedBy: string): Promise<StudentTodo> {
    return this.update(todoId, {
      verified_at: new Date().toISOString(),
      verified_by: verifiedBy
    })
  }

  /**
   * TODO 삭제
   */
  async delete(todoId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('student_todos')
        .delete()
        .eq('id', todoId)

      if (error) {
        logError(error, {
          repository: 'TodoRepository',
          method: 'delete',
          todoId
        })
        throw new DatabaseError('TODO를 삭제할 수 없습니다', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'delete' })
      throw new DatabaseError('TODO를 삭제할 수 없습니다')
    }
  }

  /**
   * TODO 통계 조회
   */
  async getStats(filters?: { studentId?: string }): Promise<{
    total: number
    pending: number
    completed: number
    verified: number
  }> {
    try {
      let query = this.supabase
        .from('student_todos')
        .select('completed_at, verified_at')

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId)
      }

      const { data, error } = await query

      if (error) {
        logError(error, {
          repository: 'TodoRepository',
          method: 'getStats',
          filters
        })
        throw new DatabaseError('TODO 통계를 조회할 수 없습니다', error)
      }

      const todos = data || []

      return {
        total: todos.length,
        pending: todos.filter(t => !t.completed_at).length,
        completed: todos.filter(t => t.completed_at && !t.verified_at).length,
        verified: todos.filter(t => t.verified_at).length,
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'getStats' })
      return { total: 0, pending: 0, completed: 0, verified: 0 }
    }
  }
}

// ==================== Factory Functions ====================

/**
 * Client-side용 Repository 생성 (Supabase client 전달 필요)
 */
export function createClientTodoRepository(supabase: SupabaseClient): TodoRepository {
  return new TodoRepository(supabase)
}
