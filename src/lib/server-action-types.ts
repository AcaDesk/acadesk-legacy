/**
 * Server Action Types and Type Guards
 *
 * 'use server' 모듈에서 분리된 타입 및 타입 가드 함수들
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserContext } from '@/lib/auth/verify-permission'

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
