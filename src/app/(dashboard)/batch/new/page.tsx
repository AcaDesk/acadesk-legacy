import { redirect } from 'next/navigation'
import { createBatchDraft } from '@/app/actions/batch-drafts'

export default async function BatchNewPage() {
  const result = await createBatchDraft()

  if (!result.success || !result.data) {
    redirect('/batch')
  }

  redirect(`/batch/new/${result.data}/targets`)
}
