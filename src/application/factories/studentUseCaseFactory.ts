/**
 * Student Use Case Factory
 * 학생 유스케이스 팩토리 - 의존성 주입을 위한 팩토리 함수들
 */

import { createClient } from '@/lib/supabase/server'
import { SupabaseStudentRepository } from '@/infrastructure/database/SupabaseStudentRepository'
import { CreateStudentUseCase } from '../use-cases/student/CreateStudentUseCase'
import { UpdateStudentUseCase } from '../use-cases/student/UpdateStudentUseCase'
import { DeleteStudentUseCase } from '../use-cases/student/DeleteStudentUseCase'
import { GetStudentUseCase } from '../use-cases/student/GetStudentUseCase'
import { WithdrawStudentUseCase } from '../use-cases/student/WithdrawStudentUseCase'

/**
 * 학생 리포지토리 생성 (서버 사이드)
 */
async function createStudentRepository() {
  const supabase = await createClient()
  return new SupabaseStudentRepository(supabase)
}

/**
 * CreateStudent 유스케이스 생성
 */
export async function createCreateStudentUseCase() {
  const repository = await createStudentRepository()
  return new CreateStudentUseCase(repository)
}

/**
 * UpdateStudent 유스케이스 생성
 */
export async function createUpdateStudentUseCase() {
  const repository = await createStudentRepository()
  return new UpdateStudentUseCase(repository)
}

/**
 * DeleteStudent 유스케이스 생성
 */
export async function createDeleteStudentUseCase() {
  const repository = await createStudentRepository()
  return new DeleteStudentUseCase(repository)
}

/**
 * GetStudent 유스케이스 생성
 */
export async function createGetStudentUseCase() {
  const repository = await createStudentRepository()
  return new GetStudentUseCase(repository)
}

/**
 * WithdrawStudent 유스케이스 생성
 */
export async function createWithdrawStudentUseCase() {
  const repository = await createStudentRepository()
  return new WithdrawStudentUseCase(repository)
}
