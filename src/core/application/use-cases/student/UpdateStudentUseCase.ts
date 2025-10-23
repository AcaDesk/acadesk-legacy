/**
 * Update Student Use Case
 * 학생 정보 수정 유스케이스 - Application Layer
 */

import type { IStudentRepository } from '@core/domain/repositories/IStudentRepository'
import { Student } from '@core/domain/entities/Student'
import { ValidationError, NotFoundError } from '@/lib/error-types'

export interface UpdateStudentDTO {
  id: string
  tenantId: string
  name?: string
  birthDate?: Date | null
  gender?: 'male' | 'female' | 'other' | null
  studentPhone?: string | null
  profileImageUrl?: string | null
  grade?: string | null
  school?: string | null
  notes?: string | null
  commuteMethod?: string | null
  marketingSource?: string | null
  kioskPin?: string | null
}

export class UpdateStudentUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  async execute(dto: UpdateStudentDTO): Promise<Student> {
    // Find existing student
    const student = await this.studentRepository.findById(dto.id, dto.tenantId)

    if (!student) {
      throw new NotFoundError('학생')
    }

    // Validate name if provided
    if (dto.name !== undefined && !dto.name.trim()) {
      throw new ValidationError('학생 이름은 필수입니다')
    }

    // Update student using domain logic
    const updatedStudent = student.update({
      name: dto.name?.trim(),
      birthDate: dto.birthDate,
      gender: dto.gender,
      studentPhone: dto.studentPhone,
      profileImageUrl: dto.profileImageUrl,
      grade: dto.grade,
      school: dto.school,
      notes: dto.notes,
      commuteMethod: dto.commuteMethod,
      marketingSource: dto.marketingSource,
      kioskPin: dto.kioskPin,
    })

    // Persist to database
    return await this.studentRepository.save(updatedStudent, dto.tenantId)
  }
}
