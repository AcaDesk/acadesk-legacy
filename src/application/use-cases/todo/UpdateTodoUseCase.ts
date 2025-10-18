/**
 * Update Todo Use Case
 * TODO 수정 유스케이스 - Application Layer
 */

import type { ITodoRepository } from '@/domain/repositories/ITodoRepository'
import { Todo } from '@/domain/entities/Todo'
import { Priority, type PriorityLevel } from '@/domain/value-objects/Priority'
import { ValidationError, NotFoundError } from '@/lib/error-types'

export interface UpdateTodoDTO {
  id: string
  title?: string
  description?: string | null
  subject?: string | null
  dueDate?: Date
  priority?: PriorityLevel
  estimatedDurationMinutes?: number | null
  notes?: string | null
}

export class UpdateTodoUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  async execute(dto: UpdateTodoDTO): Promise<Todo> {
    // Find existing todo
    const todo = await this.todoRepository.findById(dto.id)

    if (!todo) {
      throw new NotFoundError('TODO')
    }

    // Validate title if provided
    if (dto.title !== undefined && !dto.title.trim()) {
      throw new ValidationError('TODO 제목은 필수입니다')
    }

    // Prepare updates
    const updates: Parameters<typeof todo.update>[0] = {}

    if (dto.title !== undefined) {
      updates.title = dto.title.trim()
    }

    if (dto.description !== undefined) {
      updates.description = dto.description
    }

    if (dto.subject !== undefined) {
      updates.subject = dto.subject
    }

    if (dto.dueDate !== undefined) {
      updates.dueDate = dto.dueDate
    }

    if (dto.priority !== undefined) {
      updates.priority = Priority.fromString(dto.priority)
    }

    if (dto.estimatedDurationMinutes !== undefined) {
      updates.estimatedDurationMinutes = dto.estimatedDurationMinutes
    }

    if (dto.notes !== undefined) {
      updates.notes = dto.notes
    }

    // Update using domain logic
    const updatedTodo = todo.update(updates)

    // Persist to database
    return await this.todoRepository.save(updatedTodo)
  }
}
