/**
 * Class Use Case Factory (Client-side)
 * 클라이언트 사이드 Use Case 생성 팩토리
 */

import { createClientDataSource, DataSourceConfig } from '@/lib/data-source-provider'
import { ClassRepository } from '@/infrastructure/database/class.repository'
import { GetClassesWithDetailsUseCase } from '@/application/use-cases/class/GetClassesWithDetailsUseCase'
import { GetActiveClassesUseCase } from '@/application/use-cases/class/GetActiveClassesUseCase'
import { GetRecentClassSessionsUseCase } from '@/application/use-cases/class/GetRecentClassSessionsUseCase'

/**
 * GetClassesWithDetails Use Case 생성 (클라이언트)
 */
export function createGetClassesWithDetailsUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  const repository = new ClassRepository(dataSource)
  return new GetClassesWithDetailsUseCase(repository)
}

/**
 * GetActiveClasses Use Case 생성 (클라이언트)
 */
export function createGetActiveClassesUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  const repository = new ClassRepository(dataSource)
  return new GetActiveClassesUseCase(repository)
}

/**
 * GetRecentClassSessions Use Case 생성 (클라이언트)
 */
export function createGetRecentClassSessionsUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new GetRecentClassSessionsUseCase(dataSource)
}
