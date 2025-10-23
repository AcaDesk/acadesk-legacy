/**
 * UpdateTodoTemplateUseCase
 * TODO 템플릿 업데이트 Use Case
 */

import type { ITodoTemplateRepository } from '@core/domain/repositories/ITodoTemplateRepository'
import type { TodoTemplate } from '@core/domain/entities/TodoTemplate'
import { Priority, type PriorityLevel } from '@core/domain/value-objects/Priority'
import { NotFoundError, ValidationError } from '@/lib/error-types'

export interface UpdateTodoTemplateInput {
  templateId: string
  title?: string
  description?: string
  subject?: string
  estimatedDurationMinutes?: number
  priority?: PriorityLevel
}

export class UpdateTodoTemplateUseCase {
  constructor(private readonly templateRepository: ITodoTemplateRepository) {}

  async execute(input: UpdateTodoTemplateInput): Promise<TodoTemplate> {
    // 템플릿 조회
    const template = await this.templateRepository.findById(input.templateId)

    if (!template) {
      throw new NotFoundError('템플릿')
    }

    // 입력값 검증
    if (input.title !== undefined && input.title.trim().length === 0) {
      throw new ValidationError('템플릿 제목은 비어있을 수 없습니다')
    }

    // 업데이트할 필드 준비
    const updates: Partial<{
      title: string
      description: string | null
      subject: string | null
      estimatedDurationMinutes: number
      priority: Priority
    }> = {}

    if (input.title !== undefined) {
      updates.title = input.title.trim()
    }

    if (input.description !== undefined) {
      updates.description = input.description.trim() || null
    }

    if (input.subject !== undefined) {
      updates.subject = input.subject.trim() || null
    }

    if (input.estimatedDurationMinutes !== undefined) {
      updates.estimatedDurationMinutes = input.estimatedDurationMinutes
    }

    if (input.priority !== undefined) {
      updates.priority = Priority.fromString(input.priority)
    }

    // 도메인 로직으로 업데이트
    const updatedTemplate = template.update(updates)

    // 저장
    return await this.templateRepository.save(updatedTemplate)
  }
}
