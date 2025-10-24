import Link from 'next/link'
import { Button } from '@ui/button'
import { PageHeader } from '@ui/page-header'
import { BookCopy } from 'lucide-react'
import { PageErrorBoundary } from '@/components/layout/page-error-boundary'
import { getHomeworksWithSubmissions } from '@/app/actions/homeworks'
import { HomeworksClient } from './homeworks-client'
import { createClient } from '@/lib/supabase/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * 숙제 관리 페이지 (Server Component)
 * - 학원에서 내주는 "집에서 해오는 숙제" 관리
 * - TODO는 "학원 내에서 수행하는 과제"와 구분됨
 */
export default async function HomeworksPage() {
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

      return {
        ...homework,
        students: student || null,
      }
    })
  )

  return (
    <PageErrorBoundary pageName="숙제 관리">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <section
          aria-label="페이지 헤더"
          className="animate-in fade-in-50 slide-in-from-top-2 duration-500"
          style={{ animationDelay: '50ms' }}
        >
          <PageHeader
            title="숙제 관리"
            description="집에서 해오는 숙제를 관리하고 제출 현황을 확인합니다"
            action={
              <Link href="/homeworks/new">
                <Button>
                  <BookCopy className="h-4 w-4 mr-2" />
                  숙제 출제
                </Button>
              </Link>
            }
          />
        </section>

        {/* Main Content */}
        <HomeworksClient initialHomeworks={homeworksWithStudents} />
      </div>
    </PageErrorBoundary>
  )
}
