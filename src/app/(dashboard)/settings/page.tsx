import { requireAuth } from '@/lib/auth/helpers'
import { getAcademyInfo } from '@/app/actions/academy'
import { SettingsClient } from './settings-client'

export default async function SettingsPage() {
  await requireAuth()
  const result = await getAcademyInfo()

  const systemInfo = {
    version: 'v1.0.0',
    academyName: result.success ? (result.data?.name ?? 'Acadesk 학원') : 'Acadesk 학원',
    plan: result.success ? (result.data?.plan ?? 'free') : 'free',
    lastBackup: new Date().toISOString().split('T')[0],
  }

  return <SettingsClient systemInfo={systemInfo} />
}
