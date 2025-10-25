import { PageSkeleton } from '@/components/ui/page-skeleton'

/**
 * Consultations Page Loading State
 *
 * 상담 관리 페이지의 로딩 상태입니다.
 * 그리드 형태의 스켈레톤을 표시합니다.
 */
export default function ConsultationsLoading() {
  return <PageSkeleton variant="grid" />
}
