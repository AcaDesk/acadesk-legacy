import { PageWrapper } from '@/components/layout/page-wrapper'
import { requireAuth } from '@/lib/auth/helpers'
import { MessagingIntegrationClient } from './messaging-integration-client'
import { getMessagingConfig } from '@/app/actions/messaging-config'
import { getKakaoChannelConfig } from '@/app/actions/kakao-channel'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '알림 서비스 연동',
  description: 'SMS/알림톡 발송을 위한 API 키를 관리합니다.',
}

export default async function MessagingIntegrationPage() {
  await requireAuth()

  // Fetch current configuration
  const [messagingResult, kakaoResult] = await Promise.all([
    getMessagingConfig(),
    getKakaoChannelConfig(),
  ])

  const config = messagingResult.success && messagingResult.data ? messagingResult.data : null
  const kakaoConfig = kakaoResult.success ? kakaoResult.data : null

  return (
    <PageWrapper>
      <MessagingIntegrationClient config={config} kakaoChannelConfig={kakaoConfig} />
    </PageWrapper>
  )
}
