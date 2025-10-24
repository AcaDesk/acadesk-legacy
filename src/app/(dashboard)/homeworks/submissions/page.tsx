import Link from 'next/link'
import { Button } from '@ui/button'
import { PageHeader } from '@ui/page-header'
import { ArrowLeft } from 'lucide-react'
import { PageErrorBoundary } from '@/components/layout/page-error-boundary'
import { getHomeworksWithSubmissions } from '@/app/actions/homeworks'
import { createClient } from '@/lib/supabase/server'
import { SubmissionsClient } from './submissions-client'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * 숙제 제출 현황 페이지 (Server Component)
 * - 학생별 제출 현황 확인
 * - 채점 인터페이스 제공
 */
export default async function SubmissionsPage() {
  // Fetch homeworks with submissions
  const result = await getHomeworksWithSubmissions()

  if (!result.success || !result.data) {
    console.error('Error fetching homeworks:', result.error)
  }

  // Fetch student info for each homework
  const supabase = await createClient()
  const homeworksWithStudents = await Promise.all(
    (result.data || []).map(async (homework) => {
      const { data: student } = await supabase
        .from('students')
        .select('student_code, user_id!inner(name)')
        .eq('id', homework.student_id)
        .single()

      // Type assertion for nested relation
      const studentData = student as { student_code: string; user_id: { name: string } } | null

      return {
        ...homework,
        student_name: studentData?.user_id?.name || 'Unknown',
        student_code: studentData?.student_code || '-',
      }
    })
  )

  return (
    <PageErrorBoundary pageName="제출 현황">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <section
          aria-label="페이지 헤더"
          className="animate-in fade-in-50 slide-in-from-top-2 duration-500"
          style={{ animationDelay: '50ms' }}
        >
          <PageHeader
            title="제출 현황"
            description="학생별 숙제 제출 현황을 확인하고 채점합니다"
            action={
              <Link href="/homeworks">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  목록으로
                </Button>
              </Link>
            }
          />
        </section>

        {/* Main Content */}
        <SubmissionsClient initialHomeworks={homeworksWithStudents} />
      </div>
    </PageErrorBoundary>
  )
}
