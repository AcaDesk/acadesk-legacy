/**
 * ExamScore Use Case Factory
 * 시험 성적 유스케이스 팩토리 - 의존성 주입을 위한 팩토리 함수들
 */

import { createClient } from '@/lib/supabase/server'
import { ExamScoreRepository } from '@/infrastructure/database/exam-score.repository'

/**
 * 시험 성적 리포지토리 생성 (서버 사이드)
 */
async function createExamScoreRepository() {
  const supabase = await createClient()
  return new ExamScoreRepository(supabase)
}

/**
 * ExamScore 리포지토리 직접 가져오기
 * Use Cases가 필요하지 않을 경우 Repository를 직접 사용
 */
export async function getExamScoreRepository() {
  return createExamScoreRepository()
}
