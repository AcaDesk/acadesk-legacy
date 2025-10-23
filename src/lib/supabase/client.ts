"use client"

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr"

/**
 * 클라이언트 컴포넌트용 Supabase 클라이언트
 * ⚠️ 반드시 클라이언트 컴포넌트에서만 사용하세요!
 * 서버 컴포넌트/액션에서는 createServerClient() from '@/lib/supabase/server' 사용
 *
 * @example
 * // Client Component
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 * const supabase = createClient()
 */
export function createBrowserClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * @deprecated Use createBrowserClient() instead
 * 이전 호환성을 위해 유지하지만, 명확한 이름 사용 권장
 */
export const createClient = createBrowserClient
