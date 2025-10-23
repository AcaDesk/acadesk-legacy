/**
 * Unlink Guardian From Student Use Case
 * 보호자와 학생의 연결 해제 유스케이스 (soft delete)
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'

export interface UnlinkGuardianFromStudentInput {
  tenantId: string
  studentId: string
  guardianId: string
}

export interface UnlinkGuardianFromStudentOutput {
  success: boolean
  error: Error | null
}

export class UnlinkGuardianFromStudentUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(input: UnlinkGuardianFromStudentInput): Promise<UnlinkGuardianFromStudentOutput> {
    try {
      const { error } = await this.dataSource
        .from('student_guardians')
        .update({ deleted_at: new Date().toISOString() })
        .eq('tenant_id', input.tenantId)
        .eq('guardian_id', input.guardianId)
        .eq('student_id', input.studentId)

      if (error) {
        throw error
      }

      return {
        success: true,
        error: null,
      }
    } catch (error) {
      console.error('[UnlinkGuardianFromStudentUseCase] Error:', error)
      return {
        success: false,
        error: error as Error,
      }
    }
  }
}
