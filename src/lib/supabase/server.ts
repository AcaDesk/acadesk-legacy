"use server"

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * 서버 컴포넌트/액션용 Supabase 클라이언트
 * ⚠️ 반드시 서버 컴포넌트, API Route, Server Action에서만 사용하세요!
 * 클라이언트 컴포넌트에서는 createSupabaseBrowserClient() from '@/lib/supabase/client' 사용
 *
 * @example
 * // Server Component
 * import { createServerClient } from '@/lib/supabase/server'
 * const supabase = await createServerClient()
 */
export async function createServerClient() {
  const cookieStore = await cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // Server Component에서는 쿠키 설정 불가 (읽기 전용)
            // 디버깅 필요 시 아래 주석 해제
            // console.warn('Cookie setting failed in Server Component:', error)
          }
        },
      },
    }
  )
}

/**
 * @deprecated Use createServerClient() instead
 * 이전 호환성을 위해 유지하지만, 명확한 이름 사용 권장
 */
export const createClient = createServerClient
