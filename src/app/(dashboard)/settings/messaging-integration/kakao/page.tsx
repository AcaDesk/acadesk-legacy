import { requireAuth } from '@/lib/auth/helpers'
import { MessagingIntegrationClient } from '../messaging-integration-client'
import { loadMessagingIntegrationData } from '../_load-data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '카카오 채널·템플릿 · 알림 서비스 연동',
  description: '카카오 알림톡 채널 연동과 템플릿을 관리합니다.',
}

export default async function MessagingKakaoPage() {
  await requireAuth()
  const data = await loadMessagingIntegrationData()

  return (
    <MessagingIntegrationClient
      config={data.config}
      kakaoChannelConfig={data.kakaoConfig}
      eventSubscriptions={data.eventSubscriptions}
      eventSubscriptionsLoadError={data.eventSubscriptionsLoadError}
      initialKakaoTemplateSummary={data.kakaoTemplateSummary}
      defaultSection="kakao"
    />
  )
}
