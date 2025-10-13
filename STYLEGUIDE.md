# Acadesk Web - Style Guide

이 문서는 Acadesk Web 프로젝트의 일관된 UI/UX 디자인을 유지하기 위한 스타일 가이드입니다.

## 목차
- [디자인 원칙](#디자인-원칙)
- [타이포그래피](#타이포그래피)
- [색상 시스템](#색상-시스템)
- [간격과 레이아웃](#간격과-레이아웃)
- [컴포넌트 사용 가이드](#컴포넌트-사용-가이드)

---

## 디자인 원칙

### 1. 일관성 (Consistency)
- **모든 페이지는 shadcn/ui 컴포넌트를 사용합니다**
- CSS 변수 기반 테마 시스템을 따릅니다
- 하드코딩된 색상 값 사용 금지 (예: `#3b82f6` ❌, `bg-primary` ✅)

### 2. 접근성 (Accessibility)
- 충분한 색상 대비 (WCAG AA 이상)
- 명확한 라벨과 설명
- 키보드 네비게이션 지원

### 3. 반응형 (Responsive)
- 모바일 우선 접근
- Tailwind 브레이크포인트 활용 (`sm:`, `md:`, `lg:`, `xl:`)

---

## 타이포그래피

### 폰트 패밀리
```css
--font-sans: Inter, sans-serif;        /* 본문 및 UI */
--font-mono: JetBrains Mono, monospace; /* 코드 */
--font-serif: Source Serif 4, serif;    /* 특수 용도 */
```

### 헤딩 스타일

```tsx
// 페이지 제목 (Page Title)
<h1 className="text-3xl font-bold tracking-tight">학생 관리</h1>

// 섹션 제목 (Section Title)
<h2 className="text-2xl font-semibold tracking-tight">기본 정보</h2>

// 카드 제목 (Card Title)
<h3 className="text-xl font-semibold">출석 현황</h3>

// 서브 헤딩
<h4 className="text-lg font-semibold">성적 추이</h4>
```

### 본문 텍스트

```tsx
// 일반 본문
<p className="text-base leading-7">...</p>

// 리드 텍스트 (강조)
<p className="text-xl text-muted-foreground">...</p>

// 작은 텍스트
<p className="text-sm text-muted-foreground">...</p>

// 레이블
<label className="text-sm font-medium">이름</label>
```

### Design System Helper 사용

```tsx
import { typography } from '@/lib/design-system'

<h1 className={typography.pageTitle}>학생 관리</h1>
<p className={typography.muted}>학생 목록을 관리합니다</p>
```

---

## 색상 시스템

### 주요 색상 (CSS 변수)

모든 색상은 CSS 변수로 정의되어 있으며, Tailwind 유틸리티로 사용합니다.

```tsx
// ✅ 올바른 사용
<div className="bg-primary text-primary-foreground">버튼</div>
<p className="text-muted-foreground">설명 텍스트</p>
<div className="border border-border">카드</div>

// ❌ 잘못된 사용 (하드코딩)
<div className="bg-blue-500 text-white">버튼</div>
<p className="text-gray-500">설명 텍스트</p>
```

### 시맨틱 색상

| 용도 | Tailwind 클래스 | 설명 |
|------|----------------|------|
| 배경 | `bg-background` | 페이지 배경 |
| 전경(텍스트) | `text-foreground` | 기본 텍스트 |
| 기본 색상 | `bg-primary` | 주요 액션, 브랜드 |
| 보조 색상 | `bg-secondary` | 부차적 요소 |
| 뮤트 | `bg-muted` | 비활성/강조 약한 요소 |
| 액센트 | `bg-accent` | 강조 요소 |
| 파괴적 | `bg-destructive` | 삭제, 경고 |
| 카드 | `bg-card` | 카드 배경 |
| 팝오버 | `bg-popover` | 드롭다운, 모달 |

### 상태 색상 (Badge, 알림)

```tsx
import { badgeVariants } from '@/lib/design-system'

<Badge variant="success">성공</Badge>
<Badge variant="warning">경고</Badge>
<Badge variant="destructive">오류</Badge>
<Badge variant="outline">기본</Badge>
```

---

## 간격과 레이아웃

### 페이지 레이아웃

**항상 `PageWrapper`를 사용하세요:**

```tsx
import { PageWrapper } from '@/components/layout/page-wrapper'

export default function MyPage() {
  return (
    <PageWrapper
      title="페이지 제목"
      subtitle="페이지 설명"
      icon={<Icon className="w-6 h-6" />}
      actions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          새로 만들기
        </Button>
      }
    >
      {/* 페이지 내용 */}
    </PageWrapper>
  )
}
```

### 표준 간격

```tsx
import { spacing } from '@/lib/design-system'

// 섹션 간 간격
<div className={spacing.sectionGap}>        {/* space-y-6 */}
<div className={spacing.sectionGapLarge}>   {/* space-y-8 */}
<div className={spacing.sectionGapSmall}>   {/* space-y-4 */}

// 카드 패딩
<div className={spacing.cardPadding}>       {/* p-6 */}
<div className={spacing.cardPaddingSmall}>  {/* p-4 */}

// 그리드 간격
<div className={spacing.gridGap}>           {/* gap-6 */}
```

### 그리드 레이아웃

```tsx
// 2열 그리드 (반응형)
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

// 3열 그리드
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// 4열 그리드
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## 컴포넌트 사용 가이드

### 페이지 헤더

```tsx
import { PageHeader } from '@/components/ui/page-header'

<PageHeader
  title="학생 관리"
  description="학생 정보를 등록하고 관리합니다"
  action={<Button>새 학생 등록</Button>}
/>
```

### 카드

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>카드 제목</CardTitle>
    <CardDescription>카드 설명</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 내용 */}
  </CardContent>
  <CardFooter>
    {/* 푸터 액션 */}
  </CardFooter>
</Card>
```

### 빈 상태 (Empty State)

```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { Users } from 'lucide-react'

<EmptyState
  icon={Users}
  title="등록된 학생이 없습니다"
  description="새 학생을 등록하여 시작하세요"
  action={<Button>새 학생 등록</Button>}
/>
```

### 테이블

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

<div className="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>이름</TableHead>
        <TableHead>이메일</TableHead>
        <TableHead className="text-right">액션</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((item) => (
        <TableRow key={item.id}>
          <TableCell className="font-medium">{item.name}</TableCell>
          <TableCell>{item.email}</TableCell>
          <TableCell className="text-right">...</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### 폼

```tsx
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>이름</FormLabel>
          <FormControl>
            <Input placeholder="홍길동" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
    <Button type="submit">저장</Button>
  </form>
</Form>
```

### 버튼

```tsx
import { Button } from '@/components/ui/button'

// 기본 버튼
<Button>기본</Button>

// Variants
<Button variant="default">기본</Button>
<Button variant="destructive">삭제</Button>
<Button variant="outline">아웃라인</Button>
<Button variant="secondary">보조</Button>
<Button variant="ghost">고스트</Button>
<Button variant="link">링크</Button>

// Sizes
<Button size="default">기본</Button>
<Button size="sm">작게</Button>
<Button size="lg">크게</Button>
<Button size="icon">아이콘</Button>

// 아이콘과 함께
<Button>
  <Plus className="w-4 h-4 mr-2" />
  추가
</Button>
```

### 배지

```tsx
import { Badge } from '@/components/ui/badge'

<Badge>기본</Badge>
<Badge variant="secondary">보조</Badge>
<Badge variant="destructive">삭제</Badge>
<Badge variant="outline">아웃라인</Badge>
```

### 대화상자 (Dialog)

```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>제목</DialogTitle>
      <DialogDescription>설명</DialogDescription>
    </DialogHeader>
    {/* 내용 */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
      <Button onClick={handleConfirm}>확인</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 토스트 알림

```tsx
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

// 성공
toast({
  title: "저장 완료",
  description: "변경사항이 저장되었습니다.",
})

// 오류
toast({
  variant: "destructive",
  title: "저장 실패",
  description: "오류가 발생했습니다.",
})
```

---

## 체크리스트

새 페이지를 만들 때 다음을 확인하세요:

- [ ] `PageWrapper`로 감싸져 있나요?
- [ ] shadcn/ui 컴포넌트를 사용하고 있나요?
- [ ] 하드코딩된 색상이 없나요?
- [ ] 타이포그래피 클래스가 일관적인가요?
- [ ] 간격이 표준 스케일을 따르나요? (`space-y-4`, `space-y-6`, `gap-6` 등)
- [ ] 반응형 디자인이 적용되었나요?
- [ ] 로딩 상태가 있나요?
- [ ] 빈 상태가 있나요?
- [ ] 에러 처리가 있나요?

---

## 참고 자료

- [shadcn/ui 공식 문서](https://ui.shadcn.com/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)
- [CLAUDE.md](./CLAUDE.md) - 프로젝트 전체 가이드
