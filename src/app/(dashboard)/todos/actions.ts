'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createVerifyTodoUseCase,
  createDeleteTodoUseCase,
} from '@/application/factories/todoUseCaseFactory.server'

/**
 * TODO 검증 Server Action
 */
export async function verifyTodoAction(todoId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: '로그인이 필요합니다.',
      }
    }

    // Get user's tenant ID
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userData?.tenant_id) {
      return {
        success: false,
        error: '테넌트 정보를 찾을 수 없습니다.',
      }
    }

    const verifyTodoUseCase = await createVerifyTodoUseCase()
    await verifyTodoUseCase.execute({
      todoId,
      tenantId: userData.tenant_id,
      verifiedBy: user.id,
    })

    revalidatePath('/todos')

    return {
      success: true,
      message: 'TODO가 검증되었습니다.',
    }
  } catch (error) {
    console.error('Failed to verify todo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '검증에 실패했습니다.',
    }
  }
}

/**
 * TODO 삭제 Server Action
 */
export async function deleteTodoAction(todoId: string) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: '로그인이 필요합니다.',
      }
    }

    // Get user's tenant ID
    const { data: userData } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userData?.tenant_id) {
      return {
        success: false,
        error: '테넌트 정보를 찾을 수 없습니다.',
      }
    }

    const deleteTodoUseCase = await createDeleteTodoUseCase()
    await deleteTodoUseCase.execute(todoId, userData.tenant_id)

    revalidatePath('/todos')

    return {
      success: true,
      message: 'TODO가 삭제되었습니다.',
    }
  } catch (error) {
    console.error('Failed to delete todo:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '삭제에 실패했습니다.',
    }
  }
}
