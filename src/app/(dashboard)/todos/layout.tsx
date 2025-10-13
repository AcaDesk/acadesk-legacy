import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "TODO 관리",
  description: "학생별 과제와 TODO를 생성하고 관리합니다. 주간 학습 플래너, 완료 현황 추적, 검증 시스템으로 학습 진도를 체계적으로 관리하세요.",
}

export default function TodosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
