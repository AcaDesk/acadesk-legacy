'use server'

import { redirect } from 'next/navigation'
import { createSignOutUseCase } from '@/application/factories/authUseCaseFactory'

export interface LogoutResult {
  success: boolean
  error?: string
}

/**
 * 로그아웃 Server Action
 *
 * Clean Architecture 원칙에 따라 SignOutUseCase를 사용하여 로그아웃 처리
 * - Supabase 세션 종료
 * - 쿠키 삭제
 * - /auth/login으로 리다이렉트
 */
export async function logout(): Promise<never> {
  try {
    // Use Case를 통한 로그아웃 처리
    const useCase = await createSignOutUseCase()
    const { error } = await useCase.execute()

    if (error) {
      console.error('[logout] Sign out error:', error)
      // 에러가 있어도 로그인 페이지로 리다이렉트
      // (세션이 이미 만료되었을 수 있음)
    }

    console.log('[logout] Logout successful, redirecting to /auth/login')
  } catch (err) {
    console.error('[logout] Unexpected error during logout:', err)
  }

  // 항상 로그인 페이지로 리다이렉트
  redirect('/auth/login')
}
