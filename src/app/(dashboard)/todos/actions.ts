'use server'

/**
 * TODO Client Actions
 *
 * Re-export from main todos actions for backwards compatibility
 */

import { verifyTodos, deleteTodo } from '@/app/actions/todos'

/**
 * Verify a single TODO
 */
export async function verifyTodoAction(todoId: string) {
  // Call the batch verify with single ID
  const result = await verifyTodos({ todoIds: [todoId] })

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    }
  }

  return {
    success: true,
    message: 'TODO가 검증되었습니다.',
  }
}

/**
 * Delete a single TODO
 */
export async function deleteTodoAction(todoId: string) {
  const result = await deleteTodo(todoId)

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    }
  }

  return {
    success: true,
    message: 'TODO가 삭제되었습니다.',
  }
}
