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

## Link vs router.push 완벽 가이드

### ⚡️ 왜 `<Link>`가 `router.push()`보다 빠른가?

**핵심 이유: 프리페칭 (Pre-fetching)**

```tsx
// <Link> 동작 방식
1. 사용자가 링크에 마우스 올림 (hover)
2. Next.js가 백그라운드에서 다음 페이지 데이터 미리 다운로드 ⚡
3. 사용자가 클릭
4. 이미 준비된 데이터로 즉시 페이지 전환! (체감 0초)

// router.push() 동작 방식
1. 사용자가 버튼 클릭
2. router.push() 호출
3. 이제부터 데이터 다운로드 시작 ⏳
4. 데이터 다운로드 완료 (0.5~2초 대기)
5. 페이지 전환
```

### 📊 체감 속도 비교

| 방식 | 데이터 다운로드 시점 | 클릭 → 화면 전환 | 사용자 체감 |
|------|------------------|----------------|----------|
| `<Link>` | 마우스 올릴 때 (미리) | ~0.1초 | ⚡️ 즉각적 |
| `router.push()` | 클릭 후 (나중) | ~1.5초 | 🐢 느림/끊김 |

### 🎯 언제 무엇을 사용할까?

#### ✅ `<Link>` 사용 시나리오 (예측 가능한 탐색)

**"사용자가 이 버튼/링크를 클릭할 것이라고 예측 가능할 때"**

```tsx
// 1. 사이드바 메뉴
import Link from 'next/link'

<Link href="/students" className="nav-item">
  <Users className="h-4 w-4" />
  학생 관리
</Link>

// 2. 테이블 행 클릭
<Link href={`/students/${student.id}`} className="table-row">
  {student.name}
</Link>

// 3. 카드 클릭
<Link href={`/consultations/${consultation.id}`}>
  <Card className="cursor-pointer hover:shadow-lg">
    {/* 카드 내용 */}
  </Card>
</Link>

// 4. 브레드크럼
<Link href="/dashboard" className="breadcrumb">
  대시보드
</Link>
```

**실제 적용 예시: 학생 목록 → 학생 상세**

```tsx
// src/components/features/students/student-list.tsx
import Link from 'next/link'

export function StudentList({ students }) {
  return (
    <div className="space-y-2">
      {students.map((student) => (
        <Link
          key={student.id}
          href={`/students/${student.id}`}
          className="block p-4 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>{student.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{student.name}</p>
              <p className="text-sm text-muted-foreground">{student.grade}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
```

#### ✅ `router.push()` 사용 시나리오 (조건부 탐색)

**"작업이 성공적으로 완료된 후에만 페이지를 이동시켜야 할 때"**

```tsx
// 1. 폼 제출 후
async function handleSubmit(e) {
  e.preventDefault()
  const result = await saveStudent(formData)

  if (result.success) {
    router.push('/students') // ✅ 저장 성공 후에만 이동
  }
}

// 2. 로그인 후
async function handleLogin(credentials) {
  const result = await signIn(credentials)

  if (result.success) {
    router.push('/dashboard') // ✅ 인증 성공 후에만 이동
  }
}

// 3. 복잡한 로직 완료 후
async function handleBulkAssignment() {
  const result = await assignHomeworkToStudents(selectedStudents)

  if (result.success) {
    toast({ title: '과제가 배정되었습니다' })
    router.push('/homeworks') // ✅ 일괄 작업 완료 후 이동
  }
}
```

**실제 적용 예시: 학생 등록 폼**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingButton } from '@/components/ui/loading-button'
import { createStudent } from '@/app/actions/students'
import { useToast } from '@/hooks/use-toast'

export function StudentRegistrationForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true) // 🔄 로딩 시작

    try {
      const formData = new FormData(e.currentTarget)
      const result = await createStudent(formData)

      if (result.success) {
        toast({
          title: '학생 등록 완료',
          description: '학생이 성공적으로 등록되었습니다.',
        })

        // ✅ 성공 후에만 페이지 이동
        // 이 시점에 isSubmitting=true이므로 버튼에 스피너 표시 중
        router.push('/students')
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: '등록 실패',
        description: error.message,
        variant: 'destructive',
      })
      setIsSubmitting(false) // ❌ 실패 시에만 로딩 해제
    }
    // 주의: 성공 시 setIsSubmitting(false) 하지 않음!
    // router.push()로 페이지가 이동되면서 컴포넌트가 언마운트되므로 불필요
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="name" placeholder="학생 이름" required />
      <Input name="grade" placeholder="학년" required />

      <LoadingButton
        type="submit"
        loading={isSubmitting}
        loadingText="등록 중..."
        className="w-full"
      >
        학생 등록
      </LoadingButton>
    </form>
  )
}
```

### 💡 `router.push()`의 버벅임 제거하기

**문제**: `router.push()`는 호출 후 데이터 로딩이 필요하므로 화면이 멈춘 것처럼 보임

**해결책**: 로딩 상태를 명확히 표시

#### 패턴 1: 버튼 로딩 상태 (권장)

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingButton } from '@/components/ui/loading-button'

export function MyForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleAction() {
    setIsSubmitting(true) // 🟢 1. 로딩 시작

    try {
      await performAction() // 🔄 2. 서버 작업
      router.push('/next-page') // 🚀 3. 페이지 이동 (로딩 상태 유지)
    } catch (error) {
      setIsSubmitting(false) // 🔴 실패 시에만 로딩 해제
    }
  }

  return (
    <LoadingButton loading={isSubmitting} onClick={handleAction}>
      작업 수행
    </LoadingButton>
  )
}
```

