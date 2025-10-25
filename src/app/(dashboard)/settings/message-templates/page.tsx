import { PageWrapper } from '@/components/layout/page-wrapper'
import { requireAuth } from '@/lib/auth/helpers'
import { MessageTemplatesClient } from './message-templates-client'
import { getMessageTemplates } from '@/app/actions/messages'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '메시지 템플릿 관리',
  description: '자주 사용하는 알림톡/SMS 템플릿을 관리합니다.',
}

export default async function MessageTemplatesPage() {
  // Verify authentication
  await requireAuth()

  // Fetch templates from database
  const result = await getMessageTemplates()
  const templates = result.success && result.data ? result.data : []

  return (
    <PageWrapper>
      <MessageTemplatesClient templates={templates} />
    </PageWrapper>
  )
}
