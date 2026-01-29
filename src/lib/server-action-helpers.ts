/**
 * Server Action Helper Functions
 *
 * 공통 래퍼 함수로 인증, 에러 처리, 로깅을 표준화합니다.
 *
 * @example
 * // Before (반복되는 패턴)
 * export async function getStudents() {
 *   try {
 *     const { tenantId } = await verifyStaff()
 *     const supabase = createServiceRoleClient()
 *     const { data, error } = await supabase.from('students').select()...
 *     if (error) throw error
 *     return { success: true, data, error: null }
 *   } catch (error) {
 *     console.error('[getStudents] Error:', error)
 *     return { success: false, data: [], error: getErrorMessage(error) }
 *   }
 * }
 *
 * // After (간결한 패턴)
 * export async function getStudents() {
 *   return withServerAction(async ({ tenantId, serviceClient }) => {
 *     const { data, error } = await serviceClient.from('students').select()...
 *     if (error) throw error
 *     return data
 *   }, { actionName: 'getStudents', defaultValue: [] })
 * }
 */

'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { verifyStaff, verifyOwner, verifyRole, type UserContext } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

/**
 * Server Action에서 사용되는 컨텍스트
 */
export interface ServerActionContext extends UserContext {
  /** Service role Supabase client (bypasses RLS) */
  serviceClient: SupabaseClient
}

/**
 * Server Action 결과 타입 (성공 시)
 */
export interface ServerActionSuccess<T> {
  success: true
  data: T
  error: null
}

/**
 * Server Action 결과 타입 (실패 시)
 */
export interface ServerActionError {
  success: false
  data: null
  error: string
}

/**
 * Server Action 결과 유니온 타입
 */
export type ServerActionResult<T> = ServerActionSuccess<T> | ServerActionError

/**
 * Server Action 옵션
 */
export interface ServerActionOptions<TDefault = null> {
  /** 액션 이름 (로깅용) */
  actionName?: string
  /** 실패 시 기본값 (data 필드) */
  defaultValue?: TDefault
  /** 인증 레벨: 'staff' (기본값) | 'owner' | string[] (역할 목록) */
  authLevel?: 'staff' | 'owner' | string[]
}

/**
 * 인증 및 에러 처리를 포함한 Server Action 래퍼
 *
 * @param handler - 실제 비즈니스 로직 함수
 * @param options - 옵션 (액션 이름, 기본값, 인증 레벨)
 * @returns ServerActionResult<T>
 *
 * @example
 * // 기본 사용 (verifyStaff 인증)
 * export async function getItems() {
 *   return withServerAction(async ({ tenantId, serviceClient }) => {
 *     const { data, error } = await serviceClient
 *       .from('items')
 *       .select()
 *       .eq('tenant_id', tenantId)
 *     if (error) throw error
 *     return data
 *   }, { actionName: 'getItems', defaultValue: [] })
 * }
 *
 * // 오너 전용
 * export async function deleteAll() {
 *   return withServerAction(async ({ tenantId, serviceClient }) => {
 *     // ...
 *   }, { actionName: 'deleteAll', authLevel: 'owner' })
 * }
 *
 * // 특정 역할만 허용
 * export async function approveItem() {
 *   return withServerAction(async (ctx) => {
 *     // ...
 *   }, { actionName: 'approveItem', authLevel: ['owner', 'instructor'] })
 * }
 */
export async function withServerAction<T, TDefault = null>(
  handler: (ctx: ServerActionContext) => Promise<T>,
  options: ServerActionOptions<TDefault> = {}
): Promise<ServerActionResult<T | TDefault>> {
  const { actionName = 'unknown', defaultValue = null as TDefault, authLevel = 'staff' } = options

  try {
    // 인증 레벨에 따른 검증
    let userContext: UserContext

    if (authLevel === 'staff') {
      userContext = await verifyStaff()
    } else if (authLevel === 'owner') {
      userContext = await verifyOwner()
    } else if (Array.isArray(authLevel)) {
      userContext = await verifyRole(authLevel)
    } else {
      userContext = await verifyStaff()
    }

    // Service role client 생성
    const serviceClient = createServiceRoleClient()

    // 컨텍스트 조합
    const context: ServerActionContext = {
      ...userContext,
      serviceClient,
    }

    // 핸들러 실행
    const result = await handler(context)

    return {
      success: true,
      data: result,
      error: null,
    }
  } catch (error) {
    console.error(`[${actionName}] Error:`, error)

    return {
      success: false,
      data: defaultValue as T | TDefault extends null ? null : TDefault,
      error: getErrorMessage(error),
    } as ServerActionResult<T | TDefault>
  }
}

/**
 * 데이터 없이 성공/실패만 반환하는 Server Action 래퍼
 *
 * @example
 * export async function deleteItem(id: string) {
 *   return withServerActionVoid(async ({ tenantId, serviceClient }) => {
 *     const { error } = await serviceClient
 *       .from('items')
 *       .delete()
 *       .eq('id', id)
 *       .eq('tenant_id', tenantId)
 *     if (error) throw error
 *   }, { actionName: 'deleteItem' })
 * }
 */
export async function withServerActionVoid(
  handler: (ctx: ServerActionContext) => Promise<void>,
  options: Omit<ServerActionOptions, 'defaultValue'> = {}
): Promise<{ success: true; error: null } | { success: false; error: string }> {
  const { actionName = 'unknown', authLevel = 'staff' } = options

  try {
    // 인증 레벨에 따른 검증
    let userContext: UserContext

    if (authLevel === 'staff') {
      userContext = await verifyStaff()
    } else if (authLevel === 'owner') {
      userContext = await verifyOwner()
    } else if (Array.isArray(authLevel)) {
      userContext = await verifyRole(authLevel)
    } else {
      userContext = await verifyStaff()
    }

    // Service role client 생성
    const serviceClient = createServiceRoleClient()

    // 컨텍스트 조합
    const context: ServerActionContext = {
      ...userContext,
      serviceClient,
    }

    // 핸들러 실행
    await handler(context)

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error(`[${actionName}] Error:`, error)

    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 타입 가드: 성공 결과인지 확인
 */
export function isSuccess<T>(result: ServerActionResult<T>): result is ServerActionSuccess<T> {
  return result.success === true
}

/**
 * 타입 가드: 실패 결과인지 확인
 */
export function isError<T>(result: ServerActionResult<T>): result is ServerActionError {
  return result.success === false
}
