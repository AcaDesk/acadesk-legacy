# 세분화된 에러 처리 및 로딩 상태 전략

이 문서는 React Suspense와 Error Boundary를 활용한 컴포넌트 단위 에러 처리 및 로딩 상태 관리 전략을 설명합니다.

## 목차

1. [개요](#개요)
2. [핵심 컴포넌트](#핵심-컴포넌트)
3. [사용 패턴](#사용-패턴)
4. [실제 적용 예제](#실제-적용-예제)
5. [Best Practices](#best-practices)

---

## 개요

### 문제점

Next.js의 `error.tsx`와 `loading.tsx`는 라우트 전체에 적용됩니다. 페이지의 일부(예: 작은 위젯)에서 데이터 로딩에 실패하면 전체 페이지가 에러 화면으로 바뀌는 것은 좋지 않은 UX입니다.

### 해결책

**React Suspense**와 **Error Boundary**를 활용하여 에러나 로딩 상태를 **컴포넌트 수준**에서 격리합니다.

```tsx
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Suspense fallback={<WidgetSkeleton />}>
    <AsyncWidget /> {/* 이 컴포넌트에서 에러가 발생해도 다른 위젯은 정상 작동 */}
  </Suspense>
</ErrorBoundary>
```

---

## 핵심 컴포넌트

### 1. ErrorFallback 컴포넌트

위치: `src/components/ui/error-fallback.tsx`

다양한 상황에 맞는 에러 폴백 컴포넌트를 제공합니다.

#### 사용 가능한 Variants

| Variant | 용도 | 특징 |
|---------|------|------|
| `default` | 카드 형태의 위젯 | Card 컴포넌트 기반, 상세 정보 포함 |
| `compact` | 작은 위젯/카드 | 간결한 레이아웃, 최소 공간 사용 |
| `inline` | 리스트 아이템/작은 섹션 | 한 줄 레이아웃, 리스트 내 사용 |
| `full-page` | 전체 페이지 에러 | 중앙 정렬, 홈 버튼 제공 |

#### 예제

```tsx
import { ErrorFallback } from '@/components/ui/error-fallback'

// Default variant (위젯용)
<ErrorFallback
  error={error}
  resetErrorBoundary={resetErrorBoundary}
  variant="default"
  title="데이터 로딩 실패"
  description="데이터를 불러오는 중 문제가 발생했습니다."
/>

// Compact variant (작은 위젯용)
<ErrorFallback
  error={error}
  resetErrorBoundary={resetErrorBoundary}
  variant="compact"
/>

// Full-page variant (전체 페이지 에러)
<ErrorFallback
  error={error}
  variant="full-page"
  title="페이지를 불러올 수 없습니다"
/>
```

### 2. WidgetSkeleton 컴포넌트

위치: `src/components/ui/widget-skeleton.tsx`

다양한 위젯 타입에 맞는 로딩 스켈레톤을 제공합니다.

#### 사용 가능한 Variants

| Variant | 용도 |
|---------|------|
| `stats` | KPI 카드 (숫자 통계) |
| `list` | 리스트 형태 위젯 (학생 목록, 활동 피드) |
| `chart` | 차트/그래프 위젯 |
| `calendar` | 캘린더 위젯 |
| `table` | 테이블 위젯 |
| `default` | 일반 위젯 |

#### 예제

```tsx
import { WidgetSkeleton, KPIGridSkeleton, InlineSkeleton } from '@/components/ui/widget-skeleton'

// Stats skeleton (KPI 카드)
<WidgetSkeleton variant="stats" />

// List skeleton (리스트)
<WidgetSkeleton variant="list" />

// KPI 그리드 (여러 카드)
<KPIGridSkeleton count={6} />

// 인라인 스켈레톤 (리스트 아이템)
<InlineSkeleton />
```

### 3. WidgetErrorBoundary

위치: `src/components/features/dashboard/widget-error-boundary.tsx`

위젯 전용 Error Boundary로, `react-error-boundary` 라이브러리를 사용합니다.

#### 예제

```tsx
import { WidgetErrorBoundary } from '@/components/features/dashboard/widget-error-boundary'

<WidgetErrorBoundary
  widgetId="student-list"
  widgetTitle="학생 목록"
  onReset={() => refetch()}
>
  <StudentListWidget />
</WidgetErrorBoundary>
```

---

## 사용 패턴

### 패턴 1: Client Component with React Query

**가장 일반적인 패턴** - 클라이언트 컴포넌트에서 React Query로 데이터 fetch

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '@/components/ui/error-fallback'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'

function StudentListWidget() {
  const { data: students, isLoading, error } = useQuery({
    queryKey: ['students'],
    queryFn: () => fetchStudents(),
  })

  if (isLoading) return <WidgetSkeleton variant="list" />
  if (error) throw error // ErrorBoundary가 캐치

  return (
    <div>
      {students.map(student => (
        <StudentCard key={student.id} student={student} />
      ))}
    </div>
  )
}

// 사용
export function DashboardPage() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorFallback
          error={error}
          resetErrorBoundary={resetErrorBoundary}
          variant="default"
        />
      )}
    >
      <StudentListWidget />
    </ErrorBoundary>
  )
}
```

### 패턴 2: Server Component with Suspense

**추천 패턴** - 서버 컴포넌트에서 비동기 데이터 fetch

```tsx
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '@/components/ui/error-fallback'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'

// 비동기 Server Component
async function StudentListWidget() {
  const students = await fetchStudents() // await 사용 가능

  return (
    <div>
      {students.map(student => (
        <StudentCard key={student.id} student={student} />
      ))}
    </div>
  )
}

// 사용
export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* 각 위젯이 독립적으로 로딩/에러 처리 */}
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
        )}
      >
        <Suspense fallback={<WidgetSkeleton variant="list" />}>
          <StudentListWidget />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
        )}
      >
        <Suspense fallback={<WidgetSkeleton variant="chart" />}>
          <PerformanceChartWidget />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
