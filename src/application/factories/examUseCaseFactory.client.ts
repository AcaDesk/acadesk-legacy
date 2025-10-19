/**
 * Exam Use Case Factory (Client)
 * 시험 유스케이스 팩토리 - 클라이언트 사이드용
 */

import { createClient } from '@/lib/supabase/client'
import { ExamRepository } from '@/infrastructure/database/exam.repository'
import { CreateExamUseCase } from '../use-cases/exam/CreateExamUseCase'
import { UpdateExamUseCase } from '../use-cases/exam/UpdateExamUseCase'
import { DeleteExamUseCase } from '../use-cases/exam/DeleteExamUseCase'
import { GetUpcomingExamsUseCase } from '../use-cases/exam/GetUpcomingExamsUseCase'

/**
 * 시험 리포지토리 생성 (클라이언트 사이드)
 */
function createExamRepository() {
  const supabase = createClient()
  return new ExamRepository(supabase)
}

/**
 * CreateExam 유스케이스 생성
 */
export function createCreateExamUseCase() {
  const repository = createExamRepository()
  return new CreateExamUseCase(repository)
}

/**
 * UpdateExam 유스케이스 생성
 */
export function createUpdateExamUseCase() {
  const repository = createExamRepository()
  return new UpdateExamUseCase(repository)
}

/**
 * DeleteExam 유스케이스 생성
 */
export function createDeleteExamUseCase() {
  const repository = createExamRepository()
  return new DeleteExamUseCase(repository)
}

/**
 * GetUpcomingExams 유스케이스 생성
 */
export function createGetUpcomingExamsUseCase() {
  const repository = createExamRepository()
  return new GetUpcomingExamsUseCase(repository)
}

/**
 * Exam 리포지토리 직접 가져오기 (Use Case 없이 Repository만 필요한 경우)
 */
export function getExamRepository() {
  return createExamRepository()
}
