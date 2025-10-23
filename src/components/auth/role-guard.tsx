'use client'

import { ReactNode } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import type { RoleCode } from '@/core/types/role'
import { Skeleton } from '@ui/skeleton'

interface RoleGuardProps {
  /**
   * 허용된 역할 목록
   * 배열로 전달하여 여러 역할을 허용할 수 있습니다.
   */
  allowedRoles: RoleCode[]

  /**
   * 권한이 있을 때 렌더링할 컴포넌트
   */
  children: ReactNode

  /**
   * 권한이 없을 때 렌더링할 컴포넌트 (선택 사항)
   * 기본값: null (아무것도 렌더링하지 않음)
   */
  fallback?: ReactNode

  /**
   * 로딩 중일 때 렌더링할 컴포넌트 (선택 사항)
   * 기본값: null (아무것도 렌더링하지 않음)
   *
   * Skeleton을 사용하고 싶다면:
   * <RoleGuard
   *   allowedRoles={['owner']}
   *   loadingFallback={<Skeleton className="h-10 w-32" />}
   * >
   *   ...
   * </RoleGuard>
   */
  loadingFallback?: ReactNode

  /**
   * 디버그 모드 (개발 환경에서 권한 체크 로그 출력)
   */
  debug?: boolean
}

/**
 * RoleGuard - 역할 기반 UI 접근 제어 컴포넌트
 *
 * 사용자의 역할에 따라 특정 UI 요소를 표시하거나 숨깁니다.
 * 이 컴포넌트는 UX를 위한 것이며, 실제 보안은 RLS에서 보장합니다.
 *
 * @example
 * // 원장만 삭제 버튼 표시
 * <RoleGuard allowedRoles={['owner']}>
 *   <Button variant="destructive">삭제</Button>
 * </RoleGuard>
 *
 * @example
 * // 원장과 강사만 학생 추가 버튼 표시
 * <RoleGuard allowedRoles={['owner', 'instructor']}>
 *   <AddStudentButton />
 * </RoleGuard>
 *
 * @example
 * // 권한 없을 때 메시지 표시
 * <RoleGuard
 *   allowedRoles={['owner']}
 *   fallback={<p className="text-sm text-muted-foreground">권한이 없습니다.</p>}
 * >
 *   <SecretContent />
 * </RoleGuard>
 *
 * @example
 * // 로딩 중 스켈레톤 표시
 * <RoleGuard
 *   allowedRoles={['owner', 'instructor']}
 *   loadingFallback={<Skeleton className="h-10 w-32" />}
 * >
 *   <AddStudentButton />
 * </RoleGuard>
 */
export function RoleGuard({
  allowedRoles,
  children,
  fallback = null,
  loadingFallback = null,
  debug = false,
}: RoleGuardProps) {
  const { user, loading } = useCurrentUser()

  // 디버그 모드 로그
  if (debug && process.env.NODE_ENV === 'development') {
    console.log('[RoleGuard] Debug Info:', {
      allowedRoles,
      userRole: user?.roleCode,
      loading,
      hasUser: !!user,
    })
  }

  // 1. 로딩 중
  if (loading) {
    return <>{loadingFallback}</>
  }

  // 2. 사용자가 없거나 역할 정보가 없음
  if (!user || !user.roleCode) {
    if (debug && process.env.NODE_ENV === 'development') {
      console.log('[RoleGuard] Access denied: No user or role')
    }
    return <>{fallback}</>
  }

  // 3. 역할 체크
  const hasPermission = allowedRoles.includes(user.roleCode as RoleCode)

  if (!hasPermission) {
    if (debug && process.env.NODE_ENV === 'development') {
      console.log('[RoleGuard] Access denied: Role not allowed', {
        userRole: user.roleCode,
        allowedRoles,
      })
    }
    return <>{fallback}</>
  }

  // 4. 모든 조건을 통과 - 자식 컴포넌트 렌더링
  if (debug && process.env.NODE_ENV === 'development') {
    console.log('[RoleGuard] Access granted')
  }

  return <>{children}</>
}

/**
 * 역할 체크 헬퍼 함수
 * RoleGuard 컴포넌트 외부에서 프로그래밍 방식으로 역할을 체크할 때 사용
 *
 * @example
 * const { user } = useCurrentUser()
 * const canDelete = hasRole(user?.roleCode, ['owner'])
 */
export function hasRole(
  userRole: string | null | undefined,
  allowedRoles: RoleCode[]
): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole as RoleCode)
}

/**
 * 특정 역할인지 체크하는 헬퍼 함수들
 */
export function isOwner(userRole: string | null | undefined): boolean {
  return userRole === 'owner'
}

export function isInstructor(userRole: string | null | undefined): boolean {
  return userRole === 'instructor'
}

export function isAssistant(userRole: string | null | undefined): boolean {
  return userRole === 'assistant'
}

/**
 * 최소 역할 요구사항 체크 (계층적 권한)
 * owner > instructor > assistant 순서
 *
 * @example
 * // 강사 이상(강사, 원장)만 허용
 * const canEdit = hasMinimumRole(user?.roleCode, 'instructor')
 */
export function hasMinimumRole(
  userRole: string | null | undefined,
  minimumRole: RoleCode
): boolean {
  if (!userRole) return false

  const roleHierarchy: Record<RoleCode, number> = {
    owner: 3,
    instructor: 2,
    assistant: 1,
  }

  const userLevel = roleHierarchy[userRole as RoleCode]
  const requiredLevel = roleHierarchy[minimumRole]

  return userLevel >= requiredLevel
}
