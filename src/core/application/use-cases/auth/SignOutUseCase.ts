/**
 * SignOutUseCase
 * 로그아웃 Use Case
 */

import type { IAuthRepository } from '@core/domain/repositories/IAuthRepository'
import type { AuthError } from '@supabase/supabase-js'

export interface SignOutOutput {
  error: AuthError | null
}

export class SignOutUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(): Promise<SignOutOutput> {
    const result = await this.authRepository.signOut()
    return result
  }
}
