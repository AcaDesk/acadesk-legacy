/**
 * Create Todo Use Case
 * TODO 생성 유스케이스 - Application Layer
 */

import type { ITodoRepository } from '@/domain/repositories/ITodoRepository'
import { Todo } from '@/domain/entities/Todo'
import { Priority, type PriorityLevel } from '@/domain/value-objects/Priority'
import { ValidationError } from '@/lib/error-types'

export interface CreateTodoDTO {
  tenantId: string
  studentId: string
  title: string
  description?: string | null
  subject?: string | null
  dueDate: Date
  priority?: PriorityLevel
  estimatedDurationMinutes?: number | null
  notes?: string | null
}

export class CreateTodoUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  async execute(dto: CreateTodoDTO): Promise<Todo> {
    // Validate required fields
    if (!dto.title.trim()) {
      throw new ValidationError('TODO 제목은 필수입니다')
    }

    if (!dto.tenantId) {
      throw new ValidationError('테넌트 ID는 필수입니다')
    }

    if (!dto.studentId) {
      throw new ValidationError('학생 ID는 필수입니다')
    }

    if (!dto.dueDate) {
      throw new ValidationError('마감일은 필수입니다')
    }

    // Create priority value object
    const priority = dto.priority ? Priority.fromString(dto.priority) : Priority.normal()

    // Create domain entity
    const todo = Todo.create({
      tenantId: dto.tenantId,
      studentId: dto.studentId,
      title: dto.title.trim(),
      description: dto.description || null,
      subject: dto.subject || null,
      dueDate: dto.dueDate,
      priority,
      estimatedDurationMinutes: dto.estimatedDurationMinutes || null,
      notes: dto.notes || null,
    })

    // Persist to database
    return await this.todoRepository.save(todo, dto.tenantId)
  }
}
