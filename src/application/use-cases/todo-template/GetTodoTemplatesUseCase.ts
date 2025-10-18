/**
 * GetTodoTemplatesUseCase
 * 활성 TODO 템플릿 목록 조회 Use Case
 */

import type { ITodoTemplateRepository } from '@/domain/repositories/ITodoTemplateRepository'
import type { TodoTemplate } from '@/domain/entities/TodoTemplate'

export interface GetTodoTemplatesInput {
  tenantId: string
  subject?: string
  includeInactive?: boolean
}

export interface GetTodoTemplatesOutput {
  templates: TodoTemplate[]
  error: Error | null
}

export class GetTodoTemplatesUseCase {
  constructor(private readonly templateRepository: ITodoTemplateRepository) {}

  async execute(input: GetTodoTemplatesInput): Promise<GetTodoTemplatesOutput> {
    try {
      let templates: TodoTemplate[]

      if (input.includeInactive) {
        templates = await this.templateRepository.findAll(input.tenantId)
      } else if (input.subject) {
        templates = await this.templateRepository.findBySubject(input.tenantId, input.subject)
      } else {
        templates = await this.templateRepository.findAllActive(input.tenantId)
      }

      return {
        templates,
        error: null,
      }
    } catch (error) {
      console.error('[GetTodoTemplatesUseCase] Error:', error)
      return {
        templates: [],
        error: error as Error,
      }
    }
  }
}
