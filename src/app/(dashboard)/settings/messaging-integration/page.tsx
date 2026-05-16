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
  const eventSubscriptionsLoadError = eventSubsResult.success ? null : (eventSubsResult.error ?? null)
  const kakaoTemplates = kakaoTemplatesResult.success && kakaoTemplatesResult.data
    ? kakaoTemplatesResult.data
    : []
  // 5번의 filter loop → 단일 reduce 로 통합 (status 별 카운트).
  const kakaoTemplateSummary = kakaoTemplates.reduce(
    (acc, template) => {
      acc.total++
      if (template.status === 'approved') acc.approved++
      else if (template.status === 'inspecting') acc.inspecting++
      else if (template.status === 'rejected') acc.rejected++
      else if (template.status === 'pending') acc.pending++
      return acc
    },
    { total: 0, approved: 0, inspecting: 0, rejected: 0, pending: 0 },
  )

  return (
    <MessagingIntegrationClient
      config={config}
      kakaoChannelConfig={kakaoConfig}
      eventSubscriptions={eventSubscriptions}
      eventSubscriptionsLoadError={eventSubscriptionsLoadError}
      initialKakaoTemplateSummary={kakaoTemplateSummary}
    />
  )
}
