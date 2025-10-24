# Loading, Skeleton, and Animation Patterns

This guide provides standardized patterns for loading states, skeleton loaders, and animations across the Acadesk Web application.

## Table of Contents

- [Animation Patterns](#animation-patterns)
- [Loading States](#loading-states)
- [Skeleton Loaders](#skeleton-loaders)
- [Page-Level Patterns](#page-level-patterns)
- [Migration Guide](#migration-guide)

---

## Animation Patterns

### Using Tailwind Animations (Recommended)

For most cases, use Tailwind CSS animations which are performant and simple:

```tsx
import { TAILWIND_ANIMATIONS, PAGE_ANIMATIONS } from '@/lib/animation-config'

// Header element
<div className={PAGE_ANIMATIONS.header}>
  <PageHeader title="학생 관리" />
</div>

// First section
<section className={PAGE_ANIMATIONS.firstSection}>
  <Card>...</Card>
</section>

// Subsequent sections (auto-staggered)
{sections.map((section, index) => {
  const animation = PAGE_ANIMATIONS.getSection(index)
  return (
    <section key={section.id} {...animation}>
      <Card>...</Card>
    </section>
  )
})}

// List items (staggered)
import { getListItemAnimation } from '@/lib/animation-config'

{items.map((item, index) => (
  <div key={item.id} {...getListItemAnimation(index)}>
    {item.name}
  </div>
))}
```

### Using Framer Motion (Advanced)

Only use `framer-motion` when you need:
- Programmatic control over animations
- Complex gesture-based interactions
- Layout animations

```tsx
import { motion } from 'framer-motion'
import { MOTION_VARIANTS, MOTION_TRANSITIONS } from '@/lib/animation-config'

<motion.div
  initial="initial"
  animate="animate"
  exit="exit"
  variants={MOTION_VARIANTS.fadeInTop}
  transition={MOTION_TRANSITIONS.smooth}
>
  <Card>...</Card>
</motion.div>
```

### Animation Configuration Reference

```typescript
import {
  ANIMATION_DURATION,    // { FAST: 200, NORMAL: 300, SLOW: 500, ... }
  ANIMATION_DELAY,       // { NONE: 0, SMALL: 100, MEDIUM: 200, ... }
  TAILWIND_ANIMATIONS,   // Pre-configured Tailwind classes
  MOTION_VARIANTS,       // Framer Motion variants
  getStaggerDelay,       // Calculate stagger delays
} from '@/lib/animation-config'
```

---

## Loading States

### Standard Loading Component

Use `LoadingState` for all loading indicators:

```tsx
import { LoadingState } from '@ui/loading-state'

// Inline loading (next to content)
{loading && <LoadingState variant="inline" message="데이터 로딩 중..." />}

// Card loading (replaces content)
{loading ? (
  <LoadingState variant="card" message="학생 목록을 불러오는 중..." />
) : (
  <StudentList data={data} />
)}

// Just spinner (no message)
{loading && <LoadingState variant="spinner" />}

// Fullscreen loading (modal overlay)
<LoadingState variant="fullscreen" message="저장 중..." />
```

### Button Loading States

```tsx
import { ButtonLoadingSpinner } from '@ui/loading-state'

<Button disabled={loading}>
  {loading && <ButtonLoadingSpinner />}
  {loading ? '저장 중...' : '저장'}
</Button>
```

### Empty States

```tsx
import { EmptyState } from '@ui/loading-state'
import { Users } from 'lucide-react'

{data.length === 0 && (
  <EmptyState
    icon={<Users className="h-12 w-12" />}
    title="학생이 없습니다"
    description="새 학생을 등록하여 시작하세요"
    action={<Button>학생 추가</Button>}
  />
)}
```

---

## Skeleton Loaders

### Widget Skeletons

Use `WidgetSkeleton` for individual widget loading states:

```tsx
import { WidgetSkeleton } from '@ui/widget-skeleton'

<Suspense fallback={<WidgetSkeleton variant="stats" />}>
  <KPICard />
</Suspense>

<Suspense fallback={<WidgetSkeleton variant="list" />}>
  <StudentList />
</Suspense>

<Suspense fallback={<WidgetSkeleton variant="chart" />}>
  <GradesChart />
</Suspense>

<Suspense fallback={<WidgetSkeleton variant="table" />}>
  <DataTable />
</Suspense>
```

Available variants:
- `stats` - KPI cards
- `list` - Student lists, activity feeds
- `chart` - Charts and graphs
- `calendar` - Calendar widgets
- `table` - Data tables
- `default` - Generic content

### Page Skeletons

Use `PageSkeleton` for full-page loading states:

```tsx
import { PageSkeleton } from '@ui/page-skeleton'

// In a loading.tsx file or Suspense fallback
<PageSkeleton variant="list" />
<PageSkeleton variant="grid" />
<PageSkeleton variant="detail" />
<PageSkeleton variant="form" />
<PageSkeleton variant="dashboard" />
```

### Section Skeletons

Use `SectionSkeleton` for individual sections within a page:

```tsx
import { SectionSkeleton } from '@ui/page-skeleton'

<Suspense fallback={<SectionSkeleton variant="stats" />}>
  <StatsSection />
</Suspense>
```

---

## Page-Level Patterns

### Standard Page Structure

Follow this pattern for all pages:

```tsx
'use client'

import { Suspense } from 'react'
import { PageSkeleton } from '@ui/page-skeleton'
import { PAGE_ANIMATIONS } from '@/lib/animation-config'
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'

export default function MyPage() {
  return (
    <PageErrorBoundary pageName="페이지 이름">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <section aria-label="페이지 헤더" className={PAGE_ANIMATIONS.header}>
          <PageHeader title="페이지 제목" description="설명" />
        </section>

        {/* First Section */}
        <section aria-label="주요 콘텐츠" className={PAGE_ANIMATIONS.firstSection}>
          <SectionErrorBoundary sectionName="주요 콘텐츠">
            <Suspense fallback={<WidgetSkeleton variant="list" />}>
              <MainContent />
            </Suspense>
          </SectionErrorBoundary>
        </section>

        {/* Additional Sections */}
        <section
          aria-label="추가 콘텐츠"
          {...PAGE_ANIMATIONS.getSection(1)}
        >
          <SectionErrorBoundary sectionName="추가 콘텐츠">
            <Suspense fallback={<WidgetSkeleton variant="chart" />}>
              <AdditionalContent />
            </Suspense>
          </SectionErrorBoundary>
        </section>
      </div>
    </PageErrorBoundary>
  )
}
```

### List Page Pattern

```tsx
import { PageSkeleton } from '@ui/page-skeleton'

export default function StudentsPage() {
  return (
    <PageErrorBoundary pageName="학생 관리">
      <div className="p-6 lg:p-8 space-y-6">
        <section className={PAGE_ANIMATIONS.header}>
          <PageHeader title="학생 관리" />
        </section>

        <section {...PAGE_ANIMATIONS.getSection(0)}>
          <Suspense fallback={<PageSkeleton variant="list" />}>
            <StudentList />
          </Suspense>
        </section>
      </div>
    </PageErrorBoundary>
  )
}
```

### Form Page Pattern

```tsx
export default function GradesInputPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(data) {
    setLoading(true)
    try {
      await saveGrade(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <section className={PAGE_ANIMATIONS.header}>
        <PageHeader title="성적 입력" />
      </section>

      <section className={PAGE_ANIMATIONS.firstSection}>
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              {/* Form fields */}
              <Button disabled={loading}>
                {loading && <ButtonLoadingSpinner />}
                {loading ? '저장 중...' : '저장'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
```

### Detail Page Pattern

```tsx
export default function StudentDetailPage({ params }) {
  return (
    <PageErrorBoundary pageName="학생 상세">
      <Suspense fallback={<PageSkeleton variant="detail" />}>
        <StudentDetail id={params.id} />
      </Suspense>
    </PageErrorBoundary>
  )
}

async function StudentDetail({ id }) {
  const student = await getStudent(id)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <section className={PAGE_ANIMATIONS.header}>
        {/* Header with back button */}
      </section>

      <section {...PAGE_ANIMATIONS.getSection(0)}>
        {/* Stats cards */}
      </section>

      <section {...PAGE_ANIMATIONS.getSection(1)}>
        {/* Tabs with content */}
      </section>
    </div>
  )
}
```

---

## Migration Guide

### Step 1: Replace Custom Animations

❌ **Before:**
```tsx
// Inconsistent timing and classes
<div className="animate-in fade-in slide-in-from-top duration-300">

// Or inconsistent framer-motion
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
```

✅ **After:**
```tsx
import { PAGE_ANIMATIONS } from '@/lib/animation-config'

<div className={PAGE_ANIMATIONS.header}>
```

### Step 2: Replace Custom Loading States

❌ **Before:**
```tsx
{loading && (
  <div className="flex items-center gap-2">
    <Loader2 className="h-5 w-5 animate-spin" />
    <span>로딩 중...</span>
  </div>
)}
```

✅ **After:**
```tsx
import { LoadingState } from '@ui/loading-state'

{loading && <LoadingState variant="inline" message="로딩 중..." />}
```

### Step 3: Replace Custom Skeletons

❌ **Before:**
```tsx
{loading ? (
  <Card>
    <CardContent className="py-12">
      <Loader2 className="h-12 w-12 mx-auto animate-spin" />
    </CardContent>
  </Card>
) : (
  <StudentList />
)}
```

✅ **After:**
```tsx
import { WidgetSkeleton } from '@ui/widget-skeleton'

<Suspense fallback={<WidgetSkeleton variant="list" />}>
  <StudentList />
</Suspense>
```

### Step 4: Standardize Page Structure

❌ **Before:**
```tsx
export default function MyPage() {
  const [loading, setLoading] = useState(true)

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Title</h1>
      <Content />
    </div>
  )
}
```

✅ **After:**
```tsx
import { PageSkeleton } from '@ui/page-skeleton'
import { PAGE_ANIMATIONS } from '@/lib/animation-config'

export default function MyPage() {
  return (
    <PageErrorBoundary pageName="페이지 이름">
      <div className="p-6 lg:p-8 space-y-6">
        <section className={PAGE_ANIMATIONS.header}>
          <PageHeader title="Title" />
        </section>

        <section className={PAGE_ANIMATIONS.firstSection}>
          <Suspense fallback={<PageSkeleton variant="list" />}>
            <Content />
          </Suspense>
        </section>
      </div>
    </PageErrorBoundary>
  )
}
```

---

## Best Practices

### ✅ DO

- **Use Tailwind animations** for simple, performant animations
- **Use centralized constants** from `animation-config.ts`
- **Use PageSkeleton** for full-page loading states
- **Use WidgetSkeleton** for individual widget loading
- **Use LoadingState** for inline loading indicators
- **Wrap sections in Suspense** for granular loading
- **Use consistent animation delays** with `getStaggerDelay()`

### ❌ DON'T

- Don't create custom Loader2 implementations
- Don't hardcode animation timing values
- Don't mix Tailwind and framer-motion unnecessarily
- Don't create page-specific skeleton components
- Don't forget to add aria-labels for accessibility
- Don't use framer-motion for simple fade-ins

---

## Quick Reference

```tsx
// Animations
import { PAGE_ANIMATIONS, getListItemAnimation } from '@/lib/animation-config'

// Loading States
import { LoadingState, ButtonLoadingSpinner, EmptyState } from '@ui/loading-state'

// Skeletons
import { PageSkeleton, SectionSkeleton } from '@ui/page-skeleton'
import { WidgetSkeleton } from '@ui/widget-skeleton'

// Error Boundaries
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'
```

---

## Examples

See the following files for complete examples:
- `/src/app/(dashboard)/students/page.tsx` - List page pattern
- `/src/app/(dashboard)/grades/page.tsx` - Form page pattern
- `/src/app/(dashboard)/textbooks/[id]/page.tsx` - Detail page pattern
- `/src/app/(dashboard)/dashboard/page.tsx` - Dashboard pattern

For more details on async widgets and error handling, see:
- `/docs/ASYNC_WIDGETS_GUIDE.md`
- `/docs/error-and-loading-strategy.md`
