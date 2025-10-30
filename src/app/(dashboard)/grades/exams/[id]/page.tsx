import { PageWrapper } from "@/components/layout/page-wrapper"
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { requireAuth } from '@/lib/auth/helpers'
import { getExamById } from '@/app/actions/exams'
import { ExamDetailClient } from './exam-detail-client'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: '시험 상세 | Acadesk',
  description: '시험 정보 및 학생 배정을 관리합니다.',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function ExamDetailPage({ params }: Props) {
  // Feature flag checks
  const featureStatus = FEATURES.gradesManagement

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="시험 관리" description="시험을 등록하고 관리하여, 학생들의 시험 성적을 체계적으로 기록할 수 있습니다." />
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="시험 관리" reason="시험 시스템 업데이트가 진행 중입니다." />
  }

  // Verify authentication
  await requireAuth()

  // Get exam ID from params
  const { id: examId } = await params

  // Fetch exam data
  const examResult = await getExamById(examId)

  if (!examResult.success || !examResult.data) {
    notFound()
  }

  return (
    <PageWrapper>
      <ExamDetailClient exam={examResult.data} />
    </PageWrapper>
  )
}
