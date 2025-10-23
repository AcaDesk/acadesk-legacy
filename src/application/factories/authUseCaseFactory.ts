/**
 * Auth Use Case Factory (Server-side)
 * Server Components 및 API Routes에서 사용
 *
 * ⚠️ Onboarding 관련 use case는 Server Action으로 대체됨
 * - createCompleteOwnerOnboardingUseCase → completeOwnerOnboarding (Server Action)
 * - createCompleteAcademySetupUseCase → completeOwnerOnboarding (Server Action)
 * - createGetOnboardingStateUseCase → checkOnboardingStage (Server Action)
 */

import { createClient } from '@/lib/supabase/server'
import { AuthRepository } from '@/infrastructure/database/auth.repository'
import {
  SignUpUseCase,
  SignInUseCase,
  SignOutUseCase,
  SignInWithOAuthUseCase,
  ResetPasswordUseCase,
  UpdatePasswordUseCase,
} from '@/application/use-cases/auth'

/**
 * Create SignUpUseCase (server-side)
 */
export async function createSignUpUseCase() {
  const supabase = await createClient()
  const authRepository = new AuthRepository(supabase)
  return new SignUpUseCase(authRepository)
}

/**
 * Create SignInUseCase (server-side)
 */
export async function createSignInUseCase() {
  const supabase = await createClient()
  const authRepository = new AuthRepository(supabase)
  return new SignInUseCase(authRepository)
}

/**
 * Create SignOutUseCase (server-side)
 */
export async function createSignOutUseCase() {
  const supabase = await createClient()
  const authRepository = new AuthRepository(supabase)
  return new SignOutUseCase(authRepository)
}

/**
 * Create SignInWithOAuthUseCase (server-side)
 */
export async function createSignInWithOAuthUseCase() {
  const supabase = await createClient()
  const authRepository = new AuthRepository(supabase)
  return new SignInWithOAuthUseCase(authRepository)
}

/**
 * Create ResetPasswordUseCase (server-side)
 */
export async function createResetPasswordUseCase() {
  const supabase = await createClient()
  const authRepository = new AuthRepository(supabase)
  return new ResetPasswordUseCase(authRepository)
}

/**
 * Create UpdatePasswordUseCase (server-side)
 */
export async function createUpdatePasswordUseCase() {
  const supabase = await createClient()
  const authRepository = new AuthRepository(supabase)
  return new UpdatePasswordUseCase(authRepository)
}
