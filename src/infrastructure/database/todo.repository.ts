/**
 * Todo Repository Implementation
 * TODO 리포지토리 구현 - 인프라 레이어
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@/domain/data-sources/IDataSource'
import type { ITodoRepository, TodoFilters, TodoStats, TodoWithStudent } from '@/domain/repositories/ITodoRepository'
import { Todo } from '@/domain/entities/Todo'
import { Priority } from '@/domain/value-objects/Priority'
import { DatabaseError, NotFoundError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'
import { SupabaseDataSource } from '../data-sources/SupabaseDataSource'

export class TodoRepository implements ITodoRepository {
  private dataSource: IDataSource

  constructor(client: IDataSource | SupabaseClient) {
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function' && typeof client.rpc === 'function'
  }

  async findById(id: string): Promise<Todo | null> {
    try {
      const { data, error } = await this.dataSource
        .from('student_todos')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'findById', id })
        throw new DatabaseError('TODO를 조회할 수 없습니다', error)
      }

      return data ? this.mapToDomain(data) : null
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'findById' })
      throw new DatabaseError('TODO를 조회할 수 없습니다')
    }
  }

  async findByIdOrThrow(id: string): Promise<Todo> {
    const todo = await this.findById(id)
    if (!todo) {
      throw new NotFoundError('TODO')
    }
    return todo
  }

  async findByStudentId(studentId: string, includeCompleted: boolean = true): Promise<Todo[]> {
    try {
      let query = this.dataSource
        .from('student_todos')
        .select('*')
        .eq('student_id', studentId)
        .order('due_date', { ascending: true })

      if (!includeCompleted) {
        query = query.is('completed_at', null)
      }

      const { data, error } = await query

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'findByStudentId' })
        throw new DatabaseError('학생 TODO를 조회할 수 없습니다', error)
      }

      return (data as any[] || []).map((row: any) => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'findByStudentId' })
      throw new DatabaseError('학생 TODO를 조회할 수 없습니다')
    }
  }

  async findByStudentIdForDate(studentId: string, date: string): Promise<Todo[]> {
    try {
      const { data, error } = await this.dataSource
        .from('student_todos')
        .select('*')
        .eq('student_id', studentId)
        .eq('due_date', date)
        .order('created_at', { ascending: true })

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'findByStudentIdForDate' })
        throw new DatabaseError('학생 TODO를 조회할 수 없습니다', error)
      }

      return (data as any[] || []).map((row: any) => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'findByStudentIdForDate' })
      throw new DatabaseError('학생 TODO를 조회할 수 없습니다')
    }
  }

  async findAll(tenantId: string, filters?: TodoFilters, limit: number = 100): Promise<Todo[]> {
    try {
      let query = this.dataSource
        .from('student_todos')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: false })
        .limit(limit)

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
        query = query.gte('due_date', filters.dueDateFrom.toISOString().split('T')[0])
      }

      if (filters?.dueDateTo) {
        query = query.lte('due_date', filters.dueDateTo.toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'findAll' })
        throw new DatabaseError('TODO 목록을 조회할 수 없습니다', error)
      }

      return (data as any[] || []).map((row: any) => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'findAll' })
      throw new DatabaseError('TODO 목록을 조회할 수 없습니다')
    }
  }

  async findAllWithStudent(tenantId: string, filters?: TodoFilters, limit: number = 100): Promise<TodoWithStudent[]> {
    try {
      // Note: IDataSource는 조인 조회를 직접 지원하지 않으므로
      // SupabaseDataSource의 경우 내부 client를 사용해야 함
      // 이는 Infrastructure layer의 구현 세부사항
      const client = (this.dataSource as any).client as SupabaseClient

      if (!client) {
        throw new DatabaseError('Supabase client를 사용할 수 없습니다')
      }

      let query = client
        .from('student_todos')
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
        .order('due_date', { ascending: false })
        .limit(limit)

      // Apply filters (same as findAll)
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
        query = query.gte('due_date', filters.dueDateFrom.toISOString().split('T')[0])
      }

      if (filters?.dueDateTo) {
        query = query.lte('due_date', filters.dueDateTo.toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'findAllWithStudent' })
        throw new DatabaseError('TODO 목록을 조회할 수 없습니다', error)
      }

      return (data as any[] || []).map((row: any) => ({
        todo: this.mapToDomain(row),
        student: {
          id: row.students.id,
          studentCode: row.students.student_code,
          name: Array.isArray(row.students.users)
            ? row.students.users[0]?.name || 'Unknown'
            : row.students.users?.name || 'Unknown',
        },
      }))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'findAllWithStudent' })
      throw new DatabaseError('TODO 목록을 조회할 수 없습니다')
    }
  }

  async findUpcoming(studentId: string, days: number = 3): Promise<Todo[]> {
    try {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + days)

      const { data, error } = await this.dataSource
        .from('student_todos')
        .select('*')
        .eq('student_id', studentId)
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', futureDate.toISOString().split('T')[0])
        .is('completed_at', null)
        .order('due_date', { ascending: true })

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'findUpcoming' })
        throw new DatabaseError('임박한 TODO를 조회할 수 없습니다', error)
      }

      return (data as any[] || []).map((row: any) => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'findUpcoming' })
      throw new DatabaseError('임박한 TODO를 조회할 수 없습니다')
    }
  }

  async findOverdue(studentId: string): Promise<Todo[]> {
    try {
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await this.dataSource
        .from('student_todos')
        .select('*')
        .eq('student_id', studentId)
        .lt('due_date', today)
        .is('completed_at', null)
        .order('due_date', { ascending: true })

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'findOverdue' })
        throw new DatabaseError('연체 TODO를 조회할 수 없습니다', error)
      }

      return (data as any[] || []).map((row: any) => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'findOverdue' })
      throw new DatabaseError('연체 TODO를 조회할 수 없습니다')
    }
  }

  async save(todo: Todo): Promise<Todo> {
    try {
      const data = todo.toPersistence()

      const { data: savedData, error } = await this.dataSource
        .from('student_todos')
        .upsert(data)
        .select()
        .single()

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'save' })
        throw new DatabaseError('TODO를 저장할 수 없습니다', error)
      }

      return this.mapToDomain(savedData)
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'save' })
      throw new DatabaseError('TODO를 저장할 수 없습니다')
    }
  }

  async saveBulk(todos: Todo[]): Promise<Todo[]> {
    try {
      const data = todos.map(todo => todo.toPersistence())

      const { data: savedData, error } = await this.dataSource
        .from('student_todos')
        .upsert(data)
        .select()

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'saveBulk' })
        throw new DatabaseError('TODO를 일괄 저장할 수 없습니다', error)
      }

      return (savedData as any[] || []).map((row: any) => this.mapToDomain(row))
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'saveBulk' })
      throw new DatabaseError('TODO를 일괄 저장할 수 없습니다')
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.dataSource
        .from('student_todos')
        .delete()
        .eq('id', id)

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'delete', id })
        throw new DatabaseError('TODO를 삭제할 수 없습니다', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'delete' })
      throw new DatabaseError('TODO를 삭제할 수 없습니다')
    }
  }

  async getStats(filters?: { studentId?: string; tenantId?: string }): Promise<TodoStats> {
    try {
      let query = this.dataSource
        .from('student_todos')
        .select('completed_at, verified_at, due_date')

      if (filters?.studentId) {
        query = query.eq('student_id', filters.studentId)
      }

      if (filters?.tenantId) {
        query = query.eq('tenant_id', filters.tenantId)
      }

      const { data, error } = await query

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'getStats' })
        throw new DatabaseError('TODO 통계를 조회할 수 없습니다', error)
      }

      const todos = (data as any[] || [])
      const today = new Date().toISOString().split('T')[0]

      return {
        total: todos.length,
        pending: todos.filter((t: any) => !t.completed_at).length,
        completed: todos.filter((t: any) => t.completed_at && !t.verified_at).length,
        verified: todos.filter((t: any) => t.verified_at).length,
        overdue: todos.filter((t: any) => !t.completed_at && t.due_date < today).length,
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'getStats' })
      return { total: 0, pending: 0, completed: 0, verified: 0, overdue: 0 }
    }
  }

  async getCompletionRate(studentId: string, dateFrom?: Date, dateTo?: Date): Promise<number> {
    try {
      let query = this.dataSource
        .from('student_todos')
        .select('completed_at')
        .eq('student_id', studentId)

      if (dateFrom) {
        query = query.gte('due_date', dateFrom.toISOString().split('T')[0])
      }

      if (dateTo) {
        query = query.lte('due_date', dateTo.toISOString().split('T')[0])
      }

      const { data, error } = await query

      if (error) {
        logError(error, { repository: 'TodoRepository', method: 'getCompletionRate' })
        throw new DatabaseError('완료율을 조회할 수 없습니다', error)
      }

      const todos = (data as any[] || [])
      if (todos.length === 0) return 0

      const completedCount = todos.filter((t: any) => t.completed_at).length
      return Math.round((completedCount / todos.length) * 100)
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'TodoRepository', method: 'getCompletionRate' })
      return 0
    }
  }

  /**
   * Database row를 Domain Entity로 변환
   */
  private mapToDomain(row: Record<string, unknown>): Todo {
    return Todo.fromDatabase({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      studentId: row.student_id as string,
      title: row.title as string,
      description: row.description as string | null,
      subject: row.subject as string | null,
      dueDate: new Date(row.due_date as string),
      dueDayOfWeek: row.due_day_of_week as number,
      priority: Priority.fromString(row.priority as string),
      estimatedDurationMinutes: row.estimated_duration_minutes as number | null,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
      verifiedAt: row.verified_at ? new Date(row.verified_at as string) : null,
      verifiedBy: row.verified_by as string | null,
      notes: row.notes as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : null,
    })
  }
}
