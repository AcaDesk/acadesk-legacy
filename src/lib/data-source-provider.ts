/**
 * Data Source Provider
 * 환경에 따라 적절한 DataSource를 반환하는 Provider
 *
 * ⚠️ SECURITY NOTICE:
 * - Server-side는 service_role client 사용 (RLS 우회, 수동 tenant 필터링 필수)
 * - Client-side 직접 접근은 deprecated (Server Actions 사용 권장)
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'
import { SupabaseDataSource } from '@/infrastructure/data-sources/SupabaseDataSource'
import { MockDataSource } from '@/infrastructure/data-sources/MockDataSource'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

/**
 * 환경 타입
 */
export type Environment = 'production' | 'staging' | 'development' | 'test'

/**
 * DataSource 설정
 */
export interface DataSourceConfig {
  /**
   * 환경
   * - 'test': MockDataSource 사용
   * - 'development' | 'staging' | 'production': SupabaseDataSource 사용
   */
  environment?: Environment

  /**
   * 테스트 모드 강제 설정
   * true일 경우 MockDataSource를 사용
   */
  forceMock?: boolean

  /**
   * 커스텀 DataSource 주입 (의존성 주입)
   */
  customDataSource?: IDataSource
}

/**
 * 현재 환경 감지
 */
function detectEnvironment(): Environment {
  // Node.js 환경 변수 체크
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      return 'test'
    }
    if (process.env.NEXT_PUBLIC_ENV === 'staging') {
      return 'staging'
    }
    if (process.env.NODE_ENV === 'production') {
      return 'production'
    }
  }
  return 'development'
}

/**
 * 서버 사이드 DataSource Provider
 * Server Components, API Routes, Server Actions에서 사용
 *
 * ⚠️ CRITICAL: service_role client 사용으로 RLS 우회됨
 * - 모든 Repository 메서드에서 tenantId 필터링 필수
 * - 사용 전 반드시 verifyPermission()으로 인증 확인
 *
 * @example
 * ```typescript
 * 'use server'
 * import { verifyPermission } from '@/lib/auth/verify-permission'
 *
 * export async function myServerAction() {
 *   // 1. 인증 및 tenantId 확인
 *   const { tenantId } = await verifyPermission()
 *
 *   // 2. DataSource 생성 (service_role)
 *   const dataSource = await createServerDataSource()
 *   const repository = new StudentRepository(dataSource)
 *
 *   // 3. tenantId 명시적 전달 필수
 *   const students = await repository.findAll(tenantId)
 * }
 *
 * // 테스트 환경에서 Mock 사용
 * const mockDataSource = await createServerDataSource({ forceMock: true })
 * ```
 */
export async function createServerDataSource(
  config: DataSourceConfig = {}
): Promise<IDataSource> {
  // 커스텀 DataSource가 주입된 경우 바로 반환
  if (config.customDataSource) {
    return config.customDataSource
  }

  const env = config.environment || detectEnvironment()

  // 테스트 환경 또는 forceMock이 true인 경우 MockDataSource 사용
  if (env === 'test' || config.forceMock) {
    return new MockDataSource()
  }

  // ⚠️ service_role client 사용 (RLS 우회)
  const supabaseClient = createServiceRoleClient()
  return new SupabaseDataSource(supabaseClient)
}

/**
 * 테스트용 MockDataSource 생성 헬퍼
 *
 * @example
 * ```typescript
 * const mockDataSource = createMockDataSource()
 * mockDataSource.seed('students', [
 *   { id: '1', name: 'John' },
 *   { id: '2', name: 'Jane' }
 * ])
 * ```
 */
export function createMockDataSource(): MockDataSource {
  return new MockDataSource()
}
