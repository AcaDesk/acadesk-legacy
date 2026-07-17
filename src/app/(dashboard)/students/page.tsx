import { Suspense } from 'react'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { StudentList } from '@/components/features/students/student-list'
import { StudentListSkeleton } from '@/components/features/students/student-list-skeleton'
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'
import { getStudentsListEnriched } from '@/app/actions/students/queries'
import { queryKeys } from '@/lib/query-keys'
import { StudentsPageClient } from './students-page-client'

interface StudentsPageProps {
  searchParams: Promise<{
    fromConsultation?: string
    name?: string
    guardianName?: string
    guardianPhone?: string
  }>
}

/**
 * 학생 목록 서버 프리페치 (스트리밍)
 *
 * 기존에는 클라이언트 마운트 후 useQuery로 페칭해 워터폴이 발생했다.
 * 서버에서 프리페치한 결과를 HydrationBoundary로 전달해 첫 렌더에 데이터가
 * 존재하고, Suspense 경계 덕에 페이지 셸은 즉시 페인트된다.
 * 프리페치 실패 시에는 dehydrate에 포함되지 않아 클라이언트가 재시도한다.
 */
async function StudentListWithData() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: queryKeys.students.enriched(),
    queryFn: async () => {
      const result = await getStudentsListEnriched()
      if (!result.success) {
        throw new Error(result.error || '학생 목록을 불러올 수 없습니다')
      }
      return result.data
    },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StudentList />
    </HydrationBoundary>
  )
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
          {/* Student List */}
          <section aria-label="학생 목록" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
            <SectionErrorBoundary sectionName="학생 목록">
              <Card>
                <CardHeader>
                  <CardTitle>전체 학생 목록</CardTitle>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<StudentListSkeleton />}>
                    <StudentListWithData />
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
