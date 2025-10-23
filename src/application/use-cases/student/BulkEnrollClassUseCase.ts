/**
 * Bulk Enroll Class Use Case
 * 여러 학생을 한 번에 수업에 등록
 */

import { IDataSource } from '@/domain/data-sources/IDataSource'

export interface BulkEnrollClassInput {
  studentIds: string[]
  classId: string
}

export interface BulkEnrollClassOutput {
  success: boolean
  error: Error | null
}

export class BulkEnrollClassUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(input: BulkEnrollClassInput): Promise<BulkEnrollClassOutput> {
    try {
      // Insert class enrollments for all selected students
      const enrollments = input.studentIds.map(studentId => ({
        class_id: input.classId,
        student_id: studentId,
        status: 'active',
        enrolled_at: new Date().toISOString(),
      }))

      const { error } = await this.dataSource
        .from('class_enrollments')
        .upsert(enrollments, { onConflict: 'class_id,student_id' })

      if (error) {
        throw new Error('일괄 수업 배정에 실패했습니다.')
      }

      return {
        success: true,
        error: null,
      }
    } catch (error) {
      console.error('[BulkEnrollClassUseCase] Error:', error)
      return {
        success: false,
        error: error as Error,
      }
    }
  }
}
