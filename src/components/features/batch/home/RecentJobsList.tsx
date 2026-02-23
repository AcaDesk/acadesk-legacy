'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getRecentBatchJobs } from '@/app/actions/batch-jobs'
import { JobStatusBadge } from '@/components/features/jobs/JobStatusBadge'
import { JobTypeBadge } from '@/components/features/jobs/JobTypeBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { ArrowRight } from 'lucide-react'
import type { BatchJob } from '@/core/types/batch.types'

export function RecentJobsList() {
  const router = useRouter()
  const [jobs, setJobs] = useState<BatchJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await getRecentBatchJobs(5)
      if (result.success && result.data) {
        setJobs(result.data)
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">최근 실행</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => router.push('/jobs')}>
          전체 보기
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">불러오는 중...</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">최근 실행 이력이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={() => router.push(`/jobs/${job.id}`)}
              >
                <div className="flex items-center gap-3">
                  <JobTypeBadge type={job.action_type} />
                  <div>
                    <p className="text-sm font-medium">{job.job_name ?? '일괄 작업'}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
                <JobStatusBadge status={job.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
