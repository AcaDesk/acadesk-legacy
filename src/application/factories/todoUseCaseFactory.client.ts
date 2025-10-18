/**
 * Todo Use Case Factory (Client-side)
 * TODO 유스케이스 팩토리 - 클라이언트 컴포넌트용
 */

import { createClient } from '@/lib/supabase/client'
import { SupabaseTodoRepository } from '@/infrastructure/database/SupabaseTodoRepository'
import { CreateTodoUseCase } from '../use-cases/todo/CreateTodoUseCase'
import { UpdateTodoUseCase } from '../use-cases/todo/UpdateTodoUseCase'
import { CompleteTodoUseCase } from '../use-cases/todo/CompleteTodoUseCase'
import { VerifyTodoUseCase } from '../use-cases/todo/VerifyTodoUseCase'
import { DeleteTodoUseCase } from '../use-cases/todo/DeleteTodoUseCase'
import { GetTodoUseCase } from '../use-cases/todo/GetTodoUseCase'

/**
 * TODO 리포지토리 생성 (클라이언트 사이드)
 */
function createTodoRepository() {
  const supabase = createClient()
  return new SupabaseTodoRepository(supabase)
}

/**
 * CreateTodo 유스케이스 생성
 */
export function createCreateTodoUseCase() {
  const repository = createTodoRepository()
  return new CreateTodoUseCase(repository)
}

/**
 * UpdateTodo 유스케이스 생성
 */
export function createUpdateTodoUseCase() {
  const repository = createTodoRepository()
  return new UpdateTodoUseCase(repository)
}

/**
 * CompleteTodo 유스케이스 생성
 */
export function createCompleteTodoUseCase() {
  const repository = createTodoRepository()
  return new CompleteTodoUseCase(repository)
}

/**
 * VerifyTodo 유스케이스 생성
 */
export function createVerifyTodoUseCase() {
  const repository = createTodoRepository()
  return new VerifyTodoUseCase(repository)
}

/**
 * DeleteTodo 유스케이스 생성
 */
export function createDeleteTodoUseCase() {
  const repository = createTodoRepository()
  return new DeleteTodoUseCase(repository)
}

/**
 * GetTodo 유스케이스 생성
 */
export function createGetTodoUseCase() {
  const repository = createTodoRepository()
  return new GetTodoUseCase(repository)
}
