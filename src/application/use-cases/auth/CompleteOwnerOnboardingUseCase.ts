/**
 * CompleteOwnerOnboardingUseCase
 * 원장 온보딩 완료 Use Case
 */

import type { IOnboardingRepository } from '@/domain/repositories/IOnboardingRepository'

export interface CompleteOwnerOnboardingInput {
  userId: string
  name: string
  academyName: string
  slug?: string | null
}

export interface CompleteOwnerOnboardingOutput {
  success: boolean
  error?: string
  data?: unknown
}

export class CompleteOwnerOnboardingUseCase {
  constructor(private readonly onboardingRepository: IOnboardingRepository) {}

  async execute(input: CompleteOwnerOnboardingInput): Promise<CompleteOwnerOnboardingOutput> {
    // Validate input
    if (!input.name || input.name.trim().length === 0) {
      return {
        success: false,
        error: '이름을 입력해주세요.',
      }
    }

    if (!input.academyName || input.academyName.trim().length === 0) {
      return {
        success: false,
        error: '학원 이름을 입력해주세요.',
      }
    }

    // Execute onboarding
    const result = await this.onboardingRepository.completeOwnerOnboarding({
      userId: input.userId,
      name: input.name.trim(),
      academyName: input.academyName.trim(),
      slug: input.slug,
    })

    return result
  }
}
