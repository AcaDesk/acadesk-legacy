'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Plus } from 'lucide-react'
import { RecentJobsList } from './RecentJobsList'
import { SavedBatchTemplates } from './SavedBatchTemplates'

export function BatchHomeContent() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Button size="lg" onClick={() => router.push('/batch/new')}>
          <Plus className="h-5 w-5 mr-2" />
          새 일괄작업 시작
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentJobsList />
        <SavedBatchTemplates />
      </div>
    </div>
  )
}
