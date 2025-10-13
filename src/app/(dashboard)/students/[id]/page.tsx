/**
 * Student Detail Page - Server Component
 *
 * 이 페이지는 Server Component로 작동하여:
 * 1. params를 await하고 studentId 추출
 * 2. 모든 데이터를 서버에서 병렬로 페칭 (Promise.all)
 * 3. Client Component에 완성된 데이터를 props로 전달
 */

import { notFound } from 'next/navigation'
import { StudentDetailClient } from './StudentDetailClient'
import { getStudentDetailData } from '@/services/studentDetailService'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function StudentDetailPage({ params }: PageProps) {
  // Next.js 15: params는 Promise이므로 await 필요
  const { id } = await params

  try {
    // 서버에서 모든 데이터를 병렬로 페칭
    const data = await getStudentDetailData(id)

    // Client Component에 완성된 데이터 전달
    return <StudentDetailClient initialData={data} />
  } catch (error) {
    console.error('Error loading student detail:', error)
    notFound()
  }
}
