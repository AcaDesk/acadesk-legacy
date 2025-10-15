import { createClient } from "@/lib/supabase/client"
import type { AuthError, User } from "@supabase/supabase-js"

export interface SignUpData {
  email: string
  password: string
  name: string
  phone: string
  academyName: string
  role: "admin" | "teacher" | "staff"
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

export class AuthService {
  private supabase = createClient()

  /**
   * 회원가입
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    const { email, password, name, phone, academyName, role } = data

    // 환경변수에서 앱 URL 가져오기, 없으면 현재 origin 사용
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

    const { data: authData, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
        data: {
          name,
          phone,
          academy_name: academyName,
          role,
        },
      },
    })

    return {
      user: authData.user,
      error,
    }
  }

  /**
   * 로그인
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    const { email, password } = data

    const { data: authData, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })

    return {
      user: authData.user,
      error,
    }
  }

  /**
   * 로그아웃
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signOut()
    return { error }
  }

  /**
   * 현재 사용자 정보 가져오기
   */
  async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    return user
  }

  /**
   * 비밀번호 재설정 이메일 전송
   */
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    // 환경변수에서 앱 URL 가져오기, 없으면 현재 origin 사용
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/reset-password`,
    })
    return { error }
  }

  /**
   * 비밀번호 업데이트
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    })
    return { error }
  }
}

// 싱글톤 인스턴스
export const authService = new AuthService()
