/**
 * Exam Use Case Factory
 * 시험 유스케이스 팩토리 - 의존성 주입을 위한 팩토리 함수들
 */

import { createClient } from '@/lib/supabase/server'
import { ExamRepository } from '@/infrastructure/database/exam.repository'
import { CreateExamUseCase } from '../use-cases/exam/CreateExamUseCase'
import { UpdateExamUseCase } from '../use-cases/exam/UpdateExamUseCase'
import { DeleteExamUseCase } from '../use-cases/exam/DeleteExamUseCase'
import { GetUpcomingExamsUseCase } from '../use-cases/exam/GetUpcomingExamsUseCase'

/**
 * 시험 리포지토리 생성 (서버 사이드)
 */
async function createExamRepository() {
  const supabase = await createClient()
  return new ExamRepository(supabase)
}

/**
 * CreateExam 유스케이스 생성
 */
export async function createCreateExamUseCase() {
  const repository = await createExamRepository()
  return new CreateExamUseCase(repository)
}

/**
 * UpdateExam 유스케이스 생성
 */
export async function createUpdateExamUseCase() {
  const repository = await createExamRepository()
  return new UpdateExamUseCase(repository)
}

/**
 * DeleteExam 유스케이스 생성
 */
export async function createDeleteExamUseCase() {
  const repository = await createExamRepository()
  return new DeleteExamUseCase(repository)
}

/**
 * GetUpcomingExams 유스케이스 생성
 */
export async function createGetUpcomingExamsUseCase() {
  const repository = await createExamRepository()
  return new GetUpcomingExamsUseCase(repository)
}

/**
 * Exam 리포지토리 직접 가져오기 (Use Case 없이 Repository만 필요한 경우)
 */
export async function getExamRepository() {
  return createExamRepository()
}
