# 스켈레톤 컴포넌트 사용 가이드

## 개요

Acadesk Web에서는 체계적이고 재사용 가능한 스켈레톤 로딩 시스템을 제공합니다. 이 가이드는 스켈레톤 컴포넌트를 효과적으로 사용하는 방법을 설명합니다.

## 왜 스켈레톤을 사용하나요?

- ⚡ **더 빠른 체감 속도**: 단순한 스피너보다 실제 콘텐츠 구조를 보여줘 사용자가 로딩 시간을 더 짧게 느낌
- 🎯 **명확한 기대치**: 사용자가 어떤 콘텐츠가 로드될지 미리 알 수 있음
- 💎 **일관된 UX**: 모든 페이지에서 통일된 로딩 경험 제공

## 스켈레톤 시스템 구조

### 1. Skeleton Blocks (재사용 가능한 블록)

위치: `src/components/ui/skeleton-blocks.tsx`

작은 단위의 재사용 가능한 스켈레톤 블록들입니다.

#### Header Blocks

```tsx
import { PageHeaderSkeleton, DetailHeaderSkeleton, CardHeaderSkeleton } from '@ui/skeleton-blocks'

// 페이지 헤더
<PageHeaderSkeleton />

// 상세 페이지 헤더 (액션 버튼 포함)
<DetailHeaderSkeleton />

// 카드 헤더
<CardHeaderSkeleton />
```

#### Search & Filter Blocks

```tsx
import { SearchBarSkeleton, SimpleSearchBarSkeleton } from '@ui/skeleton-blocks'

// 검색 + 필터 버튼
<SearchBarSkeleton />

// 검색만
<SimpleSearchBarSkeleton />
```

#### Table Blocks

```tsx
import { TableSkeleton, SimpleTableSkeleton } from '@ui/skeleton-blocks'

// 완전한 테이블 스켈레톤
<TableSkeleton rows={10} columns={6} showHeader={true} />

// 간단한 테이블 (카드 없이)
<SimpleTableSkeleton rows={5} columns={4} />
```

#### Card Blocks

```tsx
import {
  CardSkeleton,
  StatsCardSkeleton,
  CompactCardSkeleton
} from '@ui/skeleton-blocks'

// 기본 카드
<CardSkeleton />

// KPI/Stats 카드
<StatsCardSkeleton />

// 컴팩트 카드
<CompactCardSkeleton />
```

#### List Blocks

```tsx
import { ListItemSkeleton, ListSkeleton } from '@ui/skeleton-blocks'

// 단일 리스트 아이템
<ListItemSkeleton showAvatar={true} showAction={true} />

// 여러 리스트 아이템
<ListSkeleton items={5} showAvatar={true} showAction={true} />
```

#### Form Blocks

```tsx
import { FormFieldSkeleton, FormSkeleton } from '@ui/skeleton-blocks'

// 단일 폼 필드
<FormFieldSkeleton />

// 전체 폼 (여러 필드 + 버튼)
<FormSkeleton fields={5} />
```

#### Grid Blocks

```tsx
import { CardGridSkeleton, StatsGridSkeleton } from '@ui/skeleton-blocks'

// 카드 그리드
<CardGridSkeleton items={6} columns={3} />

// Stats 카드 그리드
<StatsGridSkeleton items={4} columns={4} />
```

#### Tab Blocks

```tsx
import { TabsSkeleton } from '@ui/skeleton-blocks'

<TabsSkeleton tabs={4} />
```

### 2. Page Skeleton (페이지 전체 스켈레톤)

위치: `src/components/ui/page-skeleton.tsx`

페이지 전체 로딩 상태를 위한 컴포넌트입니다. `loading.tsx` 파일에서 사용합니다.

#### 사용 가능한 Variants

