import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getDraftCached } from './_get-draft'
import { WizardLayout } from '@/components/features/batch/wizard/WizardLayout'

export const metadata: Metadata = {
  title: '리포트 일괄 작업',
  description: '리포트 생성·코멘트·전송을 한 번에 진행합니다.',
}

export default async function ReportsBulkDraftLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ draftId: string }>
}) {
  const { draftId } = await params
  const result = await getDraftCached(draftId)

  if (!result.success || !result.data) {
    redirect('/reports')
  }

  const draft = result.data

  if (draft.status === 'archived') {
    redirect('/reports')
  }

  return (
    <WizardLayout draft={draft}>
      {children}
    </WizardLayout>
  )
}
