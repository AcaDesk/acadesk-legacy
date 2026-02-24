import { redirect } from 'next/navigation'
import { createBatchDraft } from '@/app/actions/batch/drafts'
import type { BatchActionType } from '@/core/types/batch.types'

function parseActionType(raw?: string): BatchActionType | undefined {
  if (raw === 'report' || raw === 'comment' || raw === 'send') {
    return raw
  }
  return undefined
}

function parseTargetIds(raw?: string): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
}

export default async function BatchNewPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; targetIds?: string }>
}) {
  const params = await searchParams
  const result = await createBatchDraft({
    actionType: parseActionType(params.action),
    targetIds: parseTargetIds(params.targetIds),
  })

  if (!result.success || !result.data) {
    redirect('/batch')
  }

  redirect(`/batch/new/${result.data}/targets`)
}
