/**
 * Role types for the application
 *
 * These roles are defined in the ref_roles table and represent
 * the different levels of access within a tenant.
 */

/**
 * User role codes
 * - owner: 원장 (학원 소유자 및 최고 관리자)
 * - instructor: 강사 (수업 담당 강사)
 * - assistant: 조교 (수업 보조 및 행정 업무)
 */
export type RoleCode = 'owner' | 'instructor' | 'assistant'

/**
 * Role information
 */
export interface Role {
  code: RoleCode
  label: string
  description: string
}

/**
 * Role hierarchy mapping (for permission checks)
 * Higher number = more permissions
 */
export const ROLE_HIERARCHY: Record<RoleCode, number> = {
  owner: 3,
  instructor: 2,
  assistant: 1,
}

/**
 * Check if a role has permission (equal or higher level)
 *
 * @param userRole - The user's role
 * @param requiredRole - The required role
 * @returns true if the user has the required permission level
 */
export function hasRolePermission(
  userRole: RoleCode,
  requiredRole: RoleCode
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Role labels for display
 */
export const ROLE_LABELS: Record<RoleCode, string> = {
  owner: '원장',
  instructor: '강사',
  assistant: '조교',
}
