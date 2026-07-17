/**
 * System Execution Context (크론/백그라운드 작업용)
 *
 * ⚠️ 보안 주의: 이 컨텍스트가 설정되면 verifyPermission()의 세션 인증을 건너뜁니다.
 * 반드시 시크릿 검증(예: CRON_SECRET Bearer 토큰)을 통과한 신뢰된 서버 진입점에서만
 * runWithSystemContext()를 호출해야 하며, 컨텍스트 값은 요청 입력이 아닌
 * DB에서 조회한 값(예: batch_jobs.created_by 사용자)으로만 구성해야 합니다.
 *
 * 용도: Vercel Cron 등 세션이 없는 환경에서 verifyStaff() 기반 서버 액션 체인을
 * "작업을 예약한 스태프" 자격으로 실행하기 위함.
 */

import { AsyncLocalStorage } from 'node:async_hooks'
import type { UserContext } from '@/lib/auth/verify-permission'

const systemContextStorage = new AsyncLocalStorage<UserContext>()

/**
 * 주어진 사용자 컨텍스트로 fn을 실행한다.
 * fn 내부(및 그 안의 모든 async 호출 체인)에서 verifyPermission()은
 * 세션 검증 없이 이 컨텍스트를 반환한다.
 */
export function runWithSystemContext<T>(
  context: UserContext,
  fn: () => Promise<T>
): Promise<T> {
  return systemContextStorage.run(context, fn)
}

/** 현재 시스템 컨텍스트 (미설정 시 undefined) */
export function getSystemContext(): UserContext | undefined {
  return systemContextStorage.getStore()
}
