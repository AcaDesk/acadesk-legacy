/**
 * Auth Use Cases
 * Export all auth-related use cases
 *
 * ⚠️ Onboarding 관련 use case는 Server Action으로 대체됨:
 * - CompleteOwnerOnboardingUseCase → completeOwnerOnboarding (src/app/actions/onboarding.ts)
 * - CompleteAcademySetupUseCase → completeOwnerOnboarding (src/app/actions/onboarding.ts)
 * - GetOnboardingStateUseCase → checkOnboardingStage (src/app/actions/onboarding.ts)
 */

export * from './SignUpUseCase'
export * from './SignInUseCase'
export * from './SignOutUseCase'
export * from './SignInWithOAuthUseCase'
export * from './ResetPasswordUseCase'
export * from './UpdatePasswordUseCase'
