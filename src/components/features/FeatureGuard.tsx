import { ReactNode } from 'react'
import { getFeatureStatus, type FeatureKey } from '@/lib/features.config'
import { getFeatureStrategy, type FeatureStrategyProps } from '@/lib/feature-strategies'

/**
 * FeatureGuard Props
 */
interface FeatureGuardProps extends Omit<FeatureStrategyProps, 'children'> {
  /** 확인할 피처 키 */
  feature: FeatureKey
  /** 피처가 활성화되었을 때 렌더링할 컴포넌트 */
  children: ReactNode
}

/**
 * FeatureGuard 컴포넌트
 *
 * 피처 플래그 상태에 따라 적절한 컴포넌트를 렌더링하는 가드 컴포넌트입니다.
 * 전략 패턴을 사용하여 각 상태별 렌더링 로직을 분리합니다.
 *
 * ## 사용 방법
 *
 * ```tsx
 * export default function AttendancePage() {
 *   return (
 *     <FeatureGuard
 *       feature="attendanceManagement"
 *       featureName="출석 관리"
 *       description="학생들의 출석을 효율적으로 관리하고 통계를 확인할 수 있습니다."
 *     >
 *       <AttendanceListPage />
 *     </FeatureGuard>
 *   )
 * }
 * ```
 *
 * ## 주요 특징
 *
 * 1. **선언적 사용**: 페이지 컴포넌트는 더 이상 복잡한 분기 로직을 포함하지 않습니다.
 * 2. **확장성**: 새로운 피처 상태 추가 시 이 컴포넌트는 수정할 필요가 없습니다.
 * 3. **재사용성**: 모든 페이지에서 동일한 방식으로 피처 가드를 적용할 수 있습니다.
 *
 * ## 동작 원리
 *
 * 1. `feature` prop으로 전달된 피처 키의 현재 상태를 가져옵니다.
 * 2. 해당 상태에 맞는 렌더링 전략 함수를 `feature-strategies.tsx`에서 찾습니다.
 * 3. 전략 함수를 실행하여 적절한 컴포넌트를 렌더링합니다.
 *
 * @example
 * // 출석 관리 페이지
 * <FeatureGuard
 *   feature="attendanceManagement"
 *   featureName="출석 관리"
 * >
 *   <AttendanceContent />
 * </FeatureGuard>
 *
 * @example
 * // 점검 예정 시간 명시
 * <FeatureGuard
 *   feature="paymentManagement"
 *   featureName="학원비 관리"
 *   estimatedTime="2024년 11월 15일 오후 3시"
 *   reason="결제 시스템 업그레이드"
 * >
 *   <PaymentContent />
 * </FeatureGuard>
 *
 * @example
 * // 폐지 예정 기능
 * <FeatureGuard
 *   feature="oldReportSystem"
 *   featureName="구 리포트 시스템"
 *   replacementFeature="새 리포트 시스템"
 *   removalDate="2024년 12월 31일"
 * >
 *   <OldReportContent />
 * </FeatureGuard>
 */
export function FeatureGuard({
  feature,
  featureName,
  description,
  estimatedTime,
  reason,
  replacementFeature,
  removalDate,
  children,
}: FeatureGuardProps) {
  // 1. 피처의 현재 상태 가져오기
  const currentStatus = getFeatureStatus(feature)

  // 2. 상태에 맞는 렌더링 전략 선택
  const renderStrategy = getFeatureStrategy(currentStatus)

  // 3. 전략 실행 (적절한 컴포넌트 렌더링)
  return (
    <>
      {renderStrategy({
        featureName,
        description,
        estimatedTime,
        reason,
        replacementFeature,
        removalDate,
        children,
      })}
    </>
  )
}

/**
 * FeatureGuard 사용을 위한 헬퍼 훅
 *
 * 컴포넌트 내부에서 피처 상태를 확인해야 할 때 사용합니다.
 *
 * @example
 * function MyComponent() {
 *   const { isActive, isBeta, status } = useFeatureStatus('attendanceManagement')
 *
 *   if (!isActive) return null
 *
 *   return <div>출석 관리 활성화됨</div>
 * }
 */
export function useFeatureStatus(feature: FeatureKey) {
  const status = getFeatureStatus(feature)

  return {
    status,
    isActive: status === 'active',
    isInactive: status === 'inactive',
    isMaintenance: status === 'maintenance',
    isBeta: status === 'beta',
    isDeprecated: status === 'deprecated',
  }
}
