/**
 * SupabaseAuthRepository
 * Supabase implementation of IAuthRepository
 */

import type { SupabaseClient, User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import type {
  IAuthRepository,
  SignUpData,
  SignInData,
  AuthResult,
  OAuthProvider,
} from '@/domain/repositories/IAuthRepository'
import type { Email } from '@/domain/value-objects/Email'
import type { Password } from '@/domain/value-objects/Password'

export class AuthRepository implements IAuthRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Sign up with email and password
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

    const { data: authData, error } = await this.supabase.auth.signUp({
      email: data.email.getValue(),
      password: data.password.getValue(),
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    })

    if (error) {
      return {
        user: null,
        error: this.enhanceError(error),
      }
    }

    // 이메일 확인이 완료된 경우 프로필 생성
    if (authData.user && authData.user.email_confirmed_at) {
      await this.createUserProfile()
    }

    return {
      user: authData.user,
      error: null,
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    const { data: authData, error } = await this.supabase.auth.signInWithPassword({
      email: data.email.getValue(),
      password: data.password.getValue(),
    })

    if (error) {
      return {
        user: null,
        error: this.enhanceError(error),
      }
    }

    return {
      user: authData.user,
      error: null,
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(provider: OAuthProvider): Promise<{
    data: { url: string } | null
    error: AuthError | null
  }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    })

    if (error) {
      return {
        data: null,
        error: this.enhanceError(error),
      }
    }

    return {
      data: data as { url: string },
      error: null,
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signOut()

    if (error) {
      return { error: this.enhanceError(error) }
    }

    return { error: null }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<SupabaseUser | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser()
    return user
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: Email): Promise<{ error: AuthError | null }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

    const { error } = await this.supabase.auth.resetPasswordForEmail(email.getValue(), {
      redirectTo: `${appUrl}/auth/reset-password`,
    })

    if (error) {
      return { error: this.enhanceError(error) }
    }

    return { error: null }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: Password): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword.getValue(),
    })

    if (error) {
      return { error: this.enhanceError(error) }
    }

    return { error: null }
  }

  /**
   * Create user profile after sign up
   */
  async createUserProfile(): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await this.supabase.rpc('create_user_profile')

    if (error) {
      console.error('Failed to create user profile:', error)
      return { success: false, error: error.message }
    }

    const result = data as { success: boolean; error?: string }

    if (!result?.success) {
      return { success: false, error: result?.error || '프로필 생성에 실패했습니다.' }
    }

    return { success: true }
  }

  /**
   * Enhance error with user-friendly Korean messages
   */
  private enhanceError(error: AuthError): AuthError {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
      'Email not confirmed': '이메일 인증이 필요합니다.',
      'User already registered': '이미 가입된 이메일입니다.',
      'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
      'Unable to validate email address: invalid format': '이메일 형식이 올바르지 않습니다.',
      'Signups not allowed for this instance': '현재 회원가입이 불가능합니다.',
      'Email rate limit exceeded': '이메일 전송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    }

    const enhancedError = { ...error }
    enhancedError.message = errorMap[error.message] || error.message

    return enhancedError as AuthError
  }
}
