import { ReactNode } from 'react'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { BetaBadge } from '@/components/layout/beta-badge'
import { Deprecated } from '@/components/layout/deprecated'
import type { FeatureStatus } from './features.config'

/**
 * 피처 상태별 렌더링 전략을 정의하는 타입
 */
export type FeatureStrategyProps = {
  featureName: string
  description?: string
  estimatedTime?: string
  reason?: string
  replacementFeature?: string
  removalDate?: string
  children: ReactNode
}

/**
 * 피처 상태별 렌더링 전략 맵
 *
 * 이 객체는 각 피처 상태(active, inactive, maintenance 등)에 대해
 * 어떤 컴포넌트를 렌더링할지 정의합니다.
 *
 * 새로운 상태를 추가할 때는 이 파일만 수정하면 되고,
 * 기존 페이지 컴포넌트는 전혀 수정할 필요가 없습니다.
 *
 * @example
 * // 새로운 'limited' 상태 추가하기:
 * export const featureStrategies = {
 *   // ... 기존 전략들
 *   limited: ({ children, featureName }) => (
 *     <LimitedAccess featureName={featureName}>
 *       {children}
 *     </LimitedAccess>
 *   ),
 * }
 */
export const featureStrategies: Record<
  FeatureStatus,
  (props: FeatureStrategyProps) => ReactNode
> = {
  /**
   * 'active' 전략: 정상 운영 중
   * 실제 기능 컴포넌트를 그대로 렌더링합니다.
   */
  active: ({ children }) => children,

  /**
   * 'inactive' 전략: 출시 전 또는 영구 비활성화
   * Coming Soon 페이지를 표시합니다.
   */
  inactive: ({ featureName, description }) => (
    <ComingSoon featureName={featureName} description={description} />
  ),

  /**
   * 'maintenance' 전략: 일시 점검 중
   * Maintenance 페이지를 표시합니다.
   */
  maintenance: ({ featureName, estimatedTime, reason }) => (
    <Maintenance
      featureName={featureName}
      estimatedTime={estimatedTime}
      reason={reason}
    />
  ),

  /**
   * 'beta' 전략: 베타 테스트 중
   * 실제 기능을 표시하되, 베타 배지를 추가합니다.
   */
  beta: ({ featureName, children }) => (
    <BetaBadge featureName={featureName}>{children}</BetaBadge>
  ),

  /**
   * 'deprecated' 전략: 단계적 폐지 예정
   * 실제 기능을 표시하되, 경고 메시지를 추가합니다.
   */
  deprecated: ({ featureName, replacementFeature, removalDate, children }) => (
    <Deprecated
      featureName={featureName}
      replacementFeature={replacementFeature}
      removalDate={removalDate}
    >
      {children}
    </Deprecated>
  ),
}

/**
 * 특정 피처 상태에 대한 전략 함수를 반환합니다.
 *
 * @param status - 피처 상태
 * @returns 해당 상태에 맞는 렌더링 전략 함수
 *
 * @example
 * const strategy = getFeatureStrategy('inactive')
 * return strategy({ featureName: '출석 관리', children: <AttendancePage /> })
 */
export function getFeatureStrategy(status: FeatureStatus) {
  return featureStrategies[status]
}
