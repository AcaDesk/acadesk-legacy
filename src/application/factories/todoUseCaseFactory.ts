/**
 * Todo Use Case Factory
 * TODO 유스케이스 팩토리 - 의존성 주입을 위한 팩토리 함수들
 */

import { createClient } from '@/lib/supabase/server'
import { SupabaseTodoRepository } from '@/infrastructure/database/SupabaseTodoRepository'
import { CreateTodoUseCase } from '../use-cases/todo/CreateTodoUseCase'
import { UpdateTodoUseCase } from '../use-cases/todo/UpdateTodoUseCase'
import { CompleteTodoUseCase } from '../use-cases/todo/CompleteTodoUseCase'
import { VerifyTodoUseCase } from '../use-cases/todo/VerifyTodoUseCase'
import { DeleteTodoUseCase } from '../use-cases/todo/DeleteTodoUseCase'
import { GetTodoUseCase } from '../use-cases/todo/GetTodoUseCase'

/**
 * TODO 리포지토리 생성 (서버 사이드)
 */
async function createTodoRepository() {
  const supabase = await createClient()
  return new SupabaseTodoRepository(supabase)
}

/**
 * CreateTodo 유스케이스 생성
 */
export async function createCreateTodoUseCase() {
  const repository = await createTodoRepository()
  return new CreateTodoUseCase(repository)
}

/**
 * UpdateTodo 유스케이스 생성
 */
export async function createUpdateTodoUseCase() {
  const repository = await createTodoRepository()
  return new UpdateTodoUseCase(repository)
}

/**
 * CompleteTodo 유스케이스 생성
 */
export async function createCompleteTodoUseCase() {
  const repository = await createTodoRepository()
  return new CompleteTodoUseCase(repository)
}

/**
 * VerifyTodo 유스케이스 생성
 */
export async function createVerifyTodoUseCase() {
  const repository = await createTodoRepository()
  return new VerifyTodoUseCase(repository)
}

/**
 * DeleteTodo 유스케이스 생성
 */
export async function createDeleteTodoUseCase() {
  const repository = await createTodoRepository()
  return new DeleteTodoUseCase(repository)
}

/**
 * GetTodo 유스케이스 생성
 */
export async function createGetTodoUseCase() {
  const repository = await createTodoRepository()
  return new GetTodoUseCase(repository)
}
