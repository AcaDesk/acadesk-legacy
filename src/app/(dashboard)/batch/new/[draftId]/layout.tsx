import type { Metadata } from 'next'
import { getBatchDraft } from '@/app/actions/batch-drafts'
import { WizardLayout } from '@/components/features/batch/wizard/WizardLayout'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: '일괄작업 진행',
  description: '일괄작업 마법사를 통해 대량 작업을 진행합니다.',
}

export default async function BatchDraftLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  const result = await getBatchDraft(draftId)

  if (!result.success || !result.data) {
    redirect('/batch')
  }

  const draft = result.data

  if (draft.status === 'archived') {
    redirect('/batch')
  }

  return (
    <WizardLayout draft={draft}>
      {children}
    </WizardLayout>
  )
}
