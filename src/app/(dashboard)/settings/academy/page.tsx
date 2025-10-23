import { PageWrapper } from '@/components/layout/page-wrapper'
import { requireAuth } from '@/lib/auth/helpers'
import { getAcademyInfo } from '@/app/actions/academy'
import { AcademyInfoForm } from './academy-info-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '학원 정보',
  description: '학원 기본 정보를 관리합니다.',
}

export default async function AcademySettingsPage() {
  // Verify authentication
  await requireAuth()

  // Fetch academy info
  const result = await getAcademyInfo()

  const academyData = result.success && result.data ? result.data : null

  return (
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">학원 정보</h1>
          <p className="text-muted-foreground">학원 기본 정보 및 운영 시간을 관리합니다</p>
        </div>

        {/* Form */}
        {academyData && <AcademyInfoForm initialData={academyData} />}
      </div>
    </PageWrapper>
  )
}
