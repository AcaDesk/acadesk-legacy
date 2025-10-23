/**
 * Update Student Profile Image Use Case
 * 학생 프로필 이미지 업데이트 유스케이스
 */

import type { IDataSource } from '@core/domain/data-sources/IDataSource'

export interface UpdateStudentProfileImageInput {
  studentId: string
  profileImageUrl: string
}

export interface UpdateStudentProfileImageOutput {
  success: boolean
  error: Error | null
}

export class UpdateStudentProfileImageUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(input: UpdateStudentProfileImageInput): Promise<UpdateStudentProfileImageOutput> {
    try {
      const { error } = await this.dataSource
        .from('students')
        .update({ profile_image_url: input.profileImageUrl })
        .eq('id', input.studentId)

      if (error) {
        throw error
      }

      return {
        success: true,
        error: null,
      }
    } catch (error) {
      console.error('[UpdateStudentProfileImageUseCase] Error:', error)
      return {
        success: false,
        error: error as Error,
      }
    }
  }
}
