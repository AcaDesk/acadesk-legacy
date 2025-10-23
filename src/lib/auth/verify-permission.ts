/**
 * Permission Verification Utilities
 *
 * ⚠️ USES SERVICE_ROLE CLIENT - Bypasses RLS
 *
 * These utilities verify user authentication and permissions in Server Actions and API Routes.
 * They should be called at the beginning of any server-side operation that requires authentication.
 *
 * Strategy:
 * 1. Authenticate with regular client (session check)
 * 2. Query database with service_role (bypass RLS)
 */

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * User context returned after successful authentication
 */
export interface UserContext {
  /** Authenticated user ID */
  userId: string
  /** User's tenant ID */
  tenantId: string
  /** User's role code (e.g., 'owner', 'instructor', 'assistant') */
  roleCode: string
  /** User's email */
  email?: string
  /** User's name */
  name?: string
}

/**
 * Verify that the user is authenticated and has access to the system
 *
 * This function:
 * 1. Checks if the user is authenticated via Supabase Auth
 * 2. Fetches user profile from the database
 * 3. Returns user context for authorization checks
 *
 * @throws {Error} If user is not authenticated or profile is missing
 * @returns Promise<UserContext> User context with tenant and role information
 *
 * @example
 * 'use server'
 *
 * export async function myServerAction() {
 *   const { userId, tenantId, roleCode } = await verifyPermission()
 *   // ... perform operations scoped to tenantId
 * }
 */
export async function verifyPermission(): Promise<UserContext> {
  // 1. Check authentication (regular client)
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('인증이 필요합니다. 다시 로그인해주세요.')
  }

  // 2. Fetch user profile with service_role (bypass RLS)
  const admin = createServiceRoleClient()
  const { data: userData, error: userError } = await admin
    .from('users')
    .select('tenant_id, role_code, name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (userError) {
    console.error('[verifyPermission] Error fetching user data:', {
      userId: user.id,
      code: (userError as any)?.code,
      message: userError.message,
    })
    throw new Error('사용자 정보를 가져오는 중 오류가 발생했습니다.')
  }

  if (!userData) {
    throw new Error('사용자 프로필을 찾을 수 없습니다. 관리자에게 문의하세요.')
  }

  if (!userData.tenant_id) {
    throw new Error('테넌트 정보가 없습니다. 관리자에게 문의하세요.')
  }

  return {
    userId: user.id,
    tenantId: userData.tenant_id,
    roleCode: userData.role_code,
    email: userData.email ?? user.email,
    name: userData.name,
  }
}

/**
 * Verify that the user has a specific role
 *
 * @param allowedRoles Array of role codes that are allowed (e.g., ['owner', 'instructor'])
 * @throws {Error} If user doesn't have one of the allowed roles
 * @returns Promise<UserContext> User context
 *
 * @example
 * // Only owners and instructors can delete templates
 * export async function deleteTodoTemplate(id: string) {
 *   const context = await verifyRole(['owner', 'instructor'])
 *   // ... perform delete
 * }
 */
export async function verifyRole(allowedRoles: string[]): Promise<UserContext> {
  const context = await verifyPermission()

  if (!allowedRoles.includes(context.roleCode)) {
    throw new Error(
      `이 작업을 수행할 권한이 없습니다. 필요한 권한: ${allowedRoles.join(', ')}`
    )
  }

  return context
}

/**
 * Verify that the user is the owner of the tenant
 *
 * @throws {Error} If user is not an owner
 * @returns Promise<UserContext> User context
 *
 * @example
 * export async function deleteTenant() {
 *   const context = await verifyOwner()
 *   // ... perform sensitive operation
 * }
 */
export async function verifyOwner(): Promise<UserContext> {
  return verifyRole(['owner'])
}

/**
 * Verify that the user is staff (owner, instructor, or assistant)
 *
 * @throws {Error} If user is not staff
 * @returns Promise<UserContext> User context
 *
 * @example
 * export async function createTodo(data: TodoData) {
 *   const context = await verifyStaff()
 *   // ... create todo
 * }
 */
export async function verifyStaff(): Promise<UserContext> {
  return verifyRole(['owner', 'instructor', 'assistant'])
}
