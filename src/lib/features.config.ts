/**
 * Feature Flags Configuration (State-based)
 *
 * 기능별 상태를 관리합니다.
 * - 'active': 정상 운영 중 (모든 사용자 접근 가능)
 * - 'inactive': 출시 전 또는 영구 비활성화 (Coming Soon 페이지 표시)
 * - 'maintenance': 일시 점검 중 (Maintenance 페이지 표시)
 * - 'beta': 베타 테스트 중 (일부 사용자만 접근 가능, 베타 배지 표시)
 * - 'deprecated': 단계적 폐지 예정 (Deprecated 경고 표시)
 */

export type FeatureStatus = 'active' | 'inactive' | 'maintenance' | 'beta' | 'deprecated'

export const FEATURES = {
  // ========================================
  // 1차 배포: 핵심 기능 (Core Features)
  // ========================================

  /** 대시보드 */
  dashboard: 'active' as FeatureStatus,

  /** 회원가입 */
  signup: 'active' as FeatureStatus,

  /** 학생 관리 */
  studentManagement: 'active' as FeatureStatus,

  /** 출석 관리 */
  attendanceManagement: 'inactive' as FeatureStatus,

  /** 성적 관리 */
  gradesManagement: 'inactive' as FeatureStatus,

  /** TODO 관리 (자율 학습) */
  todoManagement: 'active' as FeatureStatus,

  /** 수업 관리 */
  classManagement: 'inactive' as FeatureStatus,

  /** 보호자 관리 */
  guardianManagement: 'inactive' as FeatureStatus,

  // ========================================
  // 2차 배포: 추가 기능 (Additional Features)
  // ========================================

  /** 상담 관리 */
  consultationManagement: 'inactive' as FeatureStatus,

  /** 도서관 (도서 대여) */
  libraryManagement: 'inactive' as FeatureStatus,

  /** 리포트 (학습 리포트) */
  reportManagement: 'inactive' as FeatureStatus,

  /** 알림 시스템 */
  notificationSystem: 'inactive' as FeatureStatus,

  /** 직원 관리 */
  staffManagement: 'inactive' as FeatureStatus,

  // ========================================
  // 3차 배포: 고급 기능 (Advanced Features)
  // ========================================

  /** 학원비 관리 */
  tuitionManagement: 'inactive' as FeatureStatus,

  /** 학부모 앱 */
  parentApp: 'inactive' as FeatureStatus,

  /** 캘린더 통합 */
  calendarIntegration: 'inactive' as FeatureStatus,

  /** 키오스크 모드 */
  kioskMode: 'active' as FeatureStatus,

  /** 과목 관리 */
  subjectManagement: 'inactive' as FeatureStatus,

  // ========================================
  // 개발 중 (In Development)
  // ========================================

  /** AI 기반 분석 */
  aiAnalytics: 'inactive' as FeatureStatus,

  /** 자동화 워크플로우 */
  automationWorkflow: 'inactive' as FeatureStatus,
} as const

export type FeatureKey = keyof typeof FEATURES

/**
 * 특정 기능이 활성화되어 있는지 확인
 */
export function isFeatureActive(feature: FeatureKey): boolean {
  return FEATURES[feature] === 'active'
}

/**
 * 특정 기능이 점검 중인지 확인
 */
export function isFeatureMaintenance(feature: FeatureKey): boolean {
  return FEATURES[feature] === 'maintenance'
}

/**
 * 특정 기능이 비활성화(출시 전)인지 확인
 */
export function isFeatureInactive(feature: FeatureKey): boolean {
  return FEATURES[feature] === 'inactive'
}

/**
 * 특정 기능이 베타 테스트 중인지 확인
 */
export function isFeatureBeta(feature: FeatureKey): boolean {
  return FEATURES[feature] === 'beta'
}

/**
 * 특정 기능이 단계적 폐지 예정인지 확인
 */
export function isFeatureDeprecated(feature: FeatureKey): boolean {
  return FEATURES[feature] === 'deprecated'
}

/**
 * 기능이 사용 가능한지 확인 (active 또는 beta 상태)
 */
export function isFeatureAvailable(feature: FeatureKey): boolean {
  const status = FEATURES[feature]
  return status === 'active' || status === 'beta'
}

/**
 * 기능의 현재 상태 반환
 */
export function getFeatureStatus(feature: FeatureKey): FeatureStatus {
  return FEATURES[feature]
}

/**
 * 여러 기능이 모두 활성화되어 있는지 확인
 */
export function areAllFeaturesActive(...features: FeatureKey[]): boolean {
  return features.every((feature) => isFeatureActive(feature))
}

/**
 * 여러 기능 중 하나라도 활성화되어 있는지 확인
 */
export function isAnyFeatureActive(...features: FeatureKey[]): boolean {
  return features.some((feature) => isFeatureActive(feature))
}