```tsx
import { PageSkeleton } from '@ui/page-skeleton'

// 리스트 페이지 (검색 + 리스트)
<PageSkeleton variant="list" />

// 그리드 페이지 (Stats + 검색 + 카드 그리드)
<PageSkeleton variant="grid" />

// 상세 페이지 (헤더 + Stats + 탭)
<PageSkeleton variant="detail" />

// 폼 페이지 (카드 + 폼)
<PageSkeleton variant="form" />

// 대시보드 (환영 배너 + KPI + 위젯들)
<PageSkeleton variant="dashboard" />

// 테이블 페이지 (검색 + 테이블)
<PageSkeleton variant="table" />

// 캘린더 페이지 (검색 + 캘린더 + 사이드바)
<PageSkeleton variant="calendar" />

// 통계 페이지 (Stats + 차트들)
<PageSkeleton variant="stats" />

// 임포트 페이지 (파일 업로드 + 폼)
<PageSkeleton variant="import" />

// 설정 페이지 (탭 + 여러 폼 카드)
<PageSkeleton variant="settings" />
```

### 3. Widget Skeleton (위젯용 스켈레톤)

위치: `src/components/ui/widget-skeleton.tsx`

개별 위젯의 로딩 상태를 위한 컴포넌트입니다. `<Suspense>` fallback으로 사용합니다.

```tsx
import { WidgetSkeleton } from '@ui/widget-skeleton'

<WidgetSkeleton variant="stats" />    // KPI 카드
<WidgetSkeleton variant="list" />     // 리스트 위젯
<WidgetSkeleton variant="chart" />    // 차트 위젯
<WidgetSkeleton variant="calendar" /> // 캘린더 위젯
<WidgetSkeleton variant="table" />    // 테이블 위젯
<WidgetSkeleton variant="default" />  // 기본 위젯
```

## 사용 패턴

### 1. 페이지 로딩 상태 (loading.tsx)

```tsx
// src/app/(dashboard)/students/loading.tsx
import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function StudentsLoading() {
  return <PageSkeleton variant="list" />
}
```

### 2. Suspense Fallback (위젯/섹션)

```tsx
import { Suspense } from 'react'
import { WidgetSkeleton } from '@ui/widget-skeleton'

export default function DashboardPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Suspense fallback={<WidgetSkeleton variant="list" />}>
        <RecentActivityWidget />
      </Suspense>

      <Suspense fallback={<WidgetSkeleton variant="chart" />}>
        <AnalyticsWidget />
      </Suspense>
    </div>
  )
}
```

### 3. 커스텀 스켈레톤 조합

Skeleton Blocks를 조합해서 커스텀 스켈레톤을 만들 수 있습니다:

```tsx
import {
  PageHeaderSkeleton,
  SearchBarSkeleton,
  TableSkeleton
} from '@ui/skeleton-blocks'

export default function CustomPageLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PageHeaderSkeleton />
      <SearchBarSkeleton />
      <TableSkeleton rows={15} columns={8} />
    </div>
  )
}
```

## 페이지별 권장 Variant

| 페이지 유형 | 권장 Variant | 예시 페이지 |
|------------|------------|-----------|
| 목록/리스트 | `list` | 학생 목록, 교재 목록 |
| 카드 그리드 | `grid` | 상담 목록, 보고서 목록 |
| 상세 정보 | `detail` | 학생 상세, 교재 상세 |
| 입력 폼 | `form` | 성적 입력, 학생 등록 |
| 대시보드 | `dashboard` | 메인 대시보드 |
| 데이터 테이블 | `table` | 출석 관리, 성적 조회 |
| 캘린더 | `calendar` | 일정 관리 |
| 통계/분석 | `stats` | 통계 페이지 |
| 파일 업로드 | `import` | 일괄 등록 |
| 설정 | `settings` | 환경 설정 |

## Best Practices

### ✅ DO

```tsx
// 페이지 전체 로딩은 PageSkeleton 사용
export default function Loading() {
  return <PageSkeleton variant="list" />
}

// 위젯 로딩은 WidgetSkeleton 사용
<Suspense fallback={<WidgetSkeleton variant="chart" />}>
  <AnalyticsChart />
</Suspense>

// 커스텀이 필요하면 Skeleton Blocks 조합
<div className="space-y-4">
  <SearchBarSkeleton />
  <ListSkeleton items={10} />
</div>
```

### ❌ DON'T

