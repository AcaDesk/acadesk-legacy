import { notFound } from 'next/navigation'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { ExamForm } from '@/components/features/exams/ExamForm'
import { requireAuth } from '@/lib/auth/helpers'
import { getExamById } from '@/app/actions/exams'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '시험 수정 | Acadesk',
  description: '시험 정보를 수정합니다.',
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditExamPage({ params }: PageProps) {
  // Verify authentication
  await requireAuth()

  // Get exam ID from params
  const { id: examId } = await params

  // Fetch exam data
  const result = await getExamById(examId)

  if (!result.success || !result.data) {
    notFound()
  }

  const exam = result.data

  // Convert to form default values
  const defaultValues = {
    name: exam.name,
    subject_id: exam.subject_id || undefined,
    category_code: exam.category_code || undefined,
    exam_type: exam.exam_type || undefined,
    // Convert ISO date to YYYY-MM-DD format if present
    exam_date: exam.exam_date ? exam.exam_date.split('T')[0] : '',
    class_id: exam.class_id || undefined,
    total_questions: exam.total_questions?.toString() || '',
    passing_score: exam.passing_score?.toString() || '',
    description: exam.description || '',
    is_recurring: exam.is_recurring || false,
    recurring_schedule: exam.recurring_schedule || undefined,
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">시험 수정</h1>
          <p className="text-muted-foreground">{exam.name}</p>
        </div>

        {/* Form */}
        <ExamForm mode="edit" examId={examId} defaultValues={defaultValues} />
      </div>
    </PageWrapper>
  )
}
