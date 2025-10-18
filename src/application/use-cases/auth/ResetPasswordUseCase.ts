/**
 * ResetPasswordUseCase
 * 비밀번호 재설정 이메일 전송 Use Case
 */

import type { IAuthRepository } from '@/domain/repositories/IAuthRepository'
import { Email } from '@/domain/value-objects/Email'
import type { AuthError } from '@supabase/supabase-js'

export interface ResetPasswordInput {
  email: string
}

export interface ResetPasswordOutput {
  error: AuthError | null
}

export class ResetPasswordUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {
    // Validate email
    const email = Email.create(input.email)

    // Send password reset email
    const result = await this.authRepository.sendPasswordResetEmail(email)

    return result
  }
}
