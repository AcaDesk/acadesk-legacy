import { Skeleton } from '@ui/skeleton'

/**
 * 설정 탭 전환 로딩 스켈레톤
 *
 * settings/layout.tsx의 <main> 영역에만 표시된다 — 사이드 내비게이션은
 * 유지되므로 탭 클릭 즉시 시각적 피드백이 생긴다. 이 파일이 없으면
 * 서버 렌더가 끝날 때까지 이전 화면이 멈춘 것처럼 보인다.
 */
export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* 페이지 제목 */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* 폼/카드 영역 */}
      <div className="rounded-xl border p-6 space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border p-6 space-y-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
