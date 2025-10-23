/**
 * Assertion Helpers
 *
 * Lightweight type-safe assertion helpers for authentication and authorization.
 * These are synchronous utility functions (NOT Server Actions).
 */

/**
 * Assert that user is authenticated (throws if not)
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
