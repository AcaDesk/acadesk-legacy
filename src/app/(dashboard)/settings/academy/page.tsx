import { requireAuth } from '@/lib/auth/helpers'
import { getAcademyInfo } from '@/app/actions/academy'
import { AcademyInfoForm } from './academy-info-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '학원 정보',
  description: '학원 기본 정보를 관리합니다.',
}

export default async function AcademySettingsPage() {
  await requireAuth()

  const result = await getAcademyInfo()
  const academyData = result.success && result.data ? result.data : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">학원 정보</h2>
        <p className="text-sm text-muted-foreground">학원 기본 정보 및 운영 시간을 관리합니다</p>
      </div>
      {academyData && <AcademyInfoForm initialData={academyData} />}
    </div>
  )
}
