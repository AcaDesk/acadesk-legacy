# 비동기 위젯 가이드

## 빠른 시작

새로운 세분화된 에러 처리 및 로딩 상태 관리 시스템이 프로젝트에 적용되었습니다!

### 데모 페이지 확인

실제 동작을 보려면 다음 페이지를 방문하세요:

```
http://localhost:3000/dashboard/demo
```

이 데모 페이지는 다음을 보여줍니다:
- ✅ 독립적으로 로딩되는 비동기 위젯
- ✅ 위젯별 로딩 스켈레톤 (Suspense)
- ✅ 위젯별 에러 처리 (Error Boundary)
- ✅ 격리된 실패 (하나의 위젯 실패가 다른 위젯에 영향 없음)

## 주요 컴포넌트

### 1. 에러 폴백 컴포넌트

**위치:** `src/components/ui/error-fallback.tsx`

다양한 상황에 맞는 에러 UI 제공:

```tsx
import { ErrorFallback } from '@/components/ui/error-fallback'

// 기본 위젯 에러
<ErrorFallback variant="default" />

// 컴팩트 에러 (작은 위젯)
<ErrorFallback variant="compact" />

// 인라인 에러 (리스트 아이템)
<ErrorFallback variant="inline" />

// 전체 페이지 에러
<ErrorFallback variant="full-page" />
```

### 2. 위젯 스켈레톤

**위치:** `src/components/ui/widget-skeleton.tsx`

다양한 위젯 타입을 위한 로딩 스켈레톤:

```tsx
import { WidgetSkeleton, KPIGridSkeleton } from '@/components/ui/widget-skeleton'

// KPI 카드
<WidgetSkeleton variant="stats" />

// 리스트
<WidgetSkeleton variant="list" />

// 차트
<WidgetSkeleton variant="chart" />

// 캘린더
<WidgetSkeleton variant="calendar" />

// KPI 그리드
<KPIGridSkeleton count={6} />
```

### 3. 비동기 위젯 예제

**위치:** `src/components/features/dashboard/`

실제 동작하는 비동기 위젯들:

- `recent-activity-feed-async.tsx` - 최근 활동 피드
- `recent-students-card-async.tsx` - 최근 등록 학생
- `async-widget-example.tsx` - 기본 예제

## 사용 패턴

### 패턴 1: 비동기 Server Component

```tsx
// 1. 비동기 Server Component 생성
async function MyWidgetContent() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('my_table')
    .select('*')

  if (error) throw new Error('데이터 로딩 실패')

  return <Card>{/* 렌더링 */}</Card>
}

// 2. Error Boundary와 Suspense로 감싸기
export function MyWidgetAsync() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorFallback
          error={error}
          resetErrorBoundary={resetErrorBoundary}
        />
      )}
    >
      <Suspense fallback={<WidgetSkeleton variant="list" />}>
        <MyWidgetContent />
      </Suspense>
    </ErrorBoundary>
  )
}

// 3. 페이지에서 사용
export default function Page() {
  return <MyWidgetAsync />
}
```

### 패턴 2: 여러 독립 위젯

```tsx
export default function DashboardPage() {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 각 위젯이 독립적으로 로딩/에러 처리 */}
      <RecentStudentsCardAsync maxDisplay={5} />
      <RecentActivityFeedAsync maxItems={10} />
    </div>
  )
}
```

## 실전 적용 가이드

### 언제 비동기 위젯을 사용해야 하나?

✅ **사용해야 할 때:**
- 로딩 시간이 긴 데이터 (복잡한 쿼리, 대용량 데이터)
- 독립적으로 업데이트되는 데이터
- 실패해도 다른 기능에 영향을 주면 안 되는 경우

❌ **사용하지 말아야 할 때:**
- 빠르게 로드되는 데이터 (KPI 등)
- 페이지 렌더링에 필수적인 데이터
- 데이터 간 의존성이 있는 경우

### 하이브리드 접근 (권장)

```tsx
export default async function DashboardPage() {
  // 1. 빠른 데이터는 서버에서 바로 fetch
  const { data: quickData } = await supabase.rpc('get_kpi_data')

  return (
    <div className="space-y-6">
      {/* 2. 빠른 데이터는 바로 렌더링 */}
      <KPICards data={quickData} />

      {/* 3. 무거운 위젯은 비동기로 스트리밍 */}
      <div className="grid grid-cols-2 gap-6">
        <RecentActivityFeedAsync />
        <ComplexChartWidgetAsync />
      </div>
    </div>
  )
}
```

## 성능 최적화

### 1. 데이터 Prefetching

서버에서 미리 데이터를 가져와 props로 전달:

```tsx
export default async function Page() {
  // 서버에서 prefetch
  const prefetchedData = await fetchData()

  return (
    <ErrorBoundary fallbackRender={ErrorFallback}>
      <Suspense fallback={<WidgetSkeleton />}>
        <Widget initialData={prefetchedData} />
      </Suspense>
    </ErrorBoundary>
  )
}
```

### 2. 캐싱

React Query를 사용하여 클라이언트 사이드 캐싱:

```tsx
'use client'

function MyWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ['widget-data'],
    queryFn: fetchData,
    staleTime: 5 * 60 * 1000, // 5분 캐시
  })

  if (isLoading) return <WidgetSkeleton />
  return <Card>{data}</Card>
}
```

## 테스트

### 에러 시뮬레이션

```tsx
// 개발 중 에러 테스트
async function MyWidget() {
  if (process.env.NODE_ENV === 'development' && Math.random() > 0.5) {
    throw new Error('테스트 에러')
  }
  // 정상 로직
}
```

### 로딩 지연 시뮬레이션

```tsx
async function MyWidget() {
  // 로딩 상태 테스트
  await new Promise(resolve => setTimeout(resolve, 2000))
  // 정상 로직
}
```

## 트러블슈팅

### 문제: 전체 페이지가 로딩됨

**원인:** Suspense가 제대로 적용되지 않았거나, 페이지 레벨 로딩 사용

**해결:**
```tsx
// ❌ 나쁜 예
export default async function Page() {
  const data = await fetchAll() // 모든 데이터 대기
  return <Dashboard data={data} />
}

// ✅ 좋은 예
export default function Page() {
  return (
    <div>
      <Suspense fallback={<Skeleton />}>
        <Widget1 />
      </Suspense>
      <Suspense fallback={<Skeleton />}>
        <Widget2 />
      </Suspense>
    </div>
  )
}
```

### 문제: 타입 에러 (Supabase 쿼리)

**원인:** Supabase의 타입 추론이 배열로 인식

**해결:**
```tsx
const { data: rawData, error } = await supabase
  .from('table')
  .select('*, relation(*)')

// 타입 캐스팅
const data = rawData as unknown as MyInterface[]
```

## 추가 자료

- 📚 **상세 문서:** `docs/error-and-loading-strategy.md`
- 🎯 **데모 페이지:** `/dashboard/demo`
- 🔧 **예제 코드:** `src/components/features/dashboard/async-widget-example.tsx`

## 다음 단계

1. ✅ 데모 페이지 확인 (`/dashboard/demo`)
2. ✅ 기존 위젯 중 무거운 것들을 비동기로 변환
3. ✅ 에러 로깅 통합 (Sentry 등)
4. ✅ 성능 모니터링 추가

---

**문의사항이나 개선 제안이 있으시면 팀에 공유해주세요!** 🚀
