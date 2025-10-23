/**
 * Get Guardians For Contact Use Case
 * 학생의 보호자 연락처 정보 조회 유스케이스
 */

import type { IDataSource } from '@core/domain/data-sources/IDataSource'

export interface GuardianContactInfo {
  id: string
  relationship: string | null
  name: string
  email: string | null
  phone: string | null
}

export class GetGuardiansForContactUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(studentId: string): Promise<GuardianContactInfo[]> {
    const { data, error } = await this.dataSource
      .from('student_guardians')
      .select(`
        guardian_id,
        guardians!inner(
          id,
          relationship,
          name,
          phone,
          email
        )
      `)
      .eq('student_id', studentId)
      .is('deleted_at', null)

    if (error) {
      throw new Error(`Failed to fetch guardians: ${error.message}`)
    }

    if (!data || !Array.isArray(data)) {
      return []
    }

    // Transform the nested structure
    const guardians = data
      .map((item: any) => {
        const guardian = item.guardians
        if (!guardian) return null

        return {
          id: guardian.id,
          relationship: guardian.relationship || null,
          name: guardian.name || '이름 없음',
          email: guardian.email || null,
          phone: guardian.phone || null,
        }
      })
      .filter((g): g is GuardianContactInfo => g !== null)

    return guardians
  }
}
