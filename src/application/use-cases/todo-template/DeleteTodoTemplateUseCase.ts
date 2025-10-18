/**
 * DeleteTodoTemplateUseCase
 * TODO 템플릿 삭제 Use Case (소프트 삭제)
 */

import type { ITodoTemplateRepository } from '@/domain/repositories/ITodoTemplateRepository'
import { NotFoundError } from '@/lib/error-types'

export class DeleteTodoTemplateUseCase {
  constructor(private readonly templateRepository: ITodoTemplateRepository) {}

  async execute(templateId: string): Promise<void> {
    // 템플릿 존재 확인
    const template = await this.templateRepository.findById(templateId)

    if (!template) {
      throw new NotFoundError('템플릿')
    }

    // 소프트 삭제
    await this.templateRepository.delete(templateId)
  }
}
