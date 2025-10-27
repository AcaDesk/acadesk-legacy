/**
 * Short URL Layout
 *
 * 단축 URL 리다이렉트 페이지 전용 레이아웃
 * - 스크롤 가능하도록 설정
 * - 대시보드 레이아웃과 분리
 */

export default function ShortUrlLayout({
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
