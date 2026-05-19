import { getMessagingConfig } from '@/app/actions/messaging/config'
import {
  getKakaoChannelConfig,
  getKakaoChannelStats,
  type KakaoChannelStats,
} from '@/app/actions/messaging/kakao-channel'
import { getEventSubscriptions } from '@/app/actions/messaging/event-subscriptions'
import { getKakaoTemplates } from '@/app/actions/messaging/kakao-templates'

/**
 * messaging-integration 의 3개 서브라우트가 공유하는 데이터 로더.
 *
 * 2단계 fetch:
 *  1) messagingConfig + kakaoChannelConfig 만 병렬 fetch
 *  2) 카카오 채널이 연동된 학원만 events/templates 추가 fetch
 *     (미연동 학원에 대해 불필요한 DB 쿼리/네트워크 절감)
 */
export async function loadMessagingIntegrationData() {
  const [messagingResult, kakaoResult] = await Promise.all([
    getMessagingConfig(),
    getKakaoChannelConfig(),
  ])

  const config = messagingResult.success && messagingResult.data ? messagingResult.data : null
  const kakaoConfig = kakaoResult.success ? kakaoResult.data : null
  const hasKakaoChannel = !!kakaoConfig?.channelId

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
  const emptyStats: KakaoChannelStats = {
    totalCount: 0,
    sentCount: 0,
    failedCount: 0,
    pendingCount: 0,
    successRate: null,
  }
  let kakaoStats: KakaoChannelStats = emptyStats
  if (hasKakaoChannel) {
    const [eventResult, templatesResult, statsResult] = await Promise.all([
      getEventSubscriptions(),
      getKakaoTemplates(),
      getKakaoChannelStats(),
    ])
    eventSubsResult = eventResult
    kakaoTemplatesResult = templatesResult
    kakaoStats = statsResult.success ? statsResult.data : emptyStats
  }

  const eventSubscriptions = eventSubsResult.success ? eventSubsResult.data : []
  const eventSubscriptionsLoadError = eventSubsResult.success
    ? null
    : (eventSubsResult.error ?? null)
  const kakaoTemplates =
    kakaoTemplatesResult.success && kakaoTemplatesResult.data ? kakaoTemplatesResult.data : []

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

  return {
    config,
    kakaoConfig,
    eventSubscriptions,
    eventSubscriptionsLoadError,
    kakaoTemplates,
    kakaoTemplateSummary,
    kakaoStats,
  }
}
