# FeatureGuard 사용 가이드

전략 패턴을 적용한 새로운 피처 플래그 시스템입니다.

## 📁 구조

```
src/
├── components/
│   ├── features/
│   │   └── FeatureGuard.tsx          # 핵심 가드 컴포넌트
│   └── layout/
│       ├── coming-soon.tsx            # 'inactive' 상태 컴포넌트
│       ├── maintenance.tsx            # 'maintenance' 상태 컴포넌트
│       ├── beta-badge.tsx             # 'beta' 상태 컴포넌트
│       └── deprecated.tsx             # 'deprecated' 상태 컴포넌트
└── lib/
    ├── features.config.ts             # 피처 플래그 설정
    └── feature-strategies.tsx         # 상태별 전략 맵 (핵심!)
```

## 🎯 핵심 개념

### 전략 패턴이란?

USB 포트처럼, **어떤 장치가 꽂힐지 미리 알 필요 없이** 명령만 내리면 연결된 장치가 알아서 동작합니다.

- **컴퓨터** = 페이지 컴포넌트 (`page.tsx`)
- **USB 장치** = 각 상태별 컴포넌트 (ComingSoon, Maintenance 등)
- **USB 포트** = 피처 플래그의 상태 값

## 📝 기본 사용법

### Before (기존 방식 ❌)

```tsx
// ❌ 모든 페이지에서 반복되는 if 문
export default function AttendancePage() {
  const featureStatus = FEATURES.attendanceManagement

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="출석 관리" />
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="출석 관리" />
  }

  if (featureStatus === 'beta') {
    return (
      <BetaBadge featureName="출석 관리">
        <AttendanceContent />
      </BetaBadge>
    )
  }

  if (featureStatus === 'deprecated') {
    return (
      <Deprecated featureName="출석 관리">
        <AttendanceContent />
      </Deprecated>
    )
  }

  return <AttendanceContent />
}
```

**문제점:**
- 새로운 상태 추가 시 모든 페이지 수정 필요
- 코드 중복
- 유지보수 어려움

### After (개선된 방식 ✅)

```tsx
// ✅ 간결하고 선언적인 코드
import { FeatureGuard } from '@/components/features/FeatureGuard'

export default function AttendancePage() {
  return (
    <FeatureGuard
      feature="attendanceManagement"
      featureName="출석 관리"
      description="학생들의 출석을 효율적으로 관리하고 통계를 확인할 수 있습니다."
    >
      <AttendanceContent />
    </FeatureGuard>
  )
}
```

**장점:**
- if 문 완전히 제거
- 새로운 상태 추가 시 페이지 수정 불필요
- 코드가 간결하고 의도가 명확
- 중앙 집중식 관리

## 🚀 다양한 사용 예시

### 1. 기본 사용

```tsx
export default function StudentPage() {
  return (
    <FeatureGuard
      feature="studentManagement"
      featureName="학생 관리"
    >
      <StudentListPage />
    </FeatureGuard>
  )
}
```

### 2. 점검 중 (예상 시간 포함)

```tsx
export default function PaymentPage() {
  return (
    <FeatureGuard
      feature="tuitionManagement"
      featureName="학원비 관리"
      estimatedTime="2024년 11월 15일 오후 3시"
      reason="결제 시스템 업그레이드를 진행 중입니다."
    >
      <PaymentContent />
    </FeatureGuard>
  )
}
```

### 3. Coming Soon (상세 설명 포함)

```tsx
export default function ReportPage() {
  return (
    <FeatureGuard
      feature="reportManagement"
      featureName="학습 리포트"
      description="학생별 학습 진도와 성적을 종합적으로 분석한 리포트를 자동으로 생성합니다."
    >
      <ReportContent />
    </FeatureGuard>
  )
}
```

### 4. 폐지 예정 (대체 기능 안내)

```tsx
export default function OldAnalyticsPage() {
  return (
    <FeatureGuard
      feature="oldAnalytics"
      featureName="구 분석 시스템"
      replacementFeature="새 AI 기반 분석 시스템"
      removalDate="2024년 12월 31일"
    >
      <OldAnalyticsContent />
    </FeatureGuard>
  )
}
```

### 5. 베타 테스트 중

```tsx
export default function AIAnalyticsPage() {
  return (
    <FeatureGuard
      feature="aiAnalytics"
      featureName="AI 기반 분석"
    >
      <AIAnalyticsContent />
    </FeatureGuard>
  )
}
```

## 🔧 새로운 상태 추가하기

**예시: 'limited' 상태 추가 (일부 사용자만 접근 가능)**

### 1단계: features.config.ts 업데이트

```tsx
// src/lib/features.config.ts
export type FeatureStatus =
  | 'active'
  | 'inactive'
  | 'maintenance'
  | 'beta'
  | 'deprecated'
  | 'limited'  // ← 새로운 상태 추가
```

### 2단계: Limited 컴포넌트 생성

