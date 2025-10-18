/**
 * Student Use Case Factory (Client-side)
 * 학생 유스케이스 팩토리 - 클라이언트 컴포넌트용
 */

import { createClient } from '@/lib/supabase/client'
import { SupabaseStudentRepository } from '@/infrastructure/database/SupabaseStudentRepository'
import { CreateStudentUseCase } from '../use-cases/student/CreateStudentUseCase'
import { UpdateStudentUseCase } from '../use-cases/student/UpdateStudentUseCase'
import { DeleteStudentUseCase } from '../use-cases/student/DeleteStudentUseCase'
import { GetStudentUseCase } from '../use-cases/student/GetStudentUseCase'
import { WithdrawStudentUseCase } from '../use-cases/student/WithdrawStudentUseCase'

/**
 * 학생 리포지토리 생성 (클라이언트 사이드)
 */
function createStudentRepository() {
  const supabase = createClient()
  return new SupabaseStudentRepository(supabase)
}

/**
 * CreateStudent 유스케이스 생성
 */
export function createCreateStudentUseCase() {
  const repository = createStudentRepository()
  return new CreateStudentUseCase(repository)
}

/**
 * UpdateStudent 유스케이스 생성
 */
export function createUpdateStudentUseCase() {
  const repository = createStudentRepository()
  return new UpdateStudentUseCase(repository)
}

/**
 * DeleteStudent 유스케이스 생성
 */
export function createDeleteStudentUseCase() {
  const repository = createStudentRepository()
  return new DeleteStudentUseCase(repository)
}

/**
 * GetStudent 유스케이스 생성
 */
export function createGetStudentUseCase() {
  const repository = createStudentRepository()
  return new GetStudentUseCase(repository)
}

/**
 * WithdrawStudent 유스케이스 생성
 */
export function createWithdrawStudentUseCase() {
  const repository = createStudentRepository()
  return new WithdrawStudentUseCase(repository)
}
