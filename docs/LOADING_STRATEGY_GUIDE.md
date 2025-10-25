# 로딩 전략 완벽 가이드

Acadesk 프로젝트에서 사용자 경험을 극대화하기 위한 케이스별 로딩 전략입니다.

## 📋 목차

1. [전체 개요](#전체-개요)
2. [Link vs router.push 완벽 가이드](#link-vs-routerpush-완벽-가이드)
3. [케이스 1: 페이지 이동 시](#케이스-1-페이지-이동-시)
4. [케이스 2: 버튼 클릭 및 폼 제출 시](#케이스-2-버튼-클릭-및-폼-제출-시)
5. [케이스 3: 개별 위젯 로딩 시](#케이스-3-개별-위젯-로딩-시)
6. [구현 체크리스트](#구현-체크리스트)

---

## 전체 개요

### 핵심 원칙

> **"사용자는 기다리는 것보다, '무언가 일어나고 있다'는 것을 보는 것을 선호한다"**

모든 로딩 상태는 다음 3가지 원칙을 따릅니다:

1. **즉시성 (Immediacy)**: 클릭/탭 즉시 시각적 피드백
2. **명확성 (Clarity)**: 무엇이 로딩 중인지 명확히 표시
3. **일관성 (Consistency)**: 전체 앱에서 동일한 패턴 사용

### 로딩 전략 맵

| 케이스 | 추천 전략 | 체감 속도 개선 | 구현 난이도 |
|--------|----------|--------------|------------|
| 페이지 이동 | 스켈레톤 로더 | ★★★★★ | ⭐⭐ |
| 버튼/폼 제출 | 인라인 스피너 | ★★★★☆ | ⭐ |
| 개별 위젯 | Suspense | ★★★★★ | ⭐⭐⭐ |

---

## 케이스 1: 페이지 이동 시

### 문제 상황

```
사용자 행동: "학생 관리" 메뉴 클릭
현재 상태: [클릭] → ⏳ 빈 화면 3초... → [페이지 로드]
사용자 반응: "고장 났나?" "멈췄나?" 😰
```

### 해결 방법: `loading.tsx` 파일

Next.js App Router는 자동으로 `loading.tsx`를 감지하여 페이지 로딩 시 표시합니다.

#### 1️⃣ 공통 로딩 스피너 (간편한 방법)

**파일 위치**: `app/(dashboard)/loading.tsx`

```tsx
import { Loader2 } from 'lucide-react'

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  )
}
```

**장점**:
- ✅ 5분 안에 구현 가능
- ✅ 모든 대시보드 페이지에 자동 적용
- ✅ 즉시 피드백 제공

**단점**:
- ❌ 레이아웃 시프트 발생 (페이지 구조가 달라 보임)

#### 2️⃣ 페이지별 스켈레톤 로더 (권장 방법)

**파일 위치**: `app/(dashboard)/students/loading.tsx`

```tsx
import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function StudentsLoading() {
  return <PageSkeleton variant="list" />
}
```

**`PageSkeleton` 컴포넌트 variants**:

| Variant | 사용 페이지 예시 | 특징 |
|---------|---------------|------|
| `list` | 학생 목록, 수업 목록 | 검색바 + 테이블 형태 |
| `grid` | 상담 목록, 리포트 목록 | 통계 카드 + 그리드 |
| `detail` | 학생 상세, 수업 상세 | 헤더 + 탭 + 통계 |
| `form` | 성적 입력, 학생 등록 | 폼 필드 스켈레톤 |
| `dashboard` | 대시보드 | KPI + 위젯 그리드 |

**구현 예시**:

```tsx
// app/(dashboard)/students/loading.tsx
import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function StudentsLoading() {
  return <PageSkeleton variant="list" />
}

// app/(dashboard)/grades/loading.tsx
export default function GradesLoading() {
  return <PageSkeleton variant="form" />
}

// app/(dashboard)/consultations/loading.tsx
export default function ConsultationsLoading() {
  return <PageSkeleton variant="grid" />
}
```

**사용자 경험 개선**:

```
Before: [클릭] → ⏳ 빈 화면 3초... → [페이지]
After:  [클릭] → 💀 스켈레톤 즉시 표시 → [페이지] (체감 속도 80% 개선)
```

---

## 케이스 2: 버튼 클릭 및 폼 제출 시

### 문제 상황

```
사용자 행동: [저장] 버튼 클릭
현재 상태: 버튼 눌림 → ... (아무 변화 없음) ... → 2초 후 토스트 알림
사용자 반응: "눌렸나?" → 다시 클릭 → 중복 제출 발생 😱
```

### 해결 방법: 버튼 내부 로딩 상태

#### 기본 패턴

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function StudentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Server Action 호출
      await saveStudent(formData)

      toast({
        title: '저장 완료',
        description: '학생 정보가 저장되었습니다.',
      })
    } catch (error) {
      toast({
        title: '저장 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 폼 필드들 */}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            저장 중...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            저장
          </>
        )}
      </Button>
    </form>
  )
}
```

#### 재사용 가능한 LoadingButton 컴포넌트

**파일 위치**: `components/ui/loading-button.tsx`

```tsx
import { Button, ButtonProps } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { forwardRef } from 'react'

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ children, loading, loadingText, disabled, ...props }, ref) => {
    return (
      <Button ref={ref} disabled={loading || disabled} {...props}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Button>
    )
  }
)

LoadingButton.displayName = 'LoadingButton'
```

**사용 예시**:

```tsx
import { LoadingButton } from '@/components/ui/loading-button'

<LoadingButton
  loading={isSubmitting}
  loadingText="저장 중..."
  type="submit"
>
  저장
</LoadingButton>
```

#### 다양한 버튼 상황별 패턴

**1. 삭제 버튼 (Destructive Action)**

```tsx
<LoadingButton
  variant="destructive"
  loading={isDeleting}
  loadingText="삭제 중..."
  onClick={handleDelete}
>
  <Trash2 className="mr-2 h-4 w-4" />
  삭제
</LoadingButton>
```

**2. 다중 버튼 (저장 vs 취소)**

```tsx
<div className="flex gap-2">
  <LoadingButton
    loading={isSubmitting}
    loadingText="저장 중..."
    type="submit"
  >
    저장
  </LoadingButton>

  <Button
    variant="outline"
    disabled={isSubmitting}
    onClick={onCancel}
  >
    취소
  </Button>
</div>
```

**3. 아이콘 버튼**

```tsx
<LoadingButton
  size="icon"
  variant="ghost"
  loading={isRefreshing}
  onClick={handleRefresh}
>
  <RefreshCw className="h-4 w-4" />
</LoadingButton>
```

**사용자 경험 개선**:

```
Before: [클릭] → ... (무반응) ... → 토스트
After:  [클릭] → 버튼 '저장 중...' + 스피너 → 토스트 (안정감 100% 개선)
```

---

## 케이스 3: 개별 위젯 로딩 시

### 문제 상황

```
대시보드 로딩:
- KPI 카드 (0.2초) ✅ 즉시 로드
- 최근 학생 (0.3초) ✅ 빠르게 로드
- 최근 활동 피드 (2.5초) ⏳ ← 전체 페이지가 2.5초 기다림
```

### 해결 방법: React Suspense

#### 기본 구조

**1. 데이터를 불러오는 위젯을 별도 파일로 분리**

```tsx
// components/features/dashboard/recent-activity-feed-async.tsx
import { getRecentActivities } from '@/app/actions/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export async function RecentActivityFeedAsync() {
  // 서버에서 데이터 패칭 (느릴 수 있음)
  const activities = await getRecentActivities()

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 활동</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 활동 목록 렌더링 */}
      </CardContent>
    </Card>
  )
}
```

**2. 스켈레톤 로더 생성**

```tsx
// components/features/dashboard/activity-skeleton.tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ActivitySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