```tsx
// src/components/layout/limited.tsx
export function Limited({ featureName, children }) {
  const hasAccess = checkUserAccess() // 사용자 권한 확인

  if (!hasAccess) {
    return <div>이 기능은 프리미엄 사용자만 이용 가능합니다.</div>
  }

  return children
}
```

### 3단계: feature-strategies.tsx에 전략 추가

```tsx
// src/lib/feature-strategies.tsx
import { Limited } from '@/components/layout/limited'

export const featureStrategies = {
  active: ({ children }) => children,
  inactive: ({ featureName, description }) => (
    <ComingSoon featureName={featureName} description={description} />
  ),
  maintenance: ({ featureName, estimatedTime, reason }) => (
    <Maintenance featureName={featureName} estimatedTime={estimatedTime} reason={reason} />
  ),
  beta: ({ featureName, children }) => (
    <BetaBadge featureName={featureName}>{children}</BetaBadge>
  ),
  deprecated: ({ featureName, replacementFeature, removalDate, children }) => (
    <Deprecated featureName={featureName} replacementFeature={replacementFeature} removalDate={removalDate}>
      {children}
    </Deprecated>
  ),
  limited: ({ featureName, children }) => (  // ← 여기만 추가!
    <Limited featureName={featureName}>{children}</Limited>
  ),
}
```

**끝!** 기존 페이지 컴포넌트는 단 한 줄도 수정할 필요 없습니다.

## 💡 useFeatureStatus 훅 사용

컴포넌트 내부에서 피처 상태를 확인해야 할 때:

```tsx
import { useFeatureStatus } from '@/components/features/FeatureGuard'

function AttendanceButton() {
  const { isActive, isBeta, status } = useFeatureStatus('attendanceManagement')

  if (!isActive) {
    return <Button disabled>출석 관리 (준비 중)</Button>
  }

  return (
    <Button>
      출석 관리 {isBeta && <Badge>BETA</Badge>}
    </Button>
  )
}
```

## 🎨 Props 전체 목록

### FeatureGuard Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `feature` | `FeatureKey` | ✅ | 확인할 피처 키 |
| `featureName` | `string` | ✅ | 사용자에게 표시될 기능 이름 |
| `description` | `string` | ❌ | Coming Soon 페이지 설명 |
| `estimatedTime` | `string` | ❌ | Maintenance 예상 완료 시간 |
| `reason` | `string` | ❌ | Maintenance 점검 이유 |
| `replacementFeature` | `string` | ❌ | Deprecated 대체 기능명 |
| `removalDate` | `string` | ❌ | Deprecated 제거 예정일 |
| `children` | `ReactNode` | ✅ | 실제 기능 컴포넌트 |

## 📊 피처 상태별 동작

| Status | 표시 내용 | 사용 시기 |
|--------|-----------|-----------|
| `active` | 실제 기능 (그대로) | 정식 출시 |
| `inactive` | ComingSoon 페이지 | 개발 전/후 |
| `maintenance` | Maintenance 페이지 | 일시 점검 |
| `beta` | 베타 배지 + 실제 기능 | 베타 테스트 |
| `deprecated` | 경고 + 실제 기능 | 단계적 폐지 |

## 🏆 장점 요약

### 1. 개방-폐쇄 원칙 (Open/Closed Principle)
- ✅ 확장에는 열려있고 (새 상태 추가 가능)
- ✅ 수정에는 닫혀있음 (기존 페이지 수정 불필요)

### 2. 단일 책임 원칙 (Single Responsibility)
- 페이지: 기능 구현에만 집중
- FeatureGuard: 접근 제어에만 집중
- 전략 맵: 렌더링 정책 관리에만 집중

### 3. 가독성 & 유지보수성
- 선언적 코드
- 중복 제거
- 의도가 명확

### 4. 확장성
- 새 상태 추가 시 한 파일만 수정
- 기존 코드에 영향 없음

## 🔍 마이그레이션 가이드

### 기존 페이지를 새 방식으로 변경하기

#### Before
```tsx
export default function MyPage() {
  const status = FEATURES.myFeature

  if (status === 'inactive') {
    return <ComingSoon featureName="내 기능" />
  }

  if (status === 'maintenance') {
    return <Maintenance featureName="내 기능" />
  }

  return <MyPageContent />
}
```

#### After
```tsx
import { FeatureGuard } from '@/components/features/FeatureGuard'

export default function MyPage() {
  return (
    <FeatureGuard feature="myFeature" featureName="내 기능">
      <MyPageContent />
    </FeatureGuard>
  )
}
```

## 📚 추가 리소스

- [전략 패턴 설명](https://refactoring.guru/design-patterns/strategy)
- [개방-폐쇄 원칙](https://en.wikipedia.org/wiki/Open%E2%80%93closed_principle)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

**이제 피처 플래그 관리가 훨씬 더 유연하고 확장 가능해졌습니다! 🎉**
