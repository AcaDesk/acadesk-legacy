/**
 * Service Role Client (Server-Side Only)
 *
 * ⚠️ CRITICAL SECURITY WARNING ⚠️
 * This client bypasses Row Level Security (RLS) and has FULL database access.
 *
 * RULES:
 * 1. NEVER import this in client components or pages
 * 2. ONLY use in Server Actions, API Routes, or Server Components
 * 3. ALWAYS verify authentication and permissions before using
 * 4. NEVER expose service_role key to the client
 *
 * @example
 * // ✅ CORRECT: In Server Action
 * 'use server'
 * import { createServiceRoleClient } from '@/lib/supabase/service-role'
 *
 * export async function myServerAction() {
 *   const { user } = await verifyPermission()
 *   const supabase = createServiceRoleClient()
 *   // ... perform database operations
 * }
 *
 * // ❌ WRONG: In Client Component
 * 'use client'
 * import { createServiceRoleClient } from '@/lib/supabase/service-role' // DON'T DO THIS!
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with service_role privileges
 *
 * This client:
 * - Bypasses RLS policies
 * - Has full read/write access to all tables
 * - Should only be used in server-side code after authentication
 *
 * @throws {Error} If SUPABASE_SERVICE_ROLE_KEY is not configured
 * @returns Supabase client with service_role privileges
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not defined. Check your environment variables.'
    )
  }

  if (!supabaseServiceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not defined. This is required for server-side operations. ' +
      'Check your .env.local file and ensure SUPABASE_SERVICE_ROLE_KEY is set.'
    )
  }

  // 디버깅: 키가 올바른지 확인
  const keyPrefix = supabaseServiceRoleKey.substring(0, 20)
  const keyLength = supabaseServiceRoleKey.length

  console.log('[createServiceRoleClient] Debug:', {
    urlPresent: !!supabaseUrl,
    keyLength,
    keyPrefix,
    isAnonKey: keyPrefix.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), // anon key는 보통 이렇게 시작
  })

  // ⚠️ 경고: anon key를 service role로 사용하고 있는지 확인
  if (keyPrefix.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
    console.error('[createServiceRoleClient] WARNING: Using JWT key (possibly anon key) instead of service_role key!')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
