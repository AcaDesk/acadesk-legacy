/**
 * Delete Student Use Case
 * 학생 삭제 유스케이스 (소프트 삭제) - Application Layer
 */

import type { IStudentRepository } from '@/domain/repositories/IStudentRepository'
import { NotFoundError } from '@/lib/error-types'

export class DeleteStudentUseCase {
  constructor(private studentRepository: IStudentRepository) {}

  async execute(studentId: string): Promise<void> {
    // Verify student exists
    const student = await this.studentRepository.findById(studentId)

    if (!student) {
      throw new NotFoundError('학생')
    }

    // Soft delete using repository
    await this.studentRepository.delete(studentId)
  }
}
