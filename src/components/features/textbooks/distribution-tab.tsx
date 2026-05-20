import { Suspense } from 'react'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'
import { WidgetErrorBoundary } from '@/components/features/dashboard/widget-error-boundary'
import { getTextbookDistributions } from '@/app/actions/textbooks'
import { getStudentsMaster } from '@/app/actions/students/queries'
import { DistributionTableClient, type TextbookUsageRecord } from './distribution-table-client'

async function DistributionTabContent({ textbookId }: { textbookId: string }) {
  const [distResult, studentsResult] = await Promise.all([
    getTextbookDistributions(textbookId),
    getStudentsMaster(),
  ])

  if (!distResult.success) {
    throw new Error(distResult.error || '배부 현황을 불러올 수 없습니다')
  }

  return (
    <DistributionTableClient
      distributions={(distResult.data ?? []) as TextbookUsageRecord[]}
      textbookId={textbookId}
      students={studentsResult.data}
    />
  )
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
