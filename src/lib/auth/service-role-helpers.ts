/**
 * Service Role Auth Helper Utilities
 *
 * ⚠️ CRITICAL SECURITY WARNING ⚠️
 * These functions use service_role client which bypasses RLS!
 *
 * RULES:
 * 1. ONLY use in Server Actions ('use server')
 * 2. ALWAYS verify authentication first (using regular client)
 * 3. ALWAYS manually filter by tenant_id in queries
 * 4. NEVER expose these functions to client components
 *
 * When to use:
 * - Server Actions that need to bypass RLS
 * - Operations that require full database access
 * - System-level operations (e.g., user profile creation)
 *
 * When NOT to use:
 * - Server Components (prefer regular client with RLS)
 * - Simple read operations (RLS is sufficient)
 */

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

/**
 * User context with tenant information
 */
export interface UserWithTenant {
  id: string
  tenant_id: string
  role_code: string
  email: string
  name: string
  approval_status: string
  onboarding_completed: boolean
  tenant?: {
    id: string
    name: string
    slug: string
    timezone: string
    settings: Record<string, any>
  }
}

/**
 * Result type for helper functions
 */
interface HelperResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * 현재 인증된 사용자 및 tenant 정보 조회 (service_role)
 *
 * 워크플로:
 * 1. 일반 client로 인증 확인 (auth.getUser)
 * 2. Service role로 사용자 + tenant 정보 조회 (RLS 우회)
 *
 * ⚠️ 주의: Service role을 사용하므로 인증 검증을 먼저 수행합니다
 *
 * @param options.includeTenant - tenant 정보 포함 여부 (기본: true)
 * @returns 사용자 + tenant 정보 또는 에러
 *
 * @example
 * 'use server'
 *
 * export async function myServerAction() {
 *   const result = await getCurrentUserWithTenant()
 *   if (!result.success) {
 *     return { success: false, error: result.error }
 *   }
 *   const { tenant_id, role_code } = result.data
 *   // ... perform operations
 * }
 */
