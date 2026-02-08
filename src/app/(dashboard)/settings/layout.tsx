import type { Metadata } from 'next'
import { SettingsNav } from './settings-nav'

export const metadata: Metadata = {
  title: "설정",
  description: "학원 시스템의 각종 설정을 관리합니다. 과목 설정, 알림 설정, 사용자 권한 등을 구성하세요.",
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">설정</h1>
        <p className="text-muted-foreground">학원 시스템 설정 및 개인화</p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar - hidden on mobile, shown as top nav on mobile */}
        <aside className="md:w-56 md:shrink-0">
          <div className="md:sticky md:top-20">
            <SettingsNav />
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
