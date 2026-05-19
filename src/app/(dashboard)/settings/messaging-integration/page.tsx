import { requireAuth } from '@/lib/auth/helpers'
import { MessagingIntegrationClient } from './messaging-integration-client'
import { loadMessagingIntegrationData } from './_load-data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'API 설정 · 알림 서비스 연동',
  description: 'SMS/알림톡 발송을 위한 API 키를 관리합니다.',
}

export default async function MessagingApiPage() {
  await requireAuth()
  const data = await loadMessagingIntegrationData()

  return (
    <MessagingIntegrationClient
      config={data.config}
      kakaoChannelConfig={data.kakaoConfig}
      eventSubscriptions={data.eventSubscriptions}
      eventSubscriptionsLoadError={data.eventSubscriptionsLoadError}
      initialKakaoTemplateSummary={data.kakaoTemplateSummary}
      kakaoTemplates={data.kakaoTemplates}
      kakaoStats={data.kakaoStats}
      defaultSection="api"
    />
  )
}
