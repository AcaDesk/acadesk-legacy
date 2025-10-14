/**
 * TODO List Service
 * TODO 목록 조회를 위한 서버 사이드 서비스
 */

import { createClient } from '@/lib/supabase/server'
import { TodoRepository, type StudentTodoWithStudent } from './data/todo.repository'

export async function getTodos(): Promise<StudentTodoWithStudent[]> {
  const supabase = await createClient()
  const todoRepo = new TodoRepository(supabase)

  try {
    const todos = await todoRepo.findAll()
    return todos
  } catch (error) {
    console.error('Failed to load todos:', error)
    return []
  }
}

export async function getTodoStats(todos: StudentTodoWithStudent[]) {
  return {
    total: todos.length,
    pending: todos.filter((t) => !t.completed_at).length,
    completed: todos.filter((t) => t.completed_at && !t.verified_at).length,
    verified: todos.filter((t) => t.verified_at).length,
  }
}
