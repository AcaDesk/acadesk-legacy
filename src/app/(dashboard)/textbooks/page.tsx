import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getTextbooks } from '@/app/actions/textbooks'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@ui/page-header'
import { PageErrorBoundary } from '@/components/layout/page-error-boundary'
import { PAGE_ANIMATIONS } from '@/lib/animation-config'
import { TextbooksClient } from './textbooks-client'
import { requireAuth } from '@/lib/auth/helpers'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '교재 관리',
  description: '교재를 등록하고 학생별 진도를 관리하세요',
}

export default async function TextbooksPage() {
  // Verify authentication
  await requireAuth()

  // Fetch textbooks server-side
  const result = await getTextbooks({ includeUnits: true })
  const textbooks = result.success && result.data ? result.data : []

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
            <Button asChild>
              <Link href="/textbooks/new">
                <Plus className="mr-2 h-4 w-4" />
                교재 등록
              </Link>
            </Button>
          </div>
        </section>

        {/* Client Component for interactive features */}
        <TextbooksClient textbooks={textbooks as any} />
      </div>
    </PageErrorBoundary>
  )
}
