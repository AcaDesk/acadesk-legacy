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

  // 1단계: 채널 연동 여부 확인에 필요한 두 가지만 병렬 fetch.
  //   카카오 채널 미연동 학원은 events/templates 액션 자체를 건너뛰어
  //   불필요한 DB 쿼리/네트워크 비용 제거.
  const [messagingResult, kakaoResult] = await Promise.all([
    getMessagingConfig(),
    getKakaoChannelConfig(),
  ])

  const config = messagingResult.success && messagingResult.data ? messagingResult.data : null
  const kakaoConfig = kakaoResult.success ? kakaoResult.data : null
  const hasKakaoChannel = !!kakaoConfig?.channelId

  // 2단계: 카카오 채널 연동된 학원만 추가 fetch.
  let eventSubsResult: Awaited<ReturnType<typeof getEventSubscriptions>> = {
    success: true,
    data: [],
    error: null,
  }
  let kakaoTemplatesResult: Awaited<ReturnType<typeof getKakaoTemplates>> = {
    success: true,
    data: [],
    error: null,
  }
  if (hasKakaoChannel) {
    ;[eventSubsResult, kakaoTemplatesResult] = await Promise.all([
      getEventSubscriptions(),
      getKakaoTemplates(),
    ])
  }

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
