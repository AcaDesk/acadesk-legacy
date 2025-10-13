import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "일정 관리",
  description: "학원의 모든 일정을 캘린더로 관리합니다. 수업 일정, 시험, 상담, 행사 등을 한눈에 확인하고 관리하세요.",
}

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
