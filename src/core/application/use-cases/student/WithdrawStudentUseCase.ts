/**
 * Withdraw Student Use Case
 * 학생 탈퇴 처리 유스케이스 - Application Layer
 */

import type { IStudentRepository } from '@core/domain/repositories/IStudentRepository'
import { Student } from '@core/domain/entities/Student'
import { NotFoundError, ValidationError } from '@/lib/error-types'

export interface WithdrawStudentDTO {
  studentId: string
  tenantId: string
  withdrawalDate?: Date
}

export class WithdrawStudentUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  async execute(dto: WithdrawStudentDTO): Promise<Student> {
    // Find student
    const student = await this.studentRepository.findById(dto.studentId, dto.tenantId)

    if (!student) {
      throw new NotFoundError('학생')
    }

    // Check if already withdrawn
    if (student.withdrawalDate) {
      throw new ValidationError('이미 탈퇴 처리된 학생입니다')
    }

    // Withdraw using domain logic
    const withdrawnStudent = student.withdraw(dto.withdrawalDate)

    // Persist to database
    return await this.studentRepository.save(withdrawnStudent, dto.tenantId)
  }
}
