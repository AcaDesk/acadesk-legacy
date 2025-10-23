/**
 * Common Auth Helper Utilities
 *
 * ⚠️ USES SERVICE_ROLE CLIENT - Bypasses RLS
 *
 * 페이지에서 반복되는 인증 및 테넌트 확인 로직을 통합
 *
 * Strategy:
 * 1. Authenticate with regular client (session check)
 * 2. Query database with service_role (bypass RLS)
 */

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { redirect } from 'next/navigation'
import { AuthenticationError, DatabaseError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

/**
 * 현재 인증된 사용자 정보 조회
 * 미인증 시 로그인 페이지로 리다이렉트
 */
export async function requireAuth() {
  const supabase = await createClient()

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()

  if (error || !user) {
    const authError = new AuthenticationError('인증이 필요합니다')
    logError(authError, { originalError: error })
    redirect('/auth/login')
  }

  return { supabase, user }
}

/**
 * 현재 사용자의 tenant_id 조회
 * tenant_id가 없으면 로그인 페이지로 리다이렉트
 *
 * ⚠️ Uses service_role for database query to bypass RLS
 */
export async function getCurrentTenantId() {
  const { supabase, user } = await requireAuth()

  // Use service_role to bypass RLS
  const admin = createServiceRoleClient()
  const { data: userData, error } = await admin
    .from('users')
    .select('tenant_id, role_code')
    .eq('id', user.id)
    .single()

  if (error || !userData?.tenant_id) {
    const dbError = new DatabaseError('사용자 정보를 조회할 수 없습니다', error || undefined)
    logError(dbError, { userId: user.id })
    redirect('/auth/login')
  }

  return {
    supabase,
    user,
    tenantId: userData.tenant_id,
    roleCode: userData.role_code,
  }
}

/**
 * 현재 사용자의 전체 정보 조회 (이름 포함)
 *
 * ⚠️ Uses service_role for database query to bypass RLS
 */
export async function getCurrentUserWithProfile() {
  const { supabase, user } = await requireAuth()

  // Use service_role to bypass RLS
  const admin = createServiceRoleClient()
  const { data: userData, error } = await admin
    .from('users')
    .select('tenant_id, role_code, name, email, phone')
    .eq('id', user.id)
    .single()

  if (error || !userData?.tenant_id) {
    const dbError = new DatabaseError('사용자 프로필을 조회할 수 없습니다', error || undefined)
    logError(dbError, { userId: user.id })
    redirect('/auth/login')
  }

  return {
    supabase,
    user,
    tenantId: userData.tenant_id,
    roleCode: userData.role_code,
    name: userData.name,
    email: userData.email,
    phone: userData.phone,
  }
}

/**
 * 특정 역할 권한 확인
 * @param allowedRoles - 허용된 역할 코드 배열
 */
export async function requireRole(allowedRoles: string[]) {
  const { supabase, user, tenantId, roleCode } = await getCurrentTenantId()

  if (!allowedRoles.includes(roleCode)) {
    const authzError = new AuthenticationError('이 기능에 접근할 권한이 없습니다')
    logError(authzError, {
      userId: user.id,
      userRole: roleCode,
      requiredRoles: allowedRoles,
    })
    redirect('/dashboard')
  }

  return { supabase, user, tenantId, roleCode }
}
