/**
 * SignInUseCase
 * 로그인 Use Case
 */

import type { IAuthRepository } from '@core/domain/repositories/IAuthRepository'
import { Email } from '@core/domain/value-objects/Email'
import { Password } from '@core/domain/value-objects/Password'
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js'

export interface SignInInput {
  email: string
  password: string
}

export interface SignInOutput {
  user: SupabaseUser | null
  error: AuthError | null
}

export class SignInUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(input: SignInInput): Promise<SignInOutput> {
    // Validate email
    const email = Email.create(input.email)

    // Validate password (기존 비밀번호이므로 검증 없이 생성)
    const password = Password.createUnsafe(input.password)

    // Execute sign in
    const result = await this.authRepository.signIn({
      email,
      password,
    })

    return result
  }
}