**3. 페이지에서 Suspense로 감싸기**

```tsx
// app/(dashboard)/page.tsx
import { Suspense } from 'react'
import { RecentActivityFeedAsync } from '@/components/features/dashboard/recent-activity-feed-async'
import { ActivitySkeleton } from '@/components/features/dashboard/activity-skeleton'
import { KPICards } from '@/components/features/dashboard/kpi-cards'

export default async function DashboardPage() {
  // 빠른 데이터는 즉시 패칭
  const kpiData = await getKPIData() // 0.2초

  return (
    <div className="space-y-6">
      {/* 즉시 렌더링 */}
      <KPICards data={kpiData} />

      {/* 느린 위젯은 Suspense로 감싸기 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Suspense fallback={<ActivitySkeleton />}>
          <RecentActivityFeedAsync />
        </Suspense>

        <Suspense fallback={<ActivitySkeleton />}>
          <AnotherSlowWidgetAsync />
        </Suspense>
      </div>
    </div>
  )
}
```

#### 고급 패턴: 에러 바운더리와 함께 사용

```tsx
import { Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { WidgetErrorFallback } from '@/components/ui/error-fallback'

<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <WidgetErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
  )}
>
  <Suspense fallback={<ActivitySkeleton />}>
    <RecentActivityFeedAsync />
  </Suspense>
</ErrorBoundary>
```

#### 언제 Suspense를 사용할까?

✅ **사용해야 할 때**:
- 데이터 로딩 시간이 1초 이상인 위젯
- 페이지의 다른 부분과 독립적인 위젯
- 실패해도 페이지 전체에 영향 없는 위젯 (최근 활동, 통계 차트 등)

❌ **사용하지 말아야 할 때**:
- 빠른 데이터 (0.5초 미만)
- 페이지의 핵심 콘텐츠 (학생 목록, 성적표 등)
- 서로 의존성이 있는 위젯들

