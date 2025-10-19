/**
 * TodoTemplate Use Case Factory (Client-side)
 * TODO 템플릿 유스케이스 팩토리 - 클라이언트 컴포넌트용
 */

import { createClient } from '@/lib/supabase/client'
import { TodoTemplateRepository } from '@/infrastructure/database/todo-template.repository'
import { GetTodoTemplatesUseCase } from '../use-cases/todo-template/GetTodoTemplatesUseCase'
import { CreateTodoTemplateUseCase } from '../use-cases/todo-template/CreateTodoTemplateUseCase'
import { UpdateTodoTemplateUseCase } from '../use-cases/todo-template/UpdateTodoTemplateUseCase'
import { DeleteTodoTemplateUseCase } from '../use-cases/todo-template/DeleteTodoTemplateUseCase'

/**
 * TodoTemplate 리포지토리 생성 (클라이언트 사이드)
 */
function createTodoTemplateRepository() {
  const supabase = createClient()
  return new TodoTemplateRepository(supabase)
}

/**
 * GetTodoTemplates 유스케이스 생성
 */
export function createGetTodoTemplatesUseCase() {
  const repository = createTodoTemplateRepository()
  return new GetTodoTemplatesUseCase(repository)
}

/**
 * CreateTodoTemplate 유스케이스 생성
 */
export function createCreateTodoTemplateUseCase() {
  const repository = createTodoTemplateRepository()
  return new CreateTodoTemplateUseCase(repository)
}

/**
 * UpdateTodoTemplate 유스케이스 생성
 */
export function createUpdateTodoTemplateUseCase() {
  const repository = createTodoTemplateRepository()
  return new UpdateTodoTemplateUseCase(repository)
}

/**
 * DeleteTodoTemplate 유스케이스 생성
 */
export function createDeleteTodoTemplateUseCase() {
  const repository = createTodoTemplateRepository()
  return new DeleteTodoTemplateUseCase(repository)
}
