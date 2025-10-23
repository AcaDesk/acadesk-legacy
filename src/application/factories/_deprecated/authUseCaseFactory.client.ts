/**
 * Auth Use Case Factory (Client-side)
 * Client Components에서 사용
 */

import { createClient } from '@/lib/supabase/client'
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
 * Create SignUpUseCase (client-side)
 */
export function createSignUpUseCase() {
  const supabase = createClient()
  const authRepository = new AuthRepository(supabase)
  return new SignUpUseCase(authRepository)
}

/**
 * Create SignInUseCase (client-side)
 */
export function createSignInUseCase() {
  const supabase = createClient()
  const authRepository = new AuthRepository(supabase)
  return new SignInUseCase(authRepository)
}

/**
 * Create SignOutUseCase (client-side)
 */
export function createSignOutUseCase() {
  const supabase = createClient()
  const authRepository = new AuthRepository(supabase)
  return new SignOutUseCase(authRepository)
}

/**
 * Create SignInWithOAuthUseCase (client-side)
 */
export function createSignInWithOAuthUseCase() {
  const supabase = createClient()
  const authRepository = new AuthRepository(supabase)
  return new SignInWithOAuthUseCase(authRepository)
}

/**
 * Create ResetPasswordUseCase (client-side)
 */
export function createResetPasswordUseCase() {
  const supabase = createClient()
  const authRepository = new AuthRepository(supabase)
  return new ResetPasswordUseCase(authRepository)
}

/**
 * Create UpdatePasswordUseCase (client-side)
 */
export function createUpdatePasswordUseCase() {
  const supabase = createClient()
  const authRepository = new AuthRepository(supabase)
  return new UpdatePasswordUseCase(authRepository)
}

/**
 * Create CompleteOwnerOnboardingUseCase (client-side)
 */
export function createCompleteOwnerOnboardingUseCase() {
  const supabase = createClient()
  const onboardingRepository = new OnboardingRepository(supabase)
  return new CompleteOwnerOnboardingUseCase(onboardingRepository)
}

/**
 * Create CompleteAcademySetupUseCase (client-side)
 */
export function createCompleteAcademySetupUseCase() {
  const supabase = createClient()
  const onboardingRepository = new OnboardingRepository(supabase)
  return new CompleteAcademySetupUseCase(onboardingRepository)
}

/**
 * Create GetOnboardingStateUseCase (client-side)
 */
export function createGetOnboardingStateUseCase() {
  const supabase = createClient()
  const onboardingRepository = new OnboardingRepository(supabase)
  return new GetOnboardingStateUseCase(onboardingRepository)
}
