import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "리포트 관리",
  description: "학생별 학습 리포트를 자동 생성하고 관리합니다. 출석률, 성적 변화, 과제 완료 현황을 포함한 종합 리포트를 보호자에게 전송하세요.",
}

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
