/**
 * Student Detail Page - Server Component
 *
 * 이 페이지는 Server Component로 작동하여:
 * 1. params를 await하고 studentId 추출
 * 2. 인증 및 테넌트 확인
 * 3. 모든 데이터를 서버에서 병렬로 페칭 (Promise.all)
 * 4. Client Component에 완성된 데이터를 props로 전달
 */

import { notFound } from 'next/navigation'
import { StudentDetailClient } from './StudentDetailClient'
import { getStudentDetailData } from '@/services/student-detail.service'
import { getCurrentTenantId } from '@/lib/auth-helpers'
import { logError } from '@/lib/error-handlers'
import { NotFoundError } from '@/lib/error-types'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function StudentDetailPage({ params }: PageProps) {
  // 인증 확인 및 tenant_id 조회
  await getCurrentTenantId()

  // Next.js 15: params는 Promise이므로 await 필요
  const { id } = await params

  try {
    // 서버에서 모든 데이터를 병렬로 페칭
    const data = await getStudentDetailData(id)

    // Client Component에 완성된 데이터 전달
    return <StudentDetailClient initialData={data} />
  } catch (error) {
    // 에러 로깅
    logError(error, {
      page: 'student-detail',
      studentId: id,
    })

    // 404 처리
    const notFoundError = new NotFoundError('학생')
    logError(notFoundError, { studentId: id })
    notFound()
  }
}
