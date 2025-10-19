/**
 * Todo Use Case Factory (Server-side)
 * TODO 유스케이스 팩토리 - Server Actions 및 서버 컴포넌트용
 */

import { createClient } from '@/lib/supabase/server'
import { TodoRepository } from '@/infrastructure/database/todo.repository'
import { CreateTodoUseCase } from '../use-cases/todo/CreateTodoUseCase'
import { CreateTodosForStudentsUseCase } from '../use-cases/todo/CreateTodosForStudentsUseCase'
import { UpdateTodoUseCase } from '../use-cases/todo/UpdateTodoUseCase'
import { CompleteTodoUseCase } from '../use-cases/todo/CompleteTodoUseCase'
import { VerifyTodoUseCase } from '../use-cases/todo/VerifyTodoUseCase'
import { VerifyTodosUseCase } from '../use-cases/todo/VerifyTodosUseCase'
import { RejectTodoUseCase } from '../use-cases/todo/RejectTodoUseCase'
import { DeleteTodoUseCase } from '../use-cases/todo/DeleteTodoUseCase'
import { GetTodoUseCase } from '../use-cases/todo/GetTodoUseCase'
import { GetTodosUseCase } from '../use-cases/todo/GetTodosUseCase'

/**
 * TODO 리포지토리 생성 (서버 사이드)
 */
async function createTodoRepository() {
  const supabase = await createClient()
  return new TodoRepository(supabase)
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

/**
 * CreateTodosForStudents 유스케이스 생성 (Bulk)
 */
export async function createCreateTodosForStudentsUseCase() {
  const repository = await createTodoRepository()
  return new CreateTodosForStudentsUseCase(repository)
}

/**
 * VerifyTodos 유스케이스 생성 (Bulk)
 */
export async function createVerifyTodosUseCase() {
  const repository = await createTodoRepository()
  return new VerifyTodosUseCase(repository)
}

/**
 * RejectTodo 유스케이스 생성
 */
export async function createRejectTodoUseCase() {
  const repository = await createTodoRepository()
  return new RejectTodoUseCase(repository)
}

/**
 * GetTodos 유스케이스 생성 (다수 조회, 필터 가능)
 */
export async function createGetTodosUseCase() {
  const repository = await createTodoRepository()
  return new GetTodosUseCase(repository)
}
