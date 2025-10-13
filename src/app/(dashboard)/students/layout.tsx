import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "학생 관리",
  description: "학생 정보를 등록하고 관리합니다. 학생 프로필, 학습 진도, 출석 현황, 성적 변화를 한눈에 확인하세요.",
}

export default function StudentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
