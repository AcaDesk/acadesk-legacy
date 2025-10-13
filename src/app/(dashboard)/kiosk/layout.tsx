import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "학생 키오스크",
  description: "학생용 과제 확인 모드입니다. 학생들이 직접 자신의 TODO와 과제 현황을 확인할 수 있습니다.",
}

export default function KioskLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
