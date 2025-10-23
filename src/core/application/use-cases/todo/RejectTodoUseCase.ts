/**
 * RejectTodoUseCase
 * TODO 반려 처리 Use Case (선생님이 완료를 인정하지 않고 다시 하도록 함)
 */

import type { ITodoRepository } from '@core/domain/repositories/ITodoRepository'
import { Todo } from '@core/domain/entities/Todo'
import { NotFoundError, ValidationError } from '@/lib/error-types'

export interface RejectTodoInput {
  todoId: string
  rejectedBy: string // User ID of the teacher/instructor
  rejectionReason?: string // Feedback for the student
  tenantId: string
}

export class RejectTodoUseCase {
  constructor(private readonly todoRepository: ITodoRepository) {}

  async execute(input: RejectTodoInput): Promise<Todo> {
    // Find todo
    const todo = await this.todoRepository.findById(input.todoId, input.tenantId)

    if (!todo) {
      throw new NotFoundError('TODO')
    }

    // Validate rejector
    if (!input.rejectedBy) {
      throw new ValidationError('반려 처리자 정보는 필수입니다')
    }

    // Check if completed
    if (!todo.isCompleted) {
      throw new ValidationError('완료되지 않은 TODO는 반려할 수 없습니다')
    }

    // Check if already verified
    if (todo.isVerified) {
      throw new ValidationError('이미 검증된 TODO는 반려할 수 없습니다')
    }

    // Uncomplete using domain logic
    const uncompletedTodo = todo.uncomplete()

    // Add rejection note if provided
    const rejectionNote = input.rejectionReason
      ? `[반려 사유] ${input.rejectionReason} (반려자: ${input.rejectedBy}, 반려일: ${new Date().toISOString()})`
      : `[반려됨] 다시 완료해주세요 (반려자: ${input.rejectedBy}, 반려일: ${new Date().toISOString()})`

    // Update with rejection note
    const rejectedTodo = uncompletedTodo.update({
      notes: rejectionNote,
    })

    // Persist to database
    return await this.todoRepository.save(rejectedTodo, input.tenantId)
  }
}
