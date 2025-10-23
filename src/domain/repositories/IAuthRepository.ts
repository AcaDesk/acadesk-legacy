/**
 * IAuthRepository
 * Authentication repository interface
 */

import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js'
import type { Email } from '@/domain/value-objects/Email'
import type { Password } from '@/domain/value-objects/Password'

export interface SignUpData {
  email: Email
  password: Password
}

export interface SignInData {
  email: Email
  password: Password
}

export interface AuthResult {
  user: SupabaseUser | null
  error: AuthError | null
}

export type OAuthProvider = 'google' | 'kakao'

/**
 * Auth Repository Interface
 * Pure authentication operations (회원가입, 로그인, 비밀번호 재설정)
 */
export interface IAuthRepository {
  /**
   * Sign up with email and password
   */
  signUp(data: SignUpData): Promise<AuthResult>

  /**
   * Sign in with email and password
   */
  signIn(data: SignInData): Promise<AuthResult>

  /**
   * Sign in with OAuth provider
   */
  signInWithOAuth(provider: OAuthProvider): Promise<{
    data: { url: string | null } | null
    error: AuthError | null
  }>

  /**
   * Sign out
   */
  signOut(): Promise<{ error: AuthError | null }>

  /**
   * Get current authenticated user
   */
  getCurrentUser(): Promise<SupabaseUser | null>

  /**
   * Send password reset email
   */
  sendPasswordResetEmail(email: Email): Promise<{ error: AuthError | null }>

  /**
   * Update password
   */
  updatePassword(newPassword: Password): Promise<{ error: AuthError | null }>
}
