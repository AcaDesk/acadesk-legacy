import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "도서 관리",
  description: "학원 도서관의 책과 대여 현황을 관리합니다. 도서 등록, 대여/반납 처리, 연체 관리를 간편하게 운영하세요.",
}

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
