import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getTextbooks } from '@/app/actions/textbooks'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@ui/page-header'
import { PageErrorBoundary } from '@/components/layout/page-error-boundary'
import { PAGE_ANIMATIONS } from '@/lib/animation-config'
import { TextbooksClient } from './textbooks-client'
import { BulkInsertTextbooksButton } from './bulk-insert-button'
import { requireAuth } from '@/lib/auth/helpers'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '교재 관리',
  description: '교재를 등록하고 학생별 진도를 관리하세요',
}

export default async function TextbooksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // Verify authentication
  await requireAuth()
  const params = await searchParams
  const currentPage = Number(params.page) || 1
  const pageSize = Number(params.pageSize) || 15
  const searchQuery = typeof params.search === 'string' ? params.search : ''

  // Fetch textbooks server-side
  const [result, staffResult] = await Promise.all([
    getTextbooks({
      page: currentPage,
      pageSize,
      search: searchQuery || undefined,
    }),
    verifyStaff().catch(() => null),
  ])
  const textbooks = result.success && result.data ? result.data : []
  const totalCount = result.success ? (result.totalCount ?? textbooks.length) : 0

  // Fetch active lending counts per textbook
  const lendingCountByTextbookId: Record<string, number> = {}
  const unitCountByTextbookId: Record<string, number> = {}
  if (staffResult && textbooks.length > 0) {
    try {
      const supabase = createServiceRoleClient()
      const textbookIds = textbooks.map((textbook) => textbook.id as string)
      const [{ data: lendings }, { data: units }] = await Promise.all([
        supabase
          .from('book_lendings')
          .select('textbook_id')
          .eq('tenant_id', staffResult.tenantId)
          .in('textbook_id', textbookIds)
          .is('returned_at', null),
        supabase
          .from('textbook_units')
          .select('textbook_id')
          .eq('tenant_id', staffResult.tenantId)
          .in('textbook_id', textbookIds)
          .is('deleted_at', null),
      ])

      for (const row of lendings || []) {
        const id = row.textbook_id as string
        lendingCountByTextbookId[id] = (lendingCountByTextbookId[id] || 0) + 1
      }
      for (const row of units || []) {
        const id = row.textbook_id as string
        unitCountByTextbookId[id] = (unitCountByTextbookId[id] || 0) + 1
      }
    } catch {
      // 대출 상태 조회 실패 시 조용히 무시
    }
  }

  return (
    <PageErrorBoundary pageName="교재 관리">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <section aria-label="페이지 헤더" className={PAGE_ANIMATIONS.header}>
          <div className="flex items-center justify-between">
            <PageHeader
              title="교재 관리"
              description="교재를 등록하고 학생별 진도를 관리하세요"
            />
            <div className="flex gap-2">
              <BulkInsertTextbooksButton />
              <Button asChild>
                <Link href="/textbooks/new">
                  <Plus className="mr-2 h-4 w-4" />
                  교재 등록
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Client Component for interactive features */}
        <TextbooksClient
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          textbooks={textbooks as any}
          lendingCountByTextbookId={lendingCountByTextbookId}
          unitCountByTextbookId={unitCountByTextbookId}
          searchQuery={searchQuery}
          currentPage={currentPage}
          pageSize={pageSize}
          totalCount={totalCount}
        />
      </div>
    </PageErrorBoundary>
  )
}
