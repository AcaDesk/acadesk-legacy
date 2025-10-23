/**
 * SupabaseAuthRepository
 * Supabase implementation of IAuthRepository
 */

import type { SupabaseClient, User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import type { IDataSource } from '@core/domain/data-sources/IDataSource'
import type {
  IAuthRepository,
  SignUpData,
  SignInData,
  AuthResult,
  OAuthProvider,
} from '@core/domain/repositories/IAuthRepository'
import type { Email } from '@core/domain/value-objects/Email'
import type { Password } from '@core/domain/value-objects/Password'
import { SupabaseDataSource } from '../data-sources/SupabaseDataSource'

export class AuthRepository implements IAuthRepository {
  private dataSource: IDataSource

  constructor(client: IDataSource | SupabaseClient) {
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function' && typeof client.rpc === 'function'
  }

  /**
   * Sign up with email and password
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

    if (!this.dataSource.auth) {
      throw new Error('Auth not available')
    }

    const { data: authData, error } = await this.dataSource.auth.signUp({
      email: data.email.getValue(),
      password: data.password.getValue(),
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    })

    if (error) {
      return {
        user: null,
        error: this.enhanceError(error as AuthError),
      }
    }

    // ✅ 프로필 생성은 Server Action (createUserProfileServer)에서 처리
    // Repository는 auth만 담당하고, 프로필 생성은 application layer에서 관리

    return {
      user: authData?.user || null,
      error: null,
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    if (!this.dataSource.auth) {
      throw new Error('Auth not available')
    }

    const { data: authData, error } = await this.dataSource.auth.signInWithPassword({
      email: data.email.getValue(),
      password: data.password.getValue(),
    })

    if (error) {
      return {
        user: null,
        error: this.enhanceError(error as AuthError),
      }
    }

    return {
      user: authData?.user || null,
      error: null,
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(provider: OAuthProvider): Promise<{
    data: { url: string | null } | null
    error: AuthError | null
  }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

    if (!this.dataSource.auth) {
      throw new Error('Auth not available')
    }

    const { data, error } = await this.dataSource.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${appUrl}/auth/callback`,
      },
    })

    if (error) {
      return {
        data: null,
        error: this.enhanceError(error as AuthError),
      }
    }

    return {
      data: data as { url: string | null },
      error: null,
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    if (!this.dataSource.auth) {
      throw new Error('Auth not available')
    }

    const { error } = await this.dataSource.auth.signOut()

    if (error) {
      return { error: this.enhanceError(error as AuthError) }
    }

    return { error: null }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<SupabaseUser | null> {
    if (!this.dataSource.auth) {
      throw new Error('Auth not available')
    }

    const { data } = await this.dataSource.auth.getUser()
    return data?.user || null
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: Email): Promise<{ error: AuthError | null }> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

    if (!this.dataSource.auth) {
      throw new Error('Auth not available')
    }

    const { error } = await this.dataSource.auth.resetPasswordForEmail(email.getValue(), {
      redirectTo: `${appUrl}/auth/reset-password`,
    })

    if (error) {
      return { error: this.enhanceError(error as AuthError) }
    }

    return { error: null }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: Password): Promise<{ error: AuthError | null }> {
    if (!this.dataSource.auth) {
      throw new Error('Auth not available')
    }

    const { error } = await this.dataSource.auth.updateUser({
      password: newPassword.getValue(),
    })

    if (error) {
      return { error: this.enhanceError(error as AuthError) }
    }

    return { error: null }
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
