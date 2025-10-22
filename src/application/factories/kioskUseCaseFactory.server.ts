/**
 * Kiosk Use Case Factory (Server-side)
 * 키오스크 유스케이스 팩토리 - Server Actions 및 서버 컴포넌트용
 */

import { createClient } from '@/lib/supabase/server'
import { StudentRepository } from '@/infrastructure/database/student.repository'
import { TodoRepository } from '@/infrastructure/database/todo.repository'
import { AuthenticateWithPinUseCase } from '../use-cases/kiosk/AuthenticateWithPinUseCase.server'
import { GetStudentTodosForTodayUseCase } from '../use-cases/kiosk/GetStudentTodosForTodayUseCase'
import { ToggleTodoCompleteForKioskUseCase } from '../use-cases/kiosk/ToggleTodoCompleteForKioskUseCase'

/**
 * Student 리포지토리 생성 (서버 사이드)
 */
async function createStudentRepository() {
  const supabase = await createClient()
  return new StudentRepository(supabase)
}

/**
 * TODO 리포지토리 생성 (서버 사이드)
 */
async function createTodoRepository() {
  const supabase = await createClient()
  return new TodoRepository(supabase)
}

/**
 * 기본 테넌트 ID 가져오기
 * 환경 변수에서 읽거나, 멀티 테넌트의 경우 도메인에서 추론
 */
function getDefaultTenantId(): string {
  // TODO: 환경 변수나 설정에서 tenantId 가져오기
  // 예: process.env.NEXT_PUBLIC_TENANT_ID
  // 또는 도메인에서 추론: subdomain.acadesk.com → subdomain

  // 임시로 환경 변수 사용 (단일 테넌트)
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID

  if (!tenantId) {
    throw new Error('테넌트 ID를 찾을 수 없습니다. NEXT_PUBLIC_DEFAULT_TENANT_ID 환경 변수를 설정하세요.')
  }

  return tenantId
}

/**
 * AuthenticateWithPin 유스케이스 생성
 *
 * @param tenantId - 테넌트 ID (옵션). 지정하지 않으면 기본 테넌트 ID 사용
 */
export async function createAuthenticateWithPinUseCase(tenantId?: string) {
  const repository = await createStudentRepository()
  const finalTenantId = tenantId || getDefaultTenantId()
  return new AuthenticateWithPinUseCase(repository, finalTenantId)
}

/**
 * GetStudentTodosForToday 유스케이스 생성
 */
export async function createGetStudentTodosForTodayUseCase() {
  const repository = await createTodoRepository()
  return new GetStudentTodosForTodayUseCase(repository)
}

/**
 * ToggleTodoCompleteForKiosk 유스케이스 생성
 */
export async function createToggleTodoCompleteForKioskUseCase() {
  const repository = await createTodoRepository()
  return new ToggleTodoCompleteForKioskUseCase(repository)
}
