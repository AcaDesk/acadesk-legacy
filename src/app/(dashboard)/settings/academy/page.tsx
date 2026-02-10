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

  return academyData ? <AcademyInfoForm initialData={academyData} /> : null
}
