import { PageWrapper } from "@/components/layout/page-wrapper"
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { requireAuth } from '@/lib/auth/helpers'
import { getExams, getExamCategories } from '@/app/actions/exams'
import { ExamsClient } from './exams/exams-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '시험 관리 | Acadesk',
  description: '시험을 등록하고 관리합니다.',
}

export default async function ExamsPage() {
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

  // Fetch data
  const [examsResult, categoriesResult] = await Promise.all([
    getExams(),
    getExamCategories(),
  ])

  const exams = examsResult.success && examsResult.data ? examsResult.data : []
  const categories = categoriesResult.success && categoriesResult.data ? categoriesResult.data : []

  return (
    <PageWrapper>
      <ExamsClient initialExams={exams} categories={categories} />
    </PageWrapper>
  )
}
