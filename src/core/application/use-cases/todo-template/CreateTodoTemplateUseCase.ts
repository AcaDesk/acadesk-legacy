/**
 * CreateTodoTemplateUseCase
 * TODO 템플릿 생성 Use Case
 */

import type { ITodoTemplateRepository } from '@core/domain/repositories/ITodoTemplateRepository'
import { TodoTemplate } from '@core/domain/entities/TodoTemplate'
import { Priority, type PriorityLevel } from '@core/domain/value-objects/Priority'
import { ValidationError } from '@/lib/error-types'

export interface CreateTodoTemplateInput {
  tenantId: string
  title: string
  description?: string
  subject?: string
  estimatedDurationMinutes?: number
  priority: PriorityLevel
}

export class CreateTodoTemplateUseCase {
  constructor(private readonly templateRepository: ITodoTemplateRepository) {}

  async execute(input: CreateTodoTemplateInput): Promise<TodoTemplate> {
    // 입력값 검증
    if (!input.title || input.title.trim().length === 0) {
      throw new ValidationError('템플릿 제목은 필수입니다')
    }

    if (!input.tenantId) {
      throw new ValidationError('테넌트 정보는 필수입니다')
    }

    // 도메인 엔티티 생성
    const template = TodoTemplate.create({
      tenantId: input.tenantId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      subject: input.subject?.trim() || null,
      estimatedDurationMinutes: input.estimatedDurationMinutes || null,
      priority: Priority.fromString(input.priority),
    })

    // 저장
    return await this.templateRepository.save(template)
  }
}