export async function getCurrentUserWithTenant(
  options: { includeTenant?: boolean } = {}
): Promise<HelperResult<UserWithTenant>> {
  const { includeTenant = true } = options

  try {
    // 1. 인증 확인 (일반 client)
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: '인증되지 않은 사용자입니다.',
      }
    }

    // 2. 사용자 정보 조회 (service_role)
    const serviceClient = createServiceRoleClient()

    const query = serviceClient
      .from('users')
      .select(
        includeTenant
          ? `
            id,
            tenant_id,
            role_code,
            email,
            name,
            approval_status,
            onboarding_completed,
            tenants (
              id,
              name,
              slug,
              timezone,
              settings
            )
          `
          : `
            id,
            tenant_id,
            role_code,
            email,
            name,
            approval_status,
            onboarding_completed
          `
      )
      .eq('id', user.id)

    const { data: userData, error: userError } = await query.maybeSingle()

    if (userError) {
      console.error('[getCurrentUserWithTenant] Query error:', { userId: user.id, error: userError })
      return {
        success: false,
        error: '사용자 정보를 조회하는 중 오류가 발생했습니다.',
      }
    }

    if (!userData) {
      return {
        success: false,
        error: '사용자 정보를 찾을 수 없습니다.',
      }
    }

    return {
      success: true,
      data: userData as unknown as UserWithTenant,
    }
  } catch (error) {
    console.error('[getCurrentUserWithTenant] Exception:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Tenant 접근 권한 검증 (service_role)
 *
 * 현재 사용자가 특정 tenant에 접근 가능한지 확인합니다.
 *
 * @param tenantId - 확인할 tenant ID
 * @returns 접근 가능 여부
 *
 * @example
 * export async function getStudents(tenantId: string) {
 *   const result = await verifyTenantAccess(tenantId)
 *   if (!result.success) {
 *     return { success: false, error: result.error }
 *   }
 *   // ... fetch students for this tenant
 * }
 */
export async function verifyTenantAccess(
  tenantId: string
): Promise<HelperResult<UserWithTenant>> {
  try {
    const result = await getCurrentUserWithTenant({ includeTenant: false })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || '사용자 정보를 가져올 수 없습니다.',
      }
    }

    if (result.data.tenant_id !== tenantId) {
      console.warn('[verifyTenantAccess] Unauthorized access attempt:', {
        userId: result.data.id,
        userTenantId: result.data.tenant_id,
        requestedTenantId: tenantId,
      })
      return {
        success: false,
        error: '이 학원의 데이터에 접근할 권한이 없습니다.',
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    console.error('[verifyTenantAccess] Exception:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 역할 기반 권한 검증 (service_role)
 *
 * 현재 사용자가 특정 역할을 가지고 있는지 확인합니다.
 *
 * @param allowedRoles - 허용된 역할 목록 (e.g., ['owner', 'instructor'])
 * @returns 권한 여부
 *
 * @example
 * export async function deleteStudent(id: string) {
 *   const result = await verifyRolePermission(['owner', 'instructor'])
 *   if (!result.success) {
 *     return { success: false, error: result.error }
 *   }
 *   // ... perform delete
 * }
 */
export async function verifyRolePermission(
  allowedRoles: string[]
): Promise<HelperResult<UserWithTenant>> {
  try {
    const result = await getCurrentUserWithTenant({ includeTenant: false })

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || '사용자 정보를 가져올 수 없습니다.',
      }
    }

    if (!result.data.role_code || !allowedRoles.includes(result.data.role_code)) {
      console.warn('[verifyRolePermission] Unauthorized role:', {
        userId: result.data.id,
        userRole: result.data.role_code,
        requiredRoles: allowedRoles,
      })
      return {
        success: false,
        error: `이 작업을 수행할 권한이 없습니다. 필요한 권한: ${allowedRoles.join(', ')}`,
      }
    }

    return {
      success: true,
      data: result.data,
    }
  } catch (error) {
    console.error('[verifyRolePermission] Exception:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Owner 권한 검증 (service_role)
 *
 * @example
 * export async function updateTenantSettings(settings: any) {
 *   const result = await verifyOwnerPermission()
 *   if (!result.success) {
 *     return { success: false, error: result.error }
 *   }
 *   // ... update tenant settings
 * }
 */
export async function verifyOwnerPermission(): Promise<HelperResult<UserWithTenant>> {
  return verifyRolePermission(['owner'])
}

/**
 * Staff 권한 검증 (owner, instructor, assistant)
 *
 * @example
 * export async function createTodo(data: TodoData) {
 *   const result = await verifyStaffPermission()
 *   if (!result.success) {
 *     return { success: false, error: result.error }
 *   }
 *   // ... create todo
 * }
 */
export async function verifyStaffPermission(): Promise<HelperResult<UserWithTenant>> {
  return verifyRolePermission(['owner', 'instructor', 'assistant'])
}

/**
 * 승인 상태 확인 (service_role)
 *
 * 현재 사용자의 승인 상태를 확인합니다.
 *
 * @returns 승인 상태 정보
 *
 * @example
 * export async function checkMyApprovalStatus() {
 *   const result = await getApprovalStatus()
 *   if (!result.success) {
 *     return { success: false, error: result.error }
 *   }
 *   return { success: true, data: result.data }
 * }
 */
export async function getApprovalStatus(): Promise<
  HelperResult<{
    status: string
    reason?: string
    tenant_id?: string
  }>
> {
  try {
    // 1. 인증 확인
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: '인증되지 않은 사용자입니다.',
      }
    }

    // 2. 승인 상태 조회 (service_role)
    const serviceClient = createServiceRoleClient()
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .select('approval_status, approval_reason, tenant_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError) {
      console.error('[getApprovalStatus] Query error:', { userId: user.id, error: userError })
      return {
        success: false,
        error: '승인 상태를 조회하는 중 오류가 발생했습니다.',
      }
    }

    if (!userData) {
      return {
        success: false,
        error: '사용자 정보를 찾을 수 없습니다.',
      }
    }

    return {
      success: true,
      data: {
        status: userData.approval_status,
        reason: userData.approval_reason || undefined,
        tenant_id: userData.tenant_id || undefined,
      },
    }
  } catch (error) {
    console.error('[getApprovalStatus] Exception:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
