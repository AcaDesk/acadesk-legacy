/**
 * Get Student Todos For Today Use Case
 * 학생의 오늘 TODO 조회 유스케이스 - Application Layer
 */

import type { ITodoRepository } from '@core/domain/repositories/ITodoRepository'
import type { Todo } from '@core/domain/entities/Todo'
import { DatabaseError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

export interface TodoDTO {
  id: string
  title: string
  subject: string | null
  dueDate: string | null
  priority: string
  completedAt: string | null
  verifiedAt: string | null
  notes: string | null
  description: string | null
  estimatedDurationMinutes: number | null
}

export interface TodosResult {
  success: boolean
  todos?: TodoDTO[]
  error?: string
}

export class GetStudentTodosForTodayUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  async execute(studentId: string, tenantId: string, date?: string): Promise<TodosResult> {
    try {
      // 날짜가 지정되지 않으면 오늘 날짜 사용
      const targetDate = date || new Date().toISOString().split('T')[0]

      // TODO 조회
      const todos = await this.todoRepository.findByStudentIdForDate(
        studentId,
        tenantId,
        targetDate
      )

      // TodoDTO로 변환
      const todoDTOs: TodoDTO[] = todos.map((todo: Todo) => ({
        id: todo.id,
        title: todo.title,
        subject: todo.subject,
        dueDate: todo.dueDate ? todo.dueDate.toISOString().split('T')[0] : null,
        priority: todo.priority.getValue(),
        completedAt: todo.completedAt ? todo.completedAt.toISOString() : null,
        verifiedAt: todo.verifiedAt ? todo.verifiedAt.toISOString() : null,
        notes: todo.notes,
        description: todo.description,
        estimatedDurationMinutes: todo.estimatedDurationMinutes,
      }))

      return {
        success: true,
        todos: todoDTOs,
      }
    } catch (error) {
      logError(error, {
        useCase: 'GetStudentTodosForTodayUseCase',
        method: 'execute',
        studentId,
        date,
      })

      if (error instanceof DatabaseError) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: false,
        error: 'TODO를 불러오는 중 오류가 발생했습니다.',
      }
    }
  }
}
