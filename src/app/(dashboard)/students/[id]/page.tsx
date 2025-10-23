/**
 * Student Detail Page - Server Component
 *
 * 이 페이지는 Server Component로 작동하여:
 * 1. params를 await하고 studentId 추출
 * 2. Server Action을 통해 모든 데이터 조회 (권한 검증 포함)
 * 3. Client Component에 완성된 데이터를 props로 전달
 */

import { notFound } from 'next/navigation'
import { StudentDetailClient } from './StudentDetailClient'
import { getStudentDetail } from '@/app/actions/students'
import { logError } from '@/lib/error-handlers'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function StudentDetailPage({ params }: PageProps) {
  // Next.js 15: params는 Promise이므로 await 필요
  const { id } = await params

  // Server Action을 통해 데이터 조회 (권한 검증 포함)
  const result = await getStudentDetail(id)

  if (!result.success || !result.data) {
    // 에러 로깅
    logError(new Error(result.error || '학생을 찾을 수 없습니다'), {
      page: 'student-detail',
      studentId: id,
    })
    notFound()
  }

  // Client Component에 완성된 데이터 전달
  return <StudentDetailClient initialData={result.data} />
}