```

### 패턴 3: 중첩된 Error Boundary (세분화된 격리)

리스트 내부의 각 아이템을 개별적으로 보호

```tsx
import { ErrorBoundary } from 'react-error-boundary'
import { ListItemErrorFallback } from '@/components/ui/error-fallback'

function StudentList({ students }) {
  return (
    <div className="space-y-4">
      {students.map(student => (
        <ErrorBoundary
          key={student.id}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ListItemErrorFallback
              error={error}
              resetErrorBoundary={resetErrorBoundary}
              itemName="학생 정보"
            />
          )}
        >
          <StudentCard student={student} />
        </ErrorBoundary>
      ))}
    </div>
  )
}
```

### 패턴 4: 대시보드 레이아웃 (여러 독립 위젯)

```tsx
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '@/components/ui/error-fallback'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* KPI 카드 그리드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {['total-students', 'attendance-rate', 'average-score', 'monthly-revenue'].map(
          (widgetId) => (
            <ErrorBoundary
              key={widgetId}
              fallbackRender={({ error, resetErrorBoundary }) => (
                <ErrorFallback
                  error={error}
                  resetErrorBoundary={resetErrorBoundary}
                  variant="compact"
                />
              )}
            >
              <Suspense fallback={<WidgetSkeleton variant="stats" />}>
                <KPIWidget widgetId={widgetId} />
              </Suspense>
            </ErrorBoundary>
          )
        )}
      </div>

      {/* 메인 위젯들 */}
      <div className="grid gap-6 md:grid-cols-2">
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
          )}
        >
          <Suspense fallback={<WidgetSkeleton variant="list" />}>
            <RecentStudentsWidget />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
          )}
        >
          <Suspense fallback={<WidgetSkeleton variant="chart" />}>
            <PerformanceWidget />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  )
}
```

---

## 실제 적용 예제

### 예제 1: 대시보드 페이지

현재 프로젝트의 대시보드는 다음과 같이 구성되어 있습니다:

**파일 위치:**
- `src/app/(dashboard)/dashboard/page.tsx` - Server Component (데이터 fetch)
- `src/app/(dashboard)/dashboard/dashboard-client.tsx` - Client Component (위젯 렌더링)
- `src/app/(dashboard)/dashboard/widget-factory.tsx` - 위젯 팩토리

**현재 구조:**
```tsx
// page.tsx (Server Component)
export default async function DashboardPage() {
  const { data, error } = await supabase.rpc('get_dashboard_data')
  return (
    <PageWrapper>
      <DashboardClient data={data} />
    </PageWrapper>
  )
}

