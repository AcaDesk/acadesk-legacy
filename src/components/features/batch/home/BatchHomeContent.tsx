'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { runDueScheduledBatchJobs } from '@/app/actions/batch/jobs'
import { RecentJobsList } from './RecentJobsList'
import { SavedBatchTemplates } from './SavedBatchTemplates'

export function BatchHomeContent() {
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    const runDue = async () => {
      const result = await runDueScheduledBatchJobs(1)
      if (cancelled || !result.success || !result.data) return
      if (result.data.triggered > 0) {
        toast({
          title: '예약 작업 실행 시작',
          description: `${result.data.triggered}건의 예약 작업을 실행했습니다.`,
        })
        router.refresh()
      }
    }
    void runDue()
    return () => {
      cancelled = true
    }
  }, [router, toast])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <RecentJobsList />
      <SavedBatchTemplates />
    </div>
  )
}
