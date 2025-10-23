/**
 * Verify Todo Use Case
 * TODO 검증 처리 유스케이스 (선생님 확인) - Application Layer
 */

import type { ITodoRepository } from '@/domain/repositories/ITodoRepository'
import { Todo } from '@/domain/entities/Todo'
import { NotFoundError, ValidationError } from '@/lib/error-types'

export interface VerifyTodoDTO {
  todoId: string
  tenantId: string
  verifiedBy: string // User ID of the teacher/instructor
}

export class VerifyTodoUseCase {
  constructor(private todoRepository: ITodoRepository) {}

  async execute(dto: VerifyTodoDTO): Promise<Todo> {
    // Find todo
    const todo = await this.todoRepository.findById(dto.todoId, dto.tenantId)

    if (!todo) {
      throw new NotFoundError('TODO')
    }

    // Validate verifier
    if (!dto.verifiedBy) {
      throw new ValidationError('검증자 정보는 필수입니다')
    }

    // Check if completed
    if (!todo.isCompleted) {
      throw new ValidationError('완료되지 않은 TODO는 검증할 수 없습니다')
    }

    // Check if already verified
    if (todo.isVerified) {
      throw new ValidationError('이미 검증된 TODO입니다')
    }

    // Verify using domain logic
    const verifiedTodo = todo.verify(dto.verifiedBy)

    // Persist to database
    return await this.todoRepository.save(verifiedTodo, dto.tenantId)
  }
}
