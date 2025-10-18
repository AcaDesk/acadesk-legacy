/**
 * CompleteAcademySetupUseCase
 * 학원 설정 완료 Use Case
 */

import type { IOnboardingRepository, CompleteAcademySetupData } from '@/domain/repositories/IOnboardingRepository'

export interface CompleteAcademySetupInput {
  academyName: string
  timezone?: string
  address?: string
  phone?: string
  businessHours?: {
    start: string
    end: string
  }
  subjects?: string[]
}

export interface CompleteAcademySetupOutput {
  success: boolean
  error?: string
}

export class CompleteAcademySetupUseCase {
  constructor(private readonly onboardingRepository: IOnboardingRepository) {}

  async execute(input: CompleteAcademySetupInput): Promise<CompleteAcademySetupOutput> {
    // Validate input
    if (!input.academyName || input.academyName.trim().length === 0) {
      return {
        success: false,
        error: '학원 이름을 입력해주세요.',
      }
    }

    // Prepare data
    const data: CompleteAcademySetupData = {
      academyName: input.academyName.trim(),
      timezone: input.timezone,
      settings: {
        address: input.address,
        phone: input.phone,
        businessHours: input.businessHours,
        subjects: input.subjects,
      },
    }

    // Execute academy setup
    const result = await this.onboardingRepository.completeAcademySetup(data)

    return result
  }
}
