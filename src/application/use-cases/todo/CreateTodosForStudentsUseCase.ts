/**
 * CreateTodosForStudentsUseCase
 * 여러 학생에게 동일한 TODO 일괄 생성 Use Case
 */

import type { ITodoRepository } from '@/domain/repositories/ITodoRepository'
import { Todo } from '@/domain/entities/Todo'
import { Priority } from '@/domain/value-objects/Priority'

export interface CreateTodosForStudentsInput {
  tenantId: string
  studentIds: string[]
  title: string
  description?: string
  subject?: string
  dueDate: Date
  priority: 'low' | 'normal' | 'high' | 'urgent'
  estimatedDurationMinutes?: number
}

export interface CreateTodosForStudentsOutput {
  todoCount: number
  todoIds: string[]
  error: Error | null
}

export class CreateTodosForStudentsUseCase {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(input: CreateTodosForStudentsInput): Promise<CreateTodosForStudentsOutput> {
    try {
      // 입력값 검증
      if (!input.title || input.title.trim().length === 0) {
        throw new Error('TODO 제목은 필수입니다')
      }

      if (!input.studentIds || input.studentIds.length === 0) {
        throw new Error('최소 한 명의 학생을 선택해야 합니다')
      }

      // 각 학생에게 TODO 엔티티 생성
      const todos = input.studentIds.map(studentId =>
        Todo.create({
          tenantId: input.tenantId,
          studentId,
          title: input.title.trim(),
          description: input.description?.trim() ?? null,
          subject: input.subject?.trim() ?? null,
          dueDate: input.dueDate,
          priority: Priority.fromString(input.priority),
          estimatedDurationMinutes: input.estimatedDurationMinutes ?? null,
          notes: null,
        })
      )

      // Bulk 저장
      const createdTodos = await this.todoRepository.saveBulk(todos)

      return {
        todoCount: createdTodos.length,
        todoIds: createdTodos.map(t => t.id),
        error: null,
      }
    } catch (error) {
      console.error('[CreateTodosForStudentsUseCase] Error:', error)
      return {
        todoCount: 0,
        todoIds: [],
        error: error as Error,
      }
    }
  }
}
