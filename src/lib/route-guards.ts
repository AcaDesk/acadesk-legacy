import { getFeatureStatus, type FeatureKey, type FeatureStatus } from './features.config'

/**
 * 공개 경로 목록 (인증 없이 접근 가능)
 */
export const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/signup",
  "/auth/verify-email",
  "/auth/bootstrap",
  "/auth/pending",
  "/auth/owner/setup",
  "/auth/callback",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/link-expired",
] as const

/**
 * 경로가 공개 경로인지 확인
 * - 정확히 일치하는 경로 확인
 * - 특정 하위 경로(prefix) 허용
 * @param pathname - 체크할 경로
 * @returns 공개 경로 여부
 */
export function isPublicPath(pathname: string): boolean {
  // 정확히 일치하는 경로 확인
  if (PUBLIC_PATHS.includes(pathname as any)) {
    return true
  }

  // 특정 하위 경로 허용 (예: /auth/invite/accept?token=)
  if (pathname.startsWith("/auth/invite/accept")) {
    return true
  }

  return false
}

/**
 * 라우트 경로와 피처 플래그 매핑
 * 각 라우트가 어떤 피처 플래그로 보호되는지 정의
 */
const ROUTE_FEATURE_MAP: Record<string, FeatureKey> = {
  '/dashboard': 'dashboard',
  '/calendar': 'calendarIntegration',
  '/students': 'studentManagement',
  '/guardians': 'guardianManagement',
  '/attendance': 'attendanceManagement',
  '/classes': 'classManagement',
  '/grades': 'gradesManagement',
  '/todos': 'todoManagement',
  '/library': 'libraryManagement',
  '/payments': 'tuitionManagement',
  '/reports': 'reportManagement',
  '/consultations': 'consultationManagement',
  '/staff': 'staffManagement',
  '/notifications': 'notificationSystem',
  '/kiosk': 'kioskMode',
  '/settings/subjects': 'subjectManagement',
}

/**
 * 주어진 pathname의 기능 상태를 확인
 * @param pathname - 체크할 경로 (예: /students, /calendar)
 * @returns 'active' | 'inactive' | 'maintenance' | null (매핑되지 않은 경로)
 */
export function getRouteFeatureStatus(pathname: string): FeatureStatus | null {
  // 정확한 매칭 먼저 시도
  if (pathname in ROUTE_FEATURE_MAP) {
    const feature = ROUTE_FEATURE_MAP[pathname]
    return getFeatureStatus(feature)
  }

  // 하위 경로 매칭 (예: /students/123, /students/new 등)
  for (const [route, feature] of Object.entries(ROUTE_FEATURE_MAP)) {
    if (pathname.startsWith(route + '/') || pathname === route) {
      return getFeatureStatus(feature)
    }
  }

  // 매핑되지 않은 라우트는 null 반환 (접근 허용)
  return null
}

/**
 * 주어진 pathname이 비활성화된 기능에 접근하려는지 확인 (하위 호환성)
 * @deprecated getRouteFeatureStatus를 사용하세요
 */
export function isRouteBlocked(pathname: string): boolean {
  const status = getRouteFeatureStatus(pathname)
  return status !== null && status !== 'active'
}

/**
 * 특정 피처가 활성화되어 있는지 확인하고, 비활성화되어 있으면 에러 발생
 * 페이지 컴포넌트에서 사용 (서버 컴포넌트용)
 */
export function requireFeature(feature: FeatureKey): void {
  const status = getFeatureStatus(feature)
  if (status !== 'active') {
    throw new Error(`Feature ${feature} is not active (status: ${status})`)
  }
}
