import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { PageHeader } from '@ui/page-header'
import { StudentList } from '@/components/features/students/student-list'
import { StudentListSkeleton } from '@/components/features/students/student-list-skeleton'
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'
import { StudentsPageClient } from './students-page-client'

interface StudentsPageProps {
  searchParams: Promise<{
    fromConsultation?: string
    name?: string
    guardianName?: string
    guardianPhone?: string
  }>
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const params = await searchParams

  // Extract consultation parameters for client component
  const initialValues = params.fromConsultation
    ? {
        consultationId: params.fromConsultation,
        name: params.name,
        guardianName: params.guardianName,
        guardianPhone: params.guardianPhone,
      }
    : undefined

  return (
    <PageErrorBoundary pageName="학생 관리">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header with Client-side interactions */}
        <StudentsPageClient initialValues={initialValues}>
          {/* Header */}
          <section aria-label="페이지 헤더" className="animate-in fade-in-50 slide-in-from-top-2 duration-500">
            <PageHeader
              title="학생 관리"
              description="학생 정보 및 성적을 관리합니다"
            />
          </section>

          {/* Student List */}
          <section aria-label="학생 목록" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
            <SectionErrorBoundary sectionName="학생 목록">
              <Card>
                <CardHeader>
                  <CardTitle>전체 학생 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<StudentListSkeleton />}>
                    <StudentList />
                  </Suspense>
                </CardContent>
              </Card>
            </SectionErrorBoundary>
          </section>
        </StudentsPageClient>
      </div>
    </PageErrorBoundary>
  )
}
