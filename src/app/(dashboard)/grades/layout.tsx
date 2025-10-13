import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "성적 관리",
  description: "시험 성적을 입력하고 관리합니다. 분수 형식(30/32)으로 간편하게 입력하면 자동 계산되며, 성적 추이와 통계를 확인할 수 있습니다.",
}

export default function GradesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
