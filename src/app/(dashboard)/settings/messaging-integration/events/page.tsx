import { requireAuth } from '@/lib/auth/helpers'
import { MessagingIntegrationClient } from '../messaging-integration-client'
import { loadMessagingIntegrationData } from '../_load-data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이벤트 알림 · 알림 서비스 연동',
  description: '이벤트별 알림톡 자동 발송을 설정합니다.',
}

export default async function MessagingEventsPage() {
  await requireAuth()
  const data = await loadMessagingIntegrationData()

  return (
    <MessagingIntegrationClient
      config={data.config}
      kakaoChannelConfig={data.kakaoConfig}
      eventSubscriptions={data.eventSubscriptions}
      eventSubscriptionsLoadError={data.eventSubscriptionsLoadError}
      initialKakaoTemplateSummary={data.kakaoTemplateSummary}
      defaultSection="events"
    />
  )
}
