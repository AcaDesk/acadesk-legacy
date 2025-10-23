/**
 * Guardian Use Case Factory (Client-side)
 * 보호자 유스케이스 팩토리 - 클라이언트 컴포넌트용
 */

import type { DataSourceConfig } from '@/lib/data-source-provider'
import { createClientDataSource } from '@/lib/data-source-provider'
import { GuardianRepository } from '@/infrastructure/database/guardian.repository'
import { GetGuardiansWithDetailsUseCase } from '../use-cases/guardian/GetGuardiansWithDetailsUseCase'
import { DeleteGuardianUseCase } from '../use-cases/guardian/DeleteGuardianUseCase'
import { GetStudentGuardiansUseCase } from '../use-cases/guardian/GetStudentGuardiansUseCase'
import { GetAvailableGuardiansUseCase } from '../use-cases/guardian/GetAvailableGuardiansUseCase'
import { CreateAndLinkGuardianUseCase } from '../use-cases/guardian/CreateAndLinkGuardianUseCase'
import { LinkGuardianToStudentUseCase } from '../use-cases/guardian/LinkGuardianToStudentUseCase'
import { UnlinkGuardianFromStudentUseCase } from '../use-cases/guardian/UnlinkGuardianFromStudentUseCase'
import { GetGuardiansForContactUseCase } from '../use-cases/guardian/GetGuardiansForContactUseCase'
import { LogGuardianContactUseCase } from '../use-cases/guardian/LogGuardianContactUseCase'
import { SearchGuardiansUseCase } from '../use-cases/guardian/SearchGuardiansUseCase'

/**
 * 보호자 리포지토리 생성 (클라이언트 사이드)
 * @param config - DataSource 설정 (테스트 시 Mock 주입 가능)
 */
function createGuardianRepository(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new GuardianRepository(dataSource)
}

/**
 * GetGuardiansWithDetails 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createGetGuardiansWithDetailsUseCase(config?: DataSourceConfig) {
  const repository = createGuardianRepository(config)
  return new GetGuardiansWithDetailsUseCase(repository)
}

/**
 * DeleteGuardian 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createDeleteGuardianUseCase(config?: DataSourceConfig) {
  const repository = createGuardianRepository(config)
  return new DeleteGuardianUseCase(repository)
}

/**
 * GetStudentGuardians 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createGetStudentGuardiansUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new GetStudentGuardiansUseCase(dataSource)
}

/**
 * GetAvailableGuardians 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createGetAvailableGuardiansUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new GetAvailableGuardiansUseCase(dataSource)
}

/**
 * CreateAndLinkGuardian 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createCreateAndLinkGuardianUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new CreateAndLinkGuardianUseCase(dataSource)
}

/**
 * LinkGuardianToStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createLinkGuardianToStudentUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new LinkGuardianToStudentUseCase(dataSource)
}

/**
 * UnlinkGuardianFromStudent 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createUnlinkGuardianFromStudentUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new UnlinkGuardianFromStudentUseCase(dataSource)
}

/**
 * GetGuardiansForContact 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createGetGuardiansForContactUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new GetGuardiansForContactUseCase(dataSource)
}

/**
 * LogGuardianContact 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createLogGuardianContactUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new LogGuardianContactUseCase(dataSource)
}

/**
 * SearchGuardians 유스케이스 생성
 * @param config - DataSource 설정 (테스트 시 Mock 주입)
 */
export function createSearchGuardiansUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  return new SearchGuardiansUseCase(dataSource)
}
