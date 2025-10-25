import { PageSkeleton } from '@/components/ui/page-skeleton'

/**
 * Students Page Loading State
 *
 * 학생 목록 페이지의 로딩 상태입니다.
 * 검색바 + 테이블 형태의 스켈레톤을 표시합니다.
 */
export default function StudentsLoading() {
  return <PageSkeleton variant="list" />
}
