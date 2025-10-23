/**
 * Get Available Guardians Use Case
 * 학생에게 연결 가능한 보호자 목록 조회 유스케이스
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'

export interface AvailableGuardian {
  id: string
  name: string
  phone: string
}

export class GetAvailableGuardiansUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(tenantId: string, studentId: string): Promise<AvailableGuardian[]> {
    // Get all guardians in the tenant
    const { data: allGuardians, error: allError } = await this.dataSource
      .from('guardians')
      .select('id, name, phone')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (allError) {
      throw new Error(`Failed to fetch guardians: ${allError.message}`)
    }

    // Get already linked guardian IDs
    const { data: linkedIds, error: linkedError } = await this.dataSource
      .from('student_guardians')
      .select('guardian_id')
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (linkedError) {
      throw new Error(`Failed to fetch linked guardians: ${linkedError.message}`)
    }

    const linkedIdsArray = Array.isArray(linkedIds) ? linkedIds : []
    const linkedGuardianIds = new Set(linkedIdsArray.map((item: any) => item.guardian_id))

    // Filter out already linked guardians
    const allGuardiansArray = Array.isArray(allGuardians) ? allGuardians : []
    const available = allGuardiansArray
      .filter((g: any) => !linkedGuardianIds.has(g.id))
      .map((g: any) => ({
        id: g.id,
        name: g.name,
        phone: g.phone || '',
      }))

    return available
  }
}
