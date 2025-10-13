import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "설정",
  description: "학원 시스템의 각종 설정을 관리합니다. 과목 설정, 알림 설정, 사용자 권한 등을 구성하세요.",
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
