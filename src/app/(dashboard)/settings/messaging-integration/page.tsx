import { requireAuth } from '@/lib/auth/helpers'
import { MessagingIntegrationClient } from './messaging-integration-client'
import { getMessagingConfig } from '@/app/actions/messaging/config'
import { getKakaoChannelConfig } from '@/app/actions/messaging/kakao-channel'
import { getEventSubscriptions } from '@/app/actions/messaging/event-subscriptions'
import { getKakaoTemplates } from '@/app/actions/messaging/kakao-templates'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '알림 서비스 연동',
  description: 'SMS/알림톡 발송을 위한 API 키를 관리합니다.',
}

export default async function MessagingIntegrationPage() {
  await requireAuth()

  const [messagingResult, kakaoResult, eventSubsResult, kakaoTemplatesResult] = await Promise.all([
    getMessagingConfig(),
    getKakaoChannelConfig(),
    getEventSubscriptions(),
    getKakaoTemplates(),
  ])

  const config = messagingResult.success && messagingResult.data ? messagingResult.data : null
  const kakaoConfig = kakaoResult.success ? kakaoResult.data : null
  const eventSubscriptions = eventSubsResult.success ? eventSubsResult.data : []
  const kakaoTemplates = kakaoTemplatesResult.success && kakaoTemplatesResult.data
    ? kakaoTemplatesResult.data
    : []
  const kakaoTemplateSummary = {
    total: kakaoTemplates.length,
    approved: kakaoTemplates.filter((template) => template.status === 'approved').length,
    inspecting: kakaoTemplates.filter((template) => template.status === 'inspecting').length,
    rejected: kakaoTemplates.filter((template) => template.status === 'rejected').length,
    pending: kakaoTemplates.filter((template) => template.status === 'pending').length,
  }

  return (
    <MessagingIntegrationClient
      config={config}
      kakaoChannelConfig={kakaoConfig}
      eventSubscriptions={eventSubscriptions}
      initialKakaoTemplateSummary={kakaoTemplateSummary}
    />
  )
}
