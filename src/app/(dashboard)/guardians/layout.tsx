import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "보호자 관리",
  description: "학부모 정보를 등록하고 관리합니다. 연락처, 자녀 정보, 소통 이력을 체계적으로 관리하여 원활한 학부모 소통을 지원합니다.",
}

export default function GuardiansLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
