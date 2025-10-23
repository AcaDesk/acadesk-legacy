/**
 * Tenant Use Case Factory (Client-side)
 * 테넌트 유스케이스 팩토리 - 클라이언트 컴포넌트용
 */

import type { DataSourceConfig } from '@/lib/data-source-provider'
import { createClientDataSource } from '@/lib/data-source-provider'
import { GetTenantCodesUseCase } from '../use-cases/tenant/GetTenantCodesUseCase'

/**
 * GetTenantCodes 유스케이스 생성 (클라이언트)
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createGetTenantCodesUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new GetTenantCodesUseCase(dataSource)
}