```tsx
// 단순 스피너 사용 지양
<div className="flex justify-center">
  <Spinner />
</div>

// 하드코딩된 스켈레톤 지양
<div className="animate-pulse">
  <div className="h-4 w-20 bg-gray-200"></div>
  <div className="h-8 w-24 bg-gray-200"></div>
</div>

// 페이지에서 위젯용 스켈레톤 사용 지양
export default function Loading() {
  return <WidgetSkeleton variant="list" /> // ❌
}
```

## 커스터마이징

### 새로운 Skeleton Block 추가

`src/components/ui/skeleton-blocks.tsx`에 새로운 블록을 추가할 수 있습니다:

```tsx
/**
 * 갤러리 스켈레톤
 */
export function GallerySkeleton({
  items = 12,
  className
}: {
  items?: number
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-3 md:grid-cols-4 gap-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="aspect-square">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}
```

### 새로운 Page Skeleton Variant 추가

`src/components/ui/page-skeleton.tsx`에 새로운 variant를 추가할 수 있습니다:

```tsx
// 1. Variant 타입에 추가
export interface PageSkeletonProps {
  variant?:
    | 'list'
    | 'grid'
    | 'gallery' // ← 새로운 variant
    // ...
}

// 2. 스켈레톤 함수 작성
function GalleryPageSkeleton() {
  return (
    <>
      <SimpleSearchBarSkeleton />
      <GallerySkeleton items={12} />
    </>
  )
}

// 3. PageSkeleton에 연결
export function PageSkeleton({ variant = 'list', className }: PageSkeletonProps) {
  return (
    <div className={cn('p-6 lg:p-8 space-y-6', className)}>
      <PageHeaderSkeleton />
      {/* ... */}
      {variant === 'gallery' && <GalleryPageSkeleton />}
    </div>
  )
}
```

## 관련 문서

- [Error & Loading Strategy](./error-and-loading-strategy.md) - 에러 처리 및 로딩 전략
- [Async Widgets Guide](./ASYNC_WIDGETS_GUIDE.md) - 비동기 위젯 사용 가이드
- [CLAUDE.md](../CLAUDE.md) - 프로젝트 전체 가이드

## 예제

### 학생 목록 페이지

```tsx
// src/app/(dashboard)/students/loading.tsx
import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function StudentsLoading() {
  return <PageSkeleton variant="list" />
}
```

### 대시보드 페이지

```tsx
// src/app/(dashboard)/dashboard/loading.tsx
import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function DashboardLoading() {
  return <PageSkeleton variant="dashboard" />
}
```

### 커스텀 조합 (출석 상세)

```tsx
// src/app/(dashboard)/attendance/[id]/loading.tsx
import {
  DetailHeaderSkeleton,
  StatsGridSkeleton,
  TableSkeleton
} from '@ui/skeleton-blocks'

export default function AttendanceDetailLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <DetailHeaderSkeleton />
      <StatsGridSkeleton items={3} columns={3} />
      <TableSkeleton rows={20} columns={5} />
    </div>
  )
}
```

## 확인 모달 (ConfirmationDialog)

### 개요

위치: `src/components/ui/confirmation-dialog.tsx`

사용자에게 중요한 작업(삭제, 변경 등)을 확인받기 위한 표준화된 모달 컴포넌트입니다. 네이티브 `confirm()` 함수를 대체하여 일관된 UI/UX를 제공합니다.

### 왜 ConfirmationDialog를 사용하나요?

- 🎯 **일관성**: 앱 내 모든 확인 모달이 동일한 UI/UX를 갖습니다
- 🛡️ **안전성**: 위험한 작업에 대한 명확한 경고를 제공합니다
- ✨ **사용자 경험**: 네이티브 `confirm()`보다 훨씬 나은 UX를 제공합니다
- 🔧 **유지보수**: 한 곳에서 모든 확인 모달의 스타일을 관리할 수 있습니다

### 기본 사용법

```tsx
import { useState } from 'react'
import { ConfirmationDialog } from '@ui/confirmation-dialog'

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleDelete() {
    setIsLoading(true)
    try {
      await deleteItem(id)
      toast({ title: "삭제 완료" })
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>삭제</Button>

      <ConfirmationDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title="정말로 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        variant="destructive"
        isLoading={isLoading}
        onConfirm={handleDelete}
      />
    </>
  )
}
```

