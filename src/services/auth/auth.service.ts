import { createClient } from "@/lib/supabase/client"
import type { AuthError, User } from "@supabase/supabase-js"

/**
 * Auth Service
 * Pure authentication operations (email/password only)
 * Additional user info (name, role, etc.) should be handled by onboardingService
 */

export interface SignUpData {
  email: string
  password: string
}

export interface SignInData {
  email: string
  password: string
  remember?: boolean
}

export interface AuthResult {
  user: User | null
  error: AuthError | null
}

/**
 * Authentication Service
 * Handles pure authentication operations only
 */
export const authService = {
  /**
   * 회원가입 (이메일/비밀번호만)
   * 추가 정보는 온보딩 페이지에서 입력
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    const { email, password } = data
    const supabase = createClient()

    // 환경변수에서 앱 URL 가져오기, 없으면 현재 origin 사용
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    })

    if (error) {
      // Return error with user-friendly message
      error.message = this.getReadableErrorMessage(error)
      return {
        user: null,
        error,
      }
    }

    return {
      user: authData.user,
      error: null,
    }
  },

  /**
   * 로그인
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    const { email, password } = data
    const supabase = createClient()

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Return error with user-friendly message
      error.message = this.getReadableErrorMessage(error)
      return {
        user: null,
        error,
      }
    }

    return {
      user: authData.user,
      error: null,
    }
  },

  /**
   * 로그아웃
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      // Return error with user-friendly message
      error.message = this.getReadableErrorMessage(error)
      return { error }
    }

    return { error: null }
  },

  /**
   * 현재 사용자 정보 가져오기
   */
  async getCurrentUser(): Promise<User | null> {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  },

  /**
   * 비밀번호 재설정 이메일 전송
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    const supabase = createClient()
    // 환경변수에서 앱 URL 가져오기, 없으면 현재 origin 사용
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/reset-password`,
    })

    if (error) {
      // Return error with user-friendly message
      error.message = this.getReadableErrorMessage(error)
      return { error }
    }

    return { error: null }
  },

  /**
   * 비밀번호 업데이트
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      // Return error with user-friendly message
      error.message = this.getReadableErrorMessage(error)
      return { error }
    }

    return { error: null }
  },

  /**
   * Convert Supabase auth errors to user-friendly Korean messages
   */
  getReadableErrorMessage(error: AuthError): string {
    const errorMap: Record<string, string> = {
      "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
      "Email not confirmed": "이메일 인증이 필요합니다.",
      "User already registered": "이미 가입된 이메일입니다.",
      "Password should be at least 6 characters": "비밀번호는 최소 6자 이상이어야 합니다.",
      "Unable to validate email address: invalid format":
        "이메일 형식이 올바르지 않습니다.",
      "Signups not allowed for this instance": "현재 회원가입이 불가능합니다.",
      "Email rate limit exceeded": "이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
    }

    return errorMap[error.message] || error.message
  },
}
