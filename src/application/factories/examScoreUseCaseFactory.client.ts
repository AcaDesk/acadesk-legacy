/**
 * ExamScore Use Case Factory (Client)
 * 시험 성적 유스케이스 팩토리 - 클라이언트 사이드용
 */

import { createClient } from '@/lib/supabase/client'
import { SupabaseExamScoreRepository } from '@/infrastructure/database/SupabaseExamScoreRepository'

/**
 * 시험 성적 리포지토리 생성 (클라이언트 사이드)
 */
function createExamScoreRepository() {
  const supabase = createClient()
  return new SupabaseExamScoreRepository(supabase)
}

/**
 * ExamScore 리포지토리 직접 가져오기
 * Use Cases가 필요하지 않을 경우 Repository를 직접 사용
 */
export function getExamScoreRepository() {
  return createExamScoreRepository()
}
