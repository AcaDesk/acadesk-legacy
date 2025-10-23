/**
 * Link Guardian To Student Use Case
 * 기존 보호자를 학생과 연결 유스케이스
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'

export interface LinkGuardianToStudentInput {
  tenantId: string
  studentId: string
  guardianId: string
  relationship: string
  isPrimaryContact: boolean
}

export interface LinkGuardianToStudentOutput {
  success: boolean
  error: Error | null
}

export class LinkGuardianToStudentUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(input: LinkGuardianToStudentInput): Promise<LinkGuardianToStudentOutput> {
    try {
      const { error } = await this.dataSource
        .from('student_guardians')
        .insert({
          tenant_id: input.tenantId,
          guardian_id: input.guardianId,
          student_id: input.studentId,
          relation: input.relationship,
          is_primary_contact: input.isPrimaryContact,
          receives_notifications: true,
          receives_billing: false,
          can_pickup: true,
        })

      if (error) {
        throw error
      }

      return {
        success: true,
        error: null,
      }
    } catch (error) {
      console.error('[LinkGuardianToStudentUseCase] Error:', error)
      return {
        success: false,
        error: error as Error,
      }
    }
  }
}
