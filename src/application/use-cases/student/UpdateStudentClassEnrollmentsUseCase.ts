/**
 * Update Student Class Enrollments Use Case
 * 학생의 수업 등록 업데이트 유스케이스
 */

import { IDataSource } from '@/domain/data-sources/IDataSource'

export interface UpdateStudentClassEnrollmentsInput {
  tenantId: string
  studentId: string
  classIds: string[]
}

export interface UpdateStudentClassEnrollmentsOutput {
  success: boolean
  error: Error | null
}

export class UpdateStudentClassEnrollmentsUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(input: UpdateStudentClassEnrollmentsInput): Promise<UpdateStudentClassEnrollmentsOutput> {
    try {
      // Delete all existing enrollments for this student
      const { error: deleteError } = await this.dataSource
        .from('class_enrollments')
        .delete()
        .eq('student_id', input.studentId)

      // PGRST116 means no rows found - this is acceptable
      if (deleteError && (deleteError as any).code !== 'PGRST116') {
        throw deleteError
      }

      // Insert new enrollments if any classes selected
      if (input.classIds.length > 0) {
        const records = input.classIds.map((classId) => ({
          tenant_id: input.tenantId,
          student_id: input.studentId,
          class_id: classId,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        }))

        const { error: insertError } = await this.dataSource
          .from('class_enrollments')
          .insert(records)

        if (insertError) {
          throw insertError
        }
      }

      return {
        success: true,
        error: null,
      }
    } catch (error) {
      console.error('[UpdateStudentClassEnrollmentsUseCase] Error:', error)
      return {
        success: false,
        error: error as Error,
      }
    }
  }
}
