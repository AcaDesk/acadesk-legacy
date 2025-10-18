/**
 * SignInWithOAuthUseCase
 * OAuth 로그인 Use Case
 */

import type { IAuthRepository, OAuthProvider } from '@/domain/repositories/IAuthRepository'
import type { AuthError } from '@supabase/supabase-js'

export interface SignInWithOAuthInput {
  provider: OAuthProvider
}

export interface SignInWithOAuthOutput {
  url: string | null
  error: AuthError | null
}

export class SignInWithOAuthUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(input: SignInWithOAuthInput): Promise<SignInWithOAuthOutput> {
    const result = await this.authRepository.signInWithOAuth(input.provider)

    return {
      url: result.data?.url ?? null,
      error: result.error,
    }
  }
}
