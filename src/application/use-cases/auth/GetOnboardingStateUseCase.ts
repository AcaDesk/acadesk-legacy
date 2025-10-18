/**
 * GetOnboardingStateUseCase
 * 온보딩 상태 조회 Use Case
 */

import type { IOnboardingRepository } from '@/domain/repositories/IOnboardingRepository'
import type { OnboardingState } from '@/domain/entities/OnboardingState'

export interface GetOnboardingStateOutput {
  state: OnboardingState | null
  error?: string
}

export class GetOnboardingStateUseCase {
  constructor(private readonly onboardingRepository: IOnboardingRepository) {}

  async execute(): Promise<GetOnboardingStateOutput> {
    const state = await this.onboardingRepository.getOnboardingState()

    if (!state) {
      return {
        state: null,
        error: '온보딩 상태를 확인할 수 없습니다.',
      }
    }

    return {
      state,
    }
  }
}
