/**
 * SignUpUseCase
 * 회원가입 Use Case
 */

import type { IAuthRepository } from '@core/domain/repositories/IAuthRepository'
import { Email } from '@core/domain/value-objects/Email'
import { Password } from '@core/domain/value-objects/Password'
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js'

export interface SignUpInput {
  email: string
  password: string
}

export interface SignUpOutput {
  user: SupabaseUser | null
  error: AuthError | null
}

export class SignUpUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(input: SignUpInput): Promise<SignUpOutput> {
    // Validate email
    const email = Email.create(input.email)

    // Validate password
    const password = Password.create(input.password)

    // Execute sign up
    const result = await this.authRepository.signUp({
      email,
      password,
    })

    return result
  }
}
