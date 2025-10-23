/**
 * Delete Student Use Case
 * 학생 삭제 유스케이스 (소프트 삭제) - Application Layer
 */

import type { IStudentRepository } from '@core/domain/repositories/IStudentRepository'
import { NotFoundError } from '@/lib/error-types'

export class DeleteStudentUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  async execute(studentId: string, tenantId: string): Promise<void> {
    // Verify student exists and belongs to tenant
    const student = await this.studentRepository.findById(studentId, tenantId)

    if (!student) {
      throw new NotFoundError('학생')
    }

    // Soft delete using repository
    await this.studentRepository.delete(studentId, tenantId)
  }
}
