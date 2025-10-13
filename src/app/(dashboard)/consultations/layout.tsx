import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "상담 관리",
  description: "학부모 상담 일정과 기록을 관리합니다. 상담 예약, 내용 기록, 후속 조치 사항을 체계적으로 관리하세요.",
}

export default function ConsultationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
