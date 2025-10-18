/**
 * Create Student Use Case
 * 학생 생성 유스케이스 - Application Layer
 */

import type { IStudentRepository } from '@/domain/repositories/IStudentRepository'
import { Student } from '@/domain/entities/Student'
import { StudentCode } from '@/domain/value-objects/StudentCode'
import { ValidationError } from '@/lib/error-types'

export interface CreateStudentDTO {
  tenantId: string
  name: string
  birthDate?: Date | null
  gender?: 'male' | 'female' | 'other' | null
  studentPhone?: string | null
  profileImageUrl?: string | null
  grade?: string | null
  school?: string | null
  enrollmentDate?: Date
  emergencyContact?: string | null
  notes?: string | null
  commuteMethod?: string | null
  marketingSource?: string | null
  kioskPin?: string | null
}

export class CreateStudentUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  async execute(dto: CreateStudentDTO): Promise<Student> {
    // Validate required fields
    if (!dto.name.trim()) {
      throw new ValidationError('학생 이름은 필수입니다')
    }

    if (!dto.tenantId) {
      throw new ValidationError('테넌트 ID는 필수입니다')
    }

    // Generate unique student code
    const studentCode = StudentCode.generate()

    // Check if student code already exists (rare collision case)
    const existingStudent = await this.studentRepository.findByStudentCode(
      studentCode,
      dto.tenantId
    )

    if (existingStudent) {
      // Regenerate if collision occurs
      return this.execute(dto)
    }

    // Create domain entity
    const student = Student.create({
      tenantId: dto.tenantId,
      userId: null,
      studentCode,
      name: dto.name.trim(),
      birthDate: dto.birthDate || null,
      gender: dto.gender || null,
      studentPhone: dto.studentPhone || null,
      profileImageUrl: dto.profileImageUrl || null,
      grade: dto.grade || null,
      school: dto.school || null,
      enrollmentDate: dto.enrollmentDate || new Date(),
      withdrawalDate: null,
      emergencyContact: dto.emergencyContact || null,
      notes: dto.notes || null,
      commuteMethod: dto.commuteMethod || null,
      marketingSource: dto.marketingSource || null,
      kioskPin: dto.kioskPin || null,
    })

    // Persist to database
    return await this.studentRepository.save(student)
  }
}
