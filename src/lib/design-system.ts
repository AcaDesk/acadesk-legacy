/**
 * Design System - Typography, Spacing, and Component Standards
 *
 * 이 파일은 Acadesk Web의 일관된 디자인 시스템을 정의합니다.
 * shadcn/ui와 Tailwind CSS 변수를 기반으로 합니다.
 */

import { cn } from '@/lib/utils'

/**
 * Typography Styles
 * Tailwind의 prose와 shadcn의 타이포그래피를 따릅니다
 */
export const typography = {
  // Page Headers
  h1: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
  h2: 'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
  h3: 'scroll-m-20 text-2xl font-semibold tracking-tight',
  h4: 'scroll-m-20 text-xl font-semibold tracking-tight',

  // Page Title (주로 페이지 상단에 사용)
  pageTitle: 'text-3xl font-bold tracking-tight',

  // Section Title (카드나 섹션 제목)
  sectionTitle: 'text-xl font-semibold tracking-tight',

  // Card Title
  cardTitle: 'text-lg font-semibold',

  // Body Text
  lead: 'text-xl text-muted-foreground',
  body: 'text-base leading-7',
  small: 'text-sm font-medium leading-none',
  muted: 'text-sm text-muted-foreground',

  // Labels
  label: 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',

  // Code
  code: 'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
}

/**
 * Layout Spacing
 * 페이지와 섹션 간의 일관된 간격
 */
export const spacing = {
  // Page Container Padding
  pageContainer: 'p-6 lg:p-8',

  // Section Spacing
  sectionGap: 'space-y-6',
  sectionGapLarge: 'space-y-8',
  sectionGapSmall: 'space-y-4',

  // Card Padding
  cardPadding: 'p-6',
  cardPaddingSmall: 'p-4',

  // Grid Gaps
  gridGap: 'gap-6',
  gridGapSmall: 'gap-4',
}

/**
 * Page Header Component Props
 * 페이지 상단 헤더의 표준 구조
 */
export interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
}

/**
 * 표준 페이지 헤더 클래스
 */
export const pageHeader = {
  container: 'flex items-center justify-between',
  content: 'space-y-1',
  title: typography.pageTitle,
  description: typography.muted,
}

/**
 * 표준 카드 스타일
 */
export const card = {
  base: 'rounded-lg border bg-card text-card-foreground shadow-sm',
  header: 'flex flex-col space-y-1.5 p-6',
  title: typography.cardTitle,
  description: typography.muted,
  content: 'p-6 pt-0',
  footer: 'flex items-center p-6 pt-0',
}

/**
 * 버튼 그룹 스타일
 */
export const buttonGroup = {
  horizontal: 'flex items-center gap-2',
  vertical: 'flex flex-col gap-2',
}

/**
 * 테이블 스타일
 */
export const table = {
  container: 'relative w-full overflow-auto',
  wrapper: 'w-full caption-bottom text-sm',
  header: 'border-b',
  headerRow: '[&_tr]:border-b',
  body: '[&_tr:last-child]:border-0',
  row: 'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
  head: 'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
  cell: 'p-4 align-middle [&:has([role=checkbox])]:pr-0',
}

/**
 * Form 스타일
 */
export const form = {
  container: 'space-y-6',
  fieldset: 'space-y-4',
  field: 'space-y-2',
  actions: 'flex items-center justify-end gap-2 pt-4',
}

/**
 * 빈 상태 (Empty State) 스타일
 */
export const emptyState = {
  container: 'flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center',
  icon: 'mx-auto h-12 w-12 text-muted-foreground',
  title: 'mt-4 text-lg font-semibold',
  description: 'mb-4 mt-2 text-sm text-muted-foreground',
}

/**
 * Stats Card (통계 카드) 스타일
 */
export const statsCard = {
  container: 'rounded-lg border bg-card p-6 shadow-sm',
  header: 'flex items-center justify-between space-y-0 pb-2',
  title: 'text-sm font-medium text-muted-foreground',
  icon: 'h-4 w-4 text-muted-foreground',
  value: 'text-2xl font-bold',
  description: 'text-xs text-muted-foreground',
  trend: {
    positive: 'text-xs font-medium text-green-600',
    negative: 'text-xs font-medium text-red-600',
    neutral: 'text-xs font-medium text-muted-foreground',
  }
}

/**
 * Badge 색상 variants
 */
export const badgeVariants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/80',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/80',
  outline: 'text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  success: 'bg-green-500 text-white hover:bg-green-600',
  warning: 'bg-yellow-500 text-white hover:bg-yellow-600',
  info: 'bg-blue-500 text-white hover:bg-blue-600',
}

/**
 * Helper: 페이지 컨테이너 클래스 생성
 */
export function createPageContainer(className?: string) {
  return cn(spacing.pageContainer, spacing.sectionGap, className)
}

/**
 * Helper: 섹션 클래스 생성
 */
export function createSection(className?: string) {
  return cn(spacing.sectionGapSmall, className)
}
