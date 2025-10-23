/**
 * Get Tenant Codes Use Case
 * 테넌트 코드 조회 유스케이스
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'

export interface TenantCode {
  code: string
  codeType: string
  isActive: boolean
  sortOrder: number
}

export class GetTenantCodesUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(codeType: string): Promise<string[]> {
    const { data, error } = await this.dataSource
      .from('tenant_codes')
      .select('code')
      .eq('code_type', codeType)
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      throw new Error(`Failed to fetch tenant codes: ${error.message}`)
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return []
    }

    return data.map((item: any) => item.code)
  }
}
