/**
 * Search Guardians Use Case
 * 보호자 검색 유스케이스
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'

export interface GuardianSearchResult {
  id: string
  name: string
  phone: string | null
  email: string | null
  relationship: string | null
}

export class SearchGuardiansUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(tenantId: string, query: string, limit: number = 10): Promise<GuardianSearchResult[]> {
    if (!query || query.length < 2) {
      return []
    }

    const { data, error } = await this.dataSource
      .from('guardians')
      .select('id, name, phone, email, relationship')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(limit)

    if (error) {
      throw new Error(`Failed to search guardians: ${error.message}`)
    }

    if (!data || !Array.isArray(data)) {
      return []
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      phone: item.phone || null,
      email: item.email || null,
      relationship: item.relationship || null,
    }))
  }
}
