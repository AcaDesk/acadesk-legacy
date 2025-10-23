import { PageWrapper } from '@/components/layout/page-wrapper'
import { ExamForm } from '@/components/features/exams/ExamForm'
import { requireAuth } from '@/lib/auth/helpers'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '시험 등록',
  description: '새로운 시험을 등록합니다.',
}

export default async function NewExamPage() {
  // Verify authentication
  await requireAuth()

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">시험 등록</h1>
          <p className="text-muted-foreground">새로운 시험을 등록합니다</p>
        </div>

        {/* Form */}
        <ExamForm mode="create" />
      </div>
    </PageWrapper>
  )
}
