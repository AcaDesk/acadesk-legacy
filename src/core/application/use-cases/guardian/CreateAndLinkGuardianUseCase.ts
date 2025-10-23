/**
 * Create And Link Guardian Use Case
 * 새 보호자 생성 및 학생과 연결 유스케이스
 */

import type { IDataSource } from '@core/domain/data-sources/IDataSource'

export interface CreateAndLinkGuardianInput {
  tenantId: string
  studentId: string
  guardianData: {
    name: string
    phone: string | null
    email: string | null
    relationship: string | null
    occupation: string | null
    address: string | null
  }
  isPrimaryContact: boolean
}

export interface CreateAndLinkGuardianOutput {
  guardianId: string
  success: boolean
  error: Error | null
}

export class CreateAndLinkGuardianUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(input: CreateAndLinkGuardianInput): Promise<CreateAndLinkGuardianOutput> {
    try {
      // 1. Create guardian record
      const { data: newGuardian, error: guardianError } = await this.dataSource
        .from('guardians')
        .insert({
          tenant_id: input.tenantId,
          name: input.guardianData.name,
          phone: input.guardianData.phone,
          email: input.guardianData.email,
          relationship: input.guardianData.relationship,
          occupation: input.guardianData.occupation,
          address: input.guardianData.address,
        })
        .select()
        .maybeSingle()

      if (guardianError) {
        throw guardianError
      }

      if (!newGuardian) {
        throw new Error('Failed to create guardian')
      }

      // 2. Link to student
      const { error: linkError } = await this.dataSource
        .from('student_guardians')
        .insert({
          tenant_id: input.tenantId,
          guardian_id: newGuardian.id,
          student_id: input.studentId,
          relation: input.guardianData.relationship,
          is_primary_contact: input.isPrimaryContact,
          receives_notifications: true,
          receives_billing: false,
          can_pickup: true,
        })

      if (linkError) {
        throw linkError
      }

      return {
        guardianId: newGuardian.id,
        success: true,
        error: null,
      }
    } catch (error) {
      console.error('[CreateAndLinkGuardianUseCase] Error:', error)
      return {
        guardianId: '',
        success: false,
        error: error as Error,
      }
    }
  }
}
