/**
 * UpdatePasswordUseCase
 * 비밀번호 업데이트 Use Case
 */

import type { IAuthRepository } from '@core/domain/repositories/IAuthRepository'
import { Password } from '@core/domain/value-objects/Password'
import type { AuthError } from '@supabase/supabase-js'

export interface UpdatePasswordInput {
  newPassword: string
}

export interface UpdatePasswordOutput {
  error: AuthError | null
}

export class UpdatePasswordUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(input: UpdatePasswordInput): Promise<UpdatePasswordOutput> {
    // Validate new password
    const password = Password.create(input.newPassword)

    // Update password
    const result = await this.authRepository.updatePassword(password)

    return result
  }
}