### Props

| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `open` | `boolean` | ✅ | - | 모달 열림/닫힘 상태 |
| `onOpenChange` | `(open: boolean) => void` | ✅ | - | 모달 상태 변경 핸들러 |
| `title` | `string` | ✅ | - | 모달 제목 (주요 질문) |
| `description` | `string` | ❌ | - | 모달 설명 (부가 설명) |
| `onConfirm` | `() => void \| Promise<void>` | ✅ | - | 확인 버튼 클릭 시 실행될 함수 |
| `confirmText` | `string` | ❌ | `"확인"` | 확인 버튼 텍스트 |
| `cancelText` | `string` | ❌ | `"취소"` | 취소 버튼 텍스트 |
| `variant` | `"default" \| "destructive"` | ❌ | `"destructive"` | 확인 버튼 스타일 |
| `isLoading` | `boolean` | ❌ | `false` | 로딩 중 상태 (확인 버튼에 스피너 표시) |
| `disabled` | `boolean` | ❌ | `false` | 확인 버튼 비활성화 여부 |

### 실제 사용 예시

#### 1. 학생 삭제 (StudentHeader.tsx)

```tsx
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [isDeleting, setIsDeleting] = useState(false)

const handleConfirmDelete = async () => {
  setIsDeleting(true)
  try {
    const result = await deleteStudent(student.id)
    if (!result.success) throw new Error(result.error)

    toast({ title: '학생 삭제 완료' })
    router.push('/students')
  } catch (error) {
    toast({ title: '삭제 실패', variant: 'destructive' })
  } finally {
    setIsDeleting(false)
    setDeleteDialogOpen(false)
  }
}

return (
  <>
    <Button onClick={() => setDeleteDialogOpen(true)}>삭제</Button>

    <ConfirmationDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title="정말로 삭제하시겠습니까?"
      description={`"${student.name}"의 모든 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
      confirmText="삭제"
      variant="destructive"
      isLoading={isDeleting}
      onConfirm={handleConfirmDelete}
    />
  </>
)
```

#### 2. 보호자 삭제 (guardian-list.tsx)

```tsx
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [guardianToDelete, setGuardianToDelete] = useState<{ id: string; name: string } | null>(null)
const [isDeleting, setIsDeleting] = useState(false)

function handleDeleteClick(id: string, name: string) {
  setGuardianToDelete({ id, name })
  setDeleteDialogOpen(true)
}

async function handleConfirmDelete() {
  if (!guardianToDelete) return

  setIsDeleting(true)
  try {
    await deleteGuardian(guardianToDelete.id)
    toast({ title: '삭제 완료' })
    loadGuardians()
  } catch (error) {
    toast({ title: '삭제 오류', variant: 'destructive' })
  } finally {
    setIsDeleting(false)
    setDeleteDialogOpen(false)
    setGuardianToDelete(null)
  }
}

