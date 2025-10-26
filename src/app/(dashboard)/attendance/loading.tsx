import { PageSkeleton } from '@/components/ui/page-skeleton'

/**
 * Attendance Page Loading State
 *
 * 출석 관리 페이지의 로딩 상태입니다.
 * 출석 테이블 형태의 스켈레톤을 표시합니다.
 */
export default function AttendanceLoading() {
  return <PageSkeleton variant="table" />
}