**사용자 경험**:
```
Before: [클릭] → ... (무반응 1.5초) ... → [페이지 이동]
        👤 "멈췄나?" "고장 났나?"

After:  [클릭] → "작업 중..." 스피너 → [페이지 이동]
        👤 "처리되고 있구나!" ✨
```

#### 패턴 2: 전체 화면 로딩 (복잡한 작업)

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export function ComplexOperationButton() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)

  async function handleComplexOperation() {
    setIsProcessing(true)

    try {
      // 시간이 오래 걸리는 작업 (예: 일괄 처리)
      await bulkProcessStudents(selectedStudents)
      router.push('/results')
    } catch (error) {
      setIsProcessing(false)
    }
  }

  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-lg font-medium">작업 처리 중...</p>
          <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
        </div>
      </div>
    )
  }

  return <Button onClick={handleComplexOperation}>일괄 처리</Button>
}
```

#### 패턴 3: 토스트 + 로딩 조합 (사용자 친화적)

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingButton } from '@/components/ui/loading-button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export function StudentDeleteButton({ studentId }) {
  const router = useRouter()
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)

    // 📢 즉시 피드백
    const { dismiss } = toast({
      title: (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          삭제 중...
        </div>
      ),
      duration: Infinity, // 작업 완료까지 유지
    })

    try {
      await deleteStudent(studentId)

      dismiss() // 로딩 토스트 제거

      toast({
        title: '삭제 완료',
        description: '학생 정보가 삭제되었습니다.',
      })

      router.push('/students')
    } catch (error) {
      dismiss()

      toast({
        title: '삭제 실패',
        description: error.message,
        variant: 'destructive',
      })

      setIsDeleting(false)
    }
  }

  return (
    <LoadingButton
      variant="destructive"
      loading={isDeleting}
      loadingText="삭제 중..."
      onClick={handleDelete}
    >
      학생 삭제
    </LoadingButton>
  )
}
```

### 🎯 실전 팁

#### Tip 1: `router.push()` 후 로딩 상태 해제하지 않기

```tsx
// ❌ 잘못된 패턴
async function handleSubmit() {
  setIsSubmitting(true)
  await saveData()
  router.push('/success')
  setIsSubmitting(false) // ⚠️ 불필요! 페이지 이동되면 컴포넌트 언마운트됨
}

// ✅ 올바른 패턴
async function handleSubmit() {
  setIsSubmitting(true)
  try {
    await saveData()
    router.push('/success') // 이동 완료까지 로딩 유지
  } catch (error) {
    setIsSubmitting(false) // 실패 시에만 해제
  }
}
```

#### Tip 2: `<Link>`를 `onClick`과 함께 사용하지 않기

```tsx
// ❌ 안티패턴
<Link href="/students" onClick={() => console.log('클릭')}>
  학생 관리
</Link>

// ✅ onClick이 필요하다면 router.push 사용
<Button onClick={() => {
  logEvent('navigation', { to: 'students' })
  router.push('/students')
}}>
  학생 관리
</Button>
```

#### Tip 3: 프리페칭 비활성화가 필요한 경우

```tsx
// 민감한 데이터나 권한이 필요한 페이지
<Link href="/admin/settings" prefetch={false}>
  관리자 설정
</Link>
```

### 📊 의사결정 플로우차트

```
페이지 이동이 필요한가?
│
├─ YES → 이동 전에 조건 확인이 필요한가?
│         │
│         ├─ YES (폼 저장, 로그인, 권한 체크 등)
│         │   → router.push() + 로딩 상태
│         │
│         └─ NO (단순 탐색)
│             → <Link>
│
└─ NO → 그냥 Button
```

### 🎨 UI 패턴별 선택 가이드

| UI 패턴 | 추천 방식 | 예시 |
|---------|---------|------|
| 사이드바 메뉴 | `<Link>` | `<Link href="/students">학생 관리</Link>` |
| 테이블 행 클릭 | `<Link>` | `<Link href={`/students/${id}`}>` |
| 카드 클릭 | `<Link>` | `<Link href={url}><Card /></Link>` |
| 브레드크럼 | `<Link>` | `<Link href="/dashboard">홈</Link>` |
| 폼 제출 버튼 | `router.push()` | 저장 후 `router.push('/list')` |
| 로그인 버튼 | `router.push()` | 인증 후 `router.push('/dashboard')` |
| 삭제 버튼 | `router.push()` | 삭제 후 `router.push('/list')` |
| 마법사 완료 | `router.push()` | 모든 단계 완료 후 이동 |

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
