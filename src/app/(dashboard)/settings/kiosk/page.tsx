import { requireAuth } from '@/lib/auth/helpers'
import { KioskSettingsClient } from './kiosk-settings-client'

export const metadata = {
  title: '키오스크 설정',
}

export default async function KioskSettingsPage() {
  await requireAuth()
  return <KioskSettingsClient />
}
