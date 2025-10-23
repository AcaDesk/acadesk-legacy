/**
 * Permission Verification Utilities
 *
 * These utilities verify user authentication and permissions in Server Actions and API Routes.
 * They should be called at the beginning of any server-side operation that requires authentication.
 */

'use server'

import { createClient } from '@/lib/supabase/server'

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
  const supabase = await createClient()

  // 1. Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('인증이 필요합니다. 다시 로그인해주세요.')
  }

  // 2. Fetch user profile (tenant_id, role_code)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('tenant_id, role_code, name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (userError) {
    console.error('[verifyPermission] Error fetching user data:', userError)
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

// ============================================================================
// Assertion-style Helpers
// ============================================================================

/**
 * Assert that user is authenticated (throws if not)
 * Lightweight helper for simple checks
 *
 * @throws {Error} If user is not provided or invalid
 *
 * @example
 * const user = auth.user
 * assertUser(user) // throws if null/undefined
 * // Now TypeScript knows user is defined
 */
export function assertUser(user?: { id: string } | null): asserts user is { id: string } {
  if (!user || !user.id) {
    throw new Error('UNAUTHORIZED: 인증이 필요합니다')
  }
}

/**
 * Assert that user has one of the allowed roles (throws if not)
 *
 * @param roleCode Current user's role code
 * @param allowedRoles Array of allowed role codes
 * @throws {Error} If role is not in allowed list
 *
 * @example
 * assertRole(userData.role_code, ['owner', 'instructor'])
 */
export function assertRole(
  roleCode: string | null | undefined,
  allowedRoles: string[]
): asserts roleCode is string {
  if (!roleCode || !allowedRoles.includes(roleCode)) {
    throw new Error(
      `FORBIDDEN: 이 작업을 수행할 권한이 없습니다. 필요한 권한: ${allowedRoles.join(', ')}`
    )
  }
}

/**
 * Assert that tenant ID exists (throws if not)
 *
 * @param tenantId Current user's tenant ID
 * @throws {Error} If tenant ID is missing
 *
 * @example
 * assertTenantScope(userData.tenant_id)
 */
export function assertTenantScope(tenantId: string | null | undefined): asserts tenantId is string {
  if (!tenantId) {
    throw new Error('NO_TENANT: 테넌트 정보가 없습니다')
  }
}
