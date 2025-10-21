/**
 * Data Source Provider
 * 환경에 따라 적절한 DataSource를 반환하는 Provider
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'
import { SupabaseDataSource } from '@/infrastructure/data-sources/SupabaseDataSource'
import { MockDataSource } from '@/infrastructure/data-sources/MockDataSource'
import { createClient as createServerClient } from '@/lib/supabase/server'
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
 * @example
 * ```typescript
 * // 기본 사용
 * const dataSource = await createServerDataSource()
 *
 * // 테스트 환경에서 Mock 사용
 * const mockDataSource = await createServerDataSource({ forceMock: true })
 *
 * // 커스텀 DataSource 주입
 * const customDataSource = await createServerDataSource({
 *   customDataSource: myCustomDataSource
 * })
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

  // 실제 Supabase 클라이언트 생성
  const supabaseClient = await createServerClient()
  return new SupabaseDataSource(supabaseClient)
}

/**
 * 클라이언트 사이드 DataSource Provider
 * Client Components에서 사용
 *
 * @example
 * ```typescript
 * // 기본 사용
 * const dataSource = createClientDataSource()
 *
 * // 테스트 환경에서 Mock 사용
 * const mockDataSource = createClientDataSource({ forceMock: true })
 * ```
 */
export function createClientDataSource(
  config: DataSourceConfig = {}
): IDataSource {
  // 커스텀 DataSource가 주입된 경우 바로 반환
  if (config.customDataSource) {
    return config.customDataSource
  }

  const env = config.environment || detectEnvironment()

  // 테스트 환경 또는 forceMock이 true인 경우 MockDataSource 사용
  if (env === 'test' || config.forceMock) {
    return new MockDataSource()
  }

  // 실제 Supabase 클라이언트 생성
  const supabaseClient = createBrowserClient()
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
