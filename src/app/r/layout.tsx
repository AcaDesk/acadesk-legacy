/**
 * Report Share Layout
 *
 * 리포트 공유 페이지 전용 레이아웃
 * - 스크롤 가능하도록 설정
 * - 대시보드 레이아웃과 분리
 */

export default function ReportShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-auto min-h-screen overflow-y-auto">
      {children}
    </div>
  )
}