**사용자 경험 개선**:

```
Before: [페이지 로드] → ⏳ 2.5초 대기 → [전체 표시]
After:  [페이지 로드] → KPI 즉시 표시 + 위젯 스켈레톤 → 위젯 순차 로드
        (체감 로딩 시간: 2.5초 → 0.2초)
```

---

## 구현 체크리스트

### 📝 Phase 1: 필수 구현 (1-2시간)

- [ ] `app/(dashboard)/loading.tsx` 생성 (공통 스피너)
- [ ] `LoadingButton` 컴포넌트 생성
- [ ] 모든 폼 제출 버튼을 `LoadingButton`으로 교체

### 📝 Phase 2: 페이지별 최적화 (3-4시간)

- [ ] 주요 페이지별 `loading.tsx` 생성:
  - [ ] `students/loading.tsx`
  - [ ] `grades/loading.tsx`
  - [ ] `attendance/loading.tsx`
  - [ ] `classes/loading.tsx`
  - [ ] `consultations/loading.tsx`

### 📝 Phase 3: 고급 최적화 (3-5시간)

- [ ] 대시보드의 느린 위젯을 Suspense로 분리
- [ ] 에러 바운더리 추가
- [ ] 상세 페이지에 Suspense 적용 (학생 상세 탭 등)

### 📝 Phase 4: 폴리싱 (1-2시간)

- [ ] 모든 삭제 버튼에 확인 다이얼로그 + 로딩 상태 추가
- [ ] 다중 선택 작업에 진행률 표시 추가
- [ ] 페이지 전환 애니메이션 미세 조정

---

## 실전 예시 모음

### 예시 1: 학생 등록 폼

```tsx
'use client'

import { useState } from 'react'
import { LoadingButton } from '@/components/ui/loading-button'
import { Input } from '@/components/ui/input'
import { createStudent } from '@/app/actions/students'

export function StudentRegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      await createStudent(formData)
      // 성공 처리
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="name" placeholder="학생 이름" required />
      <Input name="grade" placeholder="학년" required />

      <div className="flex gap-2">
        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText="등록 중..."
        >
          등록
        </LoadingButton>
        <Button variant="outline" disabled={isSubmitting}>
          취소
        </Button>
      </div>
    </form>
  )
}
```

### 예시 2: 대시보드 페이지

```tsx
// app/(dashboard)/page.tsx
import { Suspense } from 'react'
import { getKPIData } from '@/app/actions/dashboard'
import { KPICards } from '@/components/features/dashboard/kpi-cards'
import { RecentStudentsAsync } from '@/components/features/dashboard/recent-students-async'
import { RecentActivityAsync } from '@/components/features/dashboard/recent-activity-async'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'

export default async function DashboardPage() {
  // 빠른 데이터만 서버에서 가져오기
  const kpiData = await getKPIData()

  return (
    <div className="space-y-6">
      {/* 즉시 표시 */}
      <KPICards data={kpiData} />

      {/* 느린 위젯들은 독립적으로 로드 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Suspense fallback={<WidgetSkeleton variant="list" />}>
          <RecentStudentsAsync />
        </Suspense>

        <Suspense fallback={<WidgetSkeleton variant="list" />}>
          <RecentActivityAsync />
        </Suspense>
      </div>
    </div>
  )
}
```

### 예시 3: 삭제 확인 다이얼로그

```tsx
'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadingButton } from '@/components/ui/loading-button'

export function DeleteStudentDialog({ studentId, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteStudent(studentId)
      onDelete()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            이 작업은 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
          <LoadingButton
            variant="destructive"
            loading={isDeleting}
            loadingText="삭제 중..."
            onClick={handleDelete}
          >
            삭제
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

---

## 성능 측정 및 모니터링

### 주요 지표

1. **TTFB (Time to First Byte)**: 서버 응답 시간
2. **FCP (First Contentful Paint)**: 첫 콘텐츠 표시 시간
3. **LCP (Largest Contentful Paint)**: 주요 콘텐츠 표시 시간
4. **CLS (Cumulative Layout Shift)**: 레이아웃 변경 정도

### 목표 수치

- FCP < 1.0초
- LCP < 2.5초
- CLS < 0.1

### 측정 도구

- Chrome DevTools > Lighthouse
- Vercel Analytics (배포 후)
- `console.time()` / `console.timeEnd()` (개발 중)

---

## 추가 리소스

- [Next.js Loading UI Documentation](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [React Suspense Documentation](https://react.dev/reference/react/Suspense)
- [shadcn/ui Skeleton Component](https://ui.shadcn.com/docs/components/skeleton)
- 프로젝트 내 문서:
  - `/docs/LOADING_ANIMATION_PATTERNS.md`
  - `/src/lib/animation-config.ts`
  - `/src/components/ui/page-skeleton.tsx`
