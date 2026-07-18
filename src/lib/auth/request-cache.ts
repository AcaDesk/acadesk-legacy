/**
 * 요청 단위 인증 캐시 (React cache)
 *
 * 한 번의 요청(RSC 렌더/서버 액션) 안에서 페이지의 requireAuth()와
 * 각 서버 액션의 verifyStaff()가 각각 supabase.auth.getUser() + users 조회를
 * 반복하면 탭 이동 한 번에 Supabase 왕복이 수 회~십수 회 누적된다.
 *
 * React cache()는 같은 요청 안에서만 결과를 메모이즈하므로(요청 간 공유 없음)
 * 보안 의미는 그대로 유지하면서 중복 왕복만 제거한다.
 */

import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * supabase.auth.getUser() — 요청당 1회만 Supabase Auth 서버 왕복.
 * 반환된 supabase 클라이언트는 같은 요청 내 재사용 가능(쿠키 기반).
 */
export const getCachedAuthUser = cache(async () => {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { supabase, user, error }
})

/**
 * users 프로필 행 — 요청당 userId별 1회만 조회.
 * 모든 호출처가 공유할 수 있도록 필요한 컬럼의 상위집합을 select한다.
 */
export const getCachedUserRow = cache(async (userId: string) => {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('users')
    .select('tenant_id, role_code, name, email, phone')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle()
  return { data, error }
})
