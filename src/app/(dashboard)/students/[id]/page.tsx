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
    const errorMsg = result.error || ''

    // "찾을 수 없습니다"만 404, 나머지(권한/DB/네트워크 오류)는 throw
    if (errorMsg.includes('찾을 수 없') || errorMsg.includes('not found')) {
      notFound()
    }

    logError(new Error(errorMsg || '학생 상세 조회 실패'), {
      page: 'student-detail',
      studentId: id,
    })
    throw new Error(errorMsg || '학생 정보를 불러오는 중 오류가 발생했습니다')
  }

  // Client Component에 완성된 데이터 전달
  return <StudentDetailClient initialData={result.data} />
}
