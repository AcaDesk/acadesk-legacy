import { PageSkeleton } from '@/components/ui/page-skeleton'

/**
 * Grades Page Loading State
 *
 * 성적 입력 페이지의 로딩 상태입니다.
 * 폼 형태의 스켈레톤을 표시합니다.
 */
export default function GradesLoading() {
  return <PageSkeleton variant="form" />
}
