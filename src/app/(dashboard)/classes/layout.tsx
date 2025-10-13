import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "수업 관리",
  description: "수업 일정과 클래스를 관리합니다. 수업 세션 생성, 학생 등록, 진도 관리 등을 통합적으로 운영하세요.",
}

export default function ClassesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
