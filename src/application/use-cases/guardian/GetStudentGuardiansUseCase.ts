/**
 * Get Student Guardians Use Case
 * 특정 학생의 연결된 보호자 목록 조회 유스케이스
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'
import type { GuardianRelation } from '@/types/guardian'

export interface StudentGuardian {
  id: string
  user_id: string | null
  name: string
  phone: string | null
  email: string | null
  relationship: string | null
  address: string | null
  occupation: string | null
  relation: GuardianRelation
  is_primary_contact: boolean
  receives_notifications: boolean
  receives_billing: boolean
  can_pickup: boolean
}

export class GetStudentGuardiansUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(tenantId: string, studentId: string): Promise<StudentGuardian[]> {
    const { data, error } = await this.dataSource
      .from('student_guardians')
      .select(`
        relation,
        is_primary_contact,
        receives_notifications,
        receives_billing,
        can_pickup,
        guardians!inner(
          id,
          user_id,
          name,
          phone,
          email,
          relationship,
          occupation,
          address
        )
      `)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw new Error(`Failed to fetch student guardians: ${error.message}`)
    }

    interface StudentGuardianJoin {
      relation: string | null
      is_primary_contact: boolean
      receives_notifications: boolean
      receives_billing: boolean
      can_pickup: boolean
      guardians: {
        id: string
        user_id: string | null
        name: string
        phone: string | null
        email: string | null
        relationship: string | null
        occupation: string | null
        address: string | null
      }
    }

    const guardians: StudentGuardian[] = ((data || []) as unknown as StudentGuardianJoin[]).map((item) => ({
      id: item.guardians.id,
      user_id: item.guardians.user_id,
      name: item.guardians.name,
      phone: item.guardians.phone,
      email: item.guardians.email,
      relationship: item.guardians.relationship,
      address: item.guardians.address,
      occupation: item.guardians.occupation,
      relation: item.relation as GuardianRelation,
      is_primary_contact: item.is_primary_contact,
      receives_notifications: item.receives_notifications,
      receives_billing: item.receives_billing,
      can_pickup: item.can_pickup,
    }))

    return guardians
  }
}
