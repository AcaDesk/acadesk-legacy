import { Suspense } from 'react'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'
import { WidgetErrorBoundary } from '@/components/features/dashboard/widget-error-boundary'
import { getTextbookDistributions } from '@/app/actions/textbooks'
import { DistributionTableClient } from './distribution-table-client'

async function DistributionTabContent({ textbookId }: { textbookId: string }) {
  const result = await getTextbookDistributions(textbookId)

  if (!result.success) {
    throw new Error(result.error || '배부 현황을 불러올 수 없습니다')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <DistributionTableClient distributions={(result.data ?? []) as any[]} textbookId={textbookId} />
}

export function DistributionTab({ textbookId }: { textbookId: string }) {
  return (
    <WidgetErrorBoundary widgetId="distribution-tab" widgetTitle="배부 현황">
      <Suspense fallback={<WidgetSkeleton variant="table" />}>
        <DistributionTabContent textbookId={textbookId} />
      </Suspense>
    </WidgetErrorBoundary>
  )
}