return (
  <>
    <Table data={guardians} onDelete={handleDeleteClick} />

    <ConfirmationDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title="정말로 삭제하시겠습니까?"
      description={
        guardianToDelete
          ? `"${guardianToDelete.name}" 보호자의 모든 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
          : ''
      }
      confirmText="삭제"
      variant="destructive"
      isLoading={isDeleting}
      onConfirm={handleConfirmDelete}
    />
  </>
)
```

### useConfirmationDialog Hook

더 간편한 사용을 위한 훅도 제공됩니다:

```tsx
import { useConfirmationDialog } from '@ui/confirmation-dialog'

function MyComponent() {
  const { isOpen, isLoading, openDialog, confirmDialog } = useConfirmationDialog()

  async function performDelete() {
    await deleteStudent(id)
    toast({ title: "삭제 완료" })
  }

  return (
    <>
      <Button onClick={openDialog}>삭제</Button>

      <ConfirmationDialog
        open={isOpen}
        onOpenChange={(open) => !open && confirmDialog.close()}
        title="정말로 삭제하시겠습니까?"
        isLoading={isLoading}
        onConfirm={() => confirmDialog.confirm(performDelete)}
      />
    </>
  )
}
```

### 버튼 텍스트 변경

상황에 맞게 버튼 텍스트를 변경할 수 있습니다:

```tsx
// 삭제
<ConfirmationDialog
  confirmText="삭제"
  cancelText="취소"
  variant="destructive"
  // ...
/>

// 확인
<ConfirmationDialog
  confirmText="확인"
  cancelText="아니오"
  variant="default"
  // ...
/>

// 실행
<ConfirmationDialog
  confirmText="실행"
  cancelText="취소"
  variant="default"
  // ...
/>
```

### Best Practices

#### ✅ DO

```tsx
// 위험한 작업은 destructive variant 사용
<ConfirmationDialog
  variant="destructive"
  confirmText="삭제"
  title="정말로 삭제하시겠습니까?"
  description="이 작업은 되돌릴 수 없습니다."
/>

// 명확한 설명 제공
<ConfirmationDialog
  description={`"${itemName}"의 모든 정보가 삭제됩니다.`}
/>

// 로딩 상태 관리
<ConfirmationDialog
  isLoading={isDeleting}
  onConfirm={handleDelete}
/>
```

#### ❌ DON'T

```tsx
// 네이티브 confirm 사용 금지
if (confirm('삭제하시겠습니까?')) {
  await deleteItem()
}

// AlertDialog를 직접 사용하지 말 것
<AlertDialog>
  <AlertDialogContent>
    {/* ... 반복적인 코드 ... */}
  </AlertDialogContent>
</AlertDialog>

// 불명확한 설명
<ConfirmationDialog
  title="확인"  // ❌ 너무 모호함
  description="삭제"  // ❌ 무엇을 삭제하는지 불명확
/>
```

## 빈 상태 (EmptyState)

### 개요

위치: `src/components/ui/empty-state.tsx`

데이터가 없는 상태를 사용자에게 친절하게 안내하고, 다음 행동을 유도하는 표준화된 컴포넌트입니다. 단순히 "데이터가 없습니다"라고만 표시하는 것이 아니라, 사용자에게 무엇을 해야 하는지 명확히 안내합니다.

### 왜 EmptyState를 사용하나요?

- 🎯 **명확한 안내**: 왜 비어있는지, 무엇을 할 수 있는지 명확히 전달
- ✨ **행동 유도**: 액션 버튼으로 사용자의 다음 행동을 유도
- 🎨 **일관성**: 앱 전체에서 동일한 빈 상태 UI/UX 제공
- 😊 **친절함**: 아이콘과 설명으로 친근한 느낌 제공
- 🔧 **유지보수**: 한 곳에서 모든 빈 상태 스타일 관리

### 기본 사용법

```tsx
import { EmptyState } from '@ui/empty-state'
import { Users } from 'lucide-react'
import { Button } from '@ui/button'

function StudentList({ students }) {
  if (students.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="등록된 학생이 없습니다"
        description="새로운 학생을 등록하여 시작하세요"
        action={
          <Button onClick={() => router.push('/students/new')}>
            학생 등록
          </Button>
        }
      />
    )
  }

  return <Table data={students} />
}
```

### Props

| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `icon` | `LucideIcon \| ReactNode` | ❌ | - | 표시할 아이콘 (LucideIcon 컴포넌트 또는 ReactNode) |
| `title` | `string` | ✅ | - | 핵심 메시지 (제목) |
| `description` | `string` | ❌ | - | 부가 설명 (선택) |
| `action` | `ReactNode` | ❌ | - | 액션 버튼 또는 커스텀 액션 영역 |
| `variant` | `"default" \| "minimal" \| "card"` | ❌ | `"default"` | 컨테이너 스타일 variant |
| `className` | `string` | ❌ | - | 커스텀 className |
| `iconClassName` | `string` | ❌ | `"text-muted-foreground"` | 아이콘 색상 클래스 |

### Variants

```tsx
// default - dashed border (기본)
<EmptyState variant="default" icon={Users} title="데이터 없음" />

// minimal - border 없음 (최소한의 스타일)
<EmptyState variant="minimal" icon={CheckCircle} title="모두 완료!" />

// card - Card 스타일
<EmptyState variant="card" icon={FileText} title="문서 없음" />
```

### 편의 컴포넌트 (Convenience Components)

더 빠른 사용을 위한 특화된 컴포넌트들도 제공됩니다:

#### 1. NoDataEmptyState

데이터가 전혀 없을 때 사용하는 표준 EmptyState입니다.

```tsx
import { NoDataEmptyState } from '@ui/empty-state'
import { Users } from 'lucide-react'

<NoDataEmptyState
  resourceName="학생"
  onCreateClick={() => router.push('/students/new')}
  createButtonText="학생 등록"
  icon={Users}
/>
```

#### 2. NoSearchResultsEmptyState

검색 결과가 없을 때 사용하는 표준 EmptyState입니다.

```tsx
import { NoSearchResultsEmptyState } from '@ui/empty-state'
import { Search } from 'lucide-react'

<NoSearchResultsEmptyState
  searchTerm={searchQuery}
  onClearSearch={handleClearSearch}
  icon={Search}
/>
```

#### 3. NoFilterResultsEmptyState

필터 조건과 일치하는 결과가 없을 때 사용하는 표준 EmptyState입니다.

```tsx
import { NoFilterResultsEmptyState } from '@ui/empty-state'
import { Filter } from 'lucide-react'

<NoFilterResultsEmptyState
  onClearFilters={handleClearFilters}
  icon={Filter}
/>
```

### 실제 사용 예시

#### 1. 보호자 테이블 (guardian-table-improved.tsx)

검색 결과 여부에 따라 다른 EmptyState를 표시하는 패턴:

```tsx
import { EmptyState, NoSearchResultsEmptyState } from '@ui/empty-state'
import { Users, Search } from 'lucide-react'

{table.getRowModel().rows?.length ? (
  <TableBody>
    {/* ... 테이블 rows ... */}
  </TableBody>
) : (
  <TableRow>
    <TableCell colSpan={columns.length} className="p-0">
      {globalFilter ? (
        <NoSearchResultsEmptyState
          searchTerm={globalFilter}
          onClearSearch={() => setGlobalFilter('')}
          icon={Search}
        />
      ) : (
        <EmptyState
          icon={Users}
          title="등록된 보호자가 없습니다"
          description="새로운 보호자를 등록하여 시작하세요"
          action={
            <Button onClick={() => router.push('/guardians/new')}>
              보호자 등록
            </Button>
          }
        />
      )}
    </TableCell>
  </TableRow>
)}
```

#### 2. 학생 테이블 (student-table-improved.tsx)

기본 EmptyState 사용 예시:

```tsx
import { EmptyState } from '@ui/empty-state'
import { GraduationCap } from 'lucide-react'

{filteredData.length === 0 ? (
  <EmptyState
    icon={GraduationCap}
    title="등록된 학생이 없습니다"
    description="새로운 학생을 등록하여 시작하세요"
    action={
      <Button onClick={() => router.push('/students/new')}>
        학생 등록
      </Button>
    }
  />
) : (
  <Table data={filteredData} />
)}
```

#### 3. 성공 상태 (모든 작업 완료)

```tsx
<EmptyState
  icon={CheckCircle}
  title="모든 과제를 완료했습니다!"
  description="훌륭합니다. 새로운 과제가 등록되면 알려드리겠습니다."
  variant="minimal"
  iconClassName="text-green-500"
/>
```

#### 4. 커스텀 아이콘 크기

```tsx
import { EmptyStateIcon } from '@ui/empty-state'
import { Inbox } from 'lucide-react'

<EmptyState
  icon={<EmptyStateIcon icon={Inbox} className="h-16 w-16 text-blue-500" />}
  title="받은 메시지가 없습니다"
  description="새로운 메시지가 도착하면 여기에 표시됩니다"
/>
```

### 시나리오별 사용 가이드

| 시나리오 | 사용할 컴포넌트 | 예시 |
|---------|--------------|------|
| 첫 사용 (데이터 없음) | `EmptyState` | 학생 목록, 보호자 목록 |
| 검색 결과 없음 | `NoSearchResultsEmptyState` | 검색 기능이 있는 테이블 |
| 필터 결과 없음 | `NoFilterResultsEmptyState` | 필터 기능이 있는 리스트 |
| 성공 상태 (모두 완료) | `EmptyState` (variant="minimal") | 할 일 목록 완료 |
| 오류 상태 | 사용 금지 (ErrorFallback 사용) | - |

### Best Practices

#### ✅ DO

```tsx
// 명확한 제목과 설명 제공
<EmptyState
  title="등록된 학생이 없습니다"
  description="새로운 학생을 등록하여 시작하세요"
/>

// 적절한 아이콘 사용
<EmptyState icon={Users} title="사용자 없음" />
<EmptyState icon={FileText} title="문서 없음" />

// 행동 유도 버튼 제공
<EmptyState
  title="데이터 없음"
  action={<Button onClick={handleCreate}>등록하기</Button>}
/>

// 검색/필터 결과가 없을 때 초기화 버튼 제공
<NoSearchResultsEmptyState
  searchTerm={query}
  onClearSearch={handleClear}
/>

// 상황에 맞는 variant 사용
<EmptyState variant="default" />  // 일반적인 경우
<EmptyState variant="minimal" />  // 성공 상태
<EmptyState variant="card" />     // Card 내부
```

#### ❌ DON'T

```tsx
// 단순 텍스트만 표시 금지
<div className="text-center">데이터 없음</div>  // ❌

// 불명확한 메시지
<EmptyState title="없음" />  // ❌ 무엇이 없는지 불명확
<EmptyState title="데이터가 없습니다" />  // ❌ 너무 일반적

// 행동 유도 없음 (첫 사용 시)
<EmptyState title="등록된 학생이 없습니다" />  // ❌ 어떻게 등록하는지?

// 오류 상태에 EmptyState 사용
<EmptyState title="오류가 발생했습니다" />  // ❌ ErrorFallback 사용

// 아이콘 없이 사용
<EmptyState title="데이터 없음" />  // ❌ 아이콘으로 시각적 안내 제공

// 너무 긴 설명
<EmptyState
  description="현재 등록된 학생이 없습니다. 학생을 등록하려면..."  // ❌ 간결하게
/>
```

### 아이콘 선택 가이드

| 컨텍스트 | 추천 아이콘 | 예시 |
|---------|----------|------|
| 사용자/학생/보호자 | `Users`, `UserPlus`, `GraduationCap` | 학생 목록, 보호자 목록 |
| 문서/파일 | `FileText`, `File`, `Files` | 리포트, 문서 목록 |
| 검색 결과 | `Search`, `SearchX` | 검색 결과 없음 |
| 할 일/과제 | `CheckCircle`, `ListTodo` | 완료된 할 일 목록 |
| 메시지/알림 | `Inbox`, `Bell`, `MessageCircle` | 받은 메시지 |
| 일정/이벤트 | `Calendar`, `CalendarX` | 일정 없음 |
| 데이터/통계 | `BarChart`, `TrendingUp` | 분석 데이터 없음 |

### 테이블에서 사용하기

테이블에서 EmptyState를 사용할 때는 `TableCell`의 `colSpan`과 `className="p-0"`을 사용하여 전체 너비를 차지하도록 합니다:

```tsx
<TableBody>
  {data.length > 0 ? (
    data.map((row) => <TableRow key={row.id}>...</TableRow>)
  ) : (
    <TableRow>
      <TableCell colSpan={columns.length} className="p-0">
        <EmptyState
          icon={Users}
          title="데이터 없음"
          description="새로운 항목을 추가하세요"
        />
      </TableCell>
    </TableRow>
  )}
</TableBody>
```

## 마무리

이 스켈레톤 시스템을 활용하면:
- 일관된 로딩 UX 제공
- 개발 시간 단축 (재사용 가능)
- 유지보수 용이 (중앙 관리)
- 사용자 경험 개선 (빠른 체감 속도)

새로운 페이지를 만들 때는 항상 적절한 `PageSkeleton` variant를 선택하여 `loading.tsx`를 만들어주세요!

확인 모달이 필요할 때는 네이티브 `confirm()`이 아닌 `ConfirmationDialog`를 사용하여 일관된 사용자 경험을 제공하세요!
