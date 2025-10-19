/**
 * Auth Use Case Factory (Server-side)
 * Server Components 및 API Routes에서 사용
 */

import { createClient } from '@/lib/supabase/server'
import { AuthRepository } from '@/infrastructure/database/auth.repository'
import { OnboardingRepository } from '@/infrastructure/database/onboarding.repository'
import {
  SignUpUseCase,
  SignInUseCase,
  SignOutUseCase,
  SignInWithOAuthUseCase,
  ResetPasswordUseCase,
  UpdatePasswordUseCase,
  CompleteOwnerOnboardingUseCase,
  CompleteAcademySetupUseCase,
  GetOnboardingStateUseCase,
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

/**
 * Create CompleteOwnerOnboardingUseCase (server-side)
 */
export async function createCompleteOwnerOnboardingUseCase() {
  const supabase = await createClient()
  const onboardingRepository = new OnboardingRepository(supabase)
  return new CompleteOwnerOnboardingUseCase(onboardingRepository)
}

/**
 * Create CompleteAcademySetupUseCase (server-side)
 */
export async function createCompleteAcademySetupUseCase() {
  const supabase = await createClient()
  const onboardingRepository = new OnboardingRepository(supabase)
  return new CompleteAcademySetupUseCase(onboardingRepository)
}

/**
 * Create GetOnboardingStateUseCase (server-side)
 */
export async function createGetOnboardingStateUseCase() {
  const supabase = await createClient()
  const onboardingRepository = new OnboardingRepository(supabase)
  return new GetOnboardingStateUseCase(onboardingRepository)
}
