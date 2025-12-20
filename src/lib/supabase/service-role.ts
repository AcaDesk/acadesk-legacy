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

  // Security: Never log service_role key details in production
  // Validate key format without exposing actual values
  if (supabaseServiceRoleKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
    console.warn('[createServiceRoleClient] WARNING: Detected JWT format key. Ensure you are using service_role key, not anon key.')
  }

  // Debug: Log key type (not the actual key)
  const keyPrefix = supabaseServiceRoleKey.substring(0, 20)
  console.log('[createServiceRoleClient] Key prefix:', keyPrefix, 'Length:', supabaseServiceRoleKey.length)

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