// dashboard-client.tsx (Client Component)
export function DashboardClient({ data }) {
  // 각 위젯이 WidgetErrorBoundary로 감싸져 있음
  return (
    <div className="space-y-6">
      {widgets.map(widget => (
        <WidgetErrorBoundary key={widget.id} widgetId={widget.id}>
          {renderWidget(widget)}
        </WidgetErrorBoundary>
      ))}
    </div>
  )
}
```

### 예제 2: 비동기 위젯 데모

Suspense를 활용한 독립적인 비동기 위젯 예제:

**파일 위치:** `src/components/features/dashboard/async-widget-example.tsx`

```tsx
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'

async function StudentStatsWidget() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('students')
    .select('id', { count: 'exact' })

  if (error) throw new Error('학생 데이터 로딩 실패')

  return <StatsCard title="전체 학생" value={data?.length ?? 0} />
}

export function AsyncWidgetDemo() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ErrorBoundary fallbackRender={ErrorFallback}>
        <Suspense fallback={<WidgetSkeleton variant="stats" />}>
          <StudentStatsWidget />
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}
```

---

## Best Practices

### 1. **위젯 레벨에서 에러 격리**

✅ **좋은 예:**
```tsx
<div className="grid grid-cols-2 gap-4">
  <ErrorBoundary fallbackRender={ErrorFallback}>
    <Widget1 />
  </ErrorBoundary>
  <ErrorBoundary fallbackRender={ErrorFallback}>
    <Widget2 />
  </ErrorBoundary>
</div>
```

❌ **나쁜 예:**
```tsx
<ErrorBoundary fallbackRender={ErrorFallback}>
  <div className="grid grid-cols-2 gap-4">
    <Widget1 />
    <Widget2 />
  </div>
</ErrorBoundary>
```

### 2. **적절한 Skeleton 사용**

위젯 타입에 맞는 skeleton을 사용하세요:

```tsx
// KPI 카드
<Suspense fallback={<WidgetSkeleton variant="stats" />}>

// 리스트
<Suspense fallback={<WidgetSkeleton variant="list" />}>

// 차트
<Suspense fallback={<WidgetSkeleton variant="chart" />}>
```

### 3. **에러 로깅**

프로덕션 환경에서 에러를 추적하세요:

```tsx
<ErrorBoundary
  onError={(error, errorInfo) => {
    console.error('Widget Error:', error, errorInfo)
    // Sentry, LogRocket 등으로 전송
  }}
  fallbackRender={ErrorFallback}
>
  <Widget />
</ErrorBoundary>
```

### 4. **재시도 로직**

사용자가 에러 복구를 시도할 수 있도록 `resetErrorBoundary`를 제공하세요:

```tsx
<ErrorBoundary
  onReset={() => {
    // 상태 초기화, 데이터 refetch 등
    queryClient.invalidateQueries(['widget-data'])
  }}
  fallbackRender={({ error, resetErrorBoundary }) => (
    <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
  )}
>
  <Widget />
</ErrorBoundary>
```

### 5. **개발 vs 프로덕션 환경 구분**

개발 환경에서만 상세 에러 정보를 표시:

```tsx
<ErrorFallback
  error={error}
  showDetails={process.env.NODE_ENV === 'development'}
/>
```

---

## 요약

### 핵심 원칙

1. **격리 (Isolation)**: 각 위젯/섹션을 독립적으로 보호
2. **세분화 (Granularity)**: 가능한 작은 단위로 에러 처리
3. **사용자 경험**: 전체 페이지 대신 해당 영역만 에러 표시
4. **복구 가능성**: 재시도 버튼 제공

### 구현 체크리스트

- [x] `react-error-boundary` 라이브러리 설치
- [x] `ErrorFallback` 컴포넌트 생성 (다양한 variants)
- [x] `WidgetSkeleton` 컴포넌트 생성 (다양한 variants)
- [x] `WidgetErrorBoundary` 업데이트 (react-error-boundary 사용)
- [x] 비동기 위젯 예제 생성 (Suspense 활용)
- [x] 문서화 완료

### 참고 자료

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [React Suspense](https://react.dev/reference/react/Suspense)
- [react-error-boundary 라이브러리](https://github.com/bvaughn/react-error-boundary)
- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
