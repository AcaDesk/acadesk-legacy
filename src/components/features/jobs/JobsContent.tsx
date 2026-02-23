'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { getBatchJobs, runDueScheduledBatchJobs } from '@/app/actions/batch-jobs'
import { JobStatusBadge } from './JobStatusBadge'
import { JobTypeBadge } from './JobTypeBadge'
import { Progress } from '@ui/progress'
import { Button } from '@ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { ChevronLeft, ChevronRight, History } from 'lucide-react'
import { EmptyState } from '@ui/empty-state'
import type { BatchJob, BatchActionType, JobStatus } from '@/core/types/batch.types'

export function JobsContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [jobs, setJobs] = useState<BatchJob[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionType, setActionType] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [dueChecked, setDueChecked] = useState(false)

  const pageSize = 20

  useEffect(() => {
    async function load() {
      setLoading(true)
      if (!dueChecked) {
        await runDueScheduledBatchJobs(1)
        setDueChecked(true)
      }
      const result = await getBatchJobs({
        actionType: actionType === 'all' ? undefined : actionType as BatchActionType,
        status: status === 'all' ? undefined : status as JobStatus,
        page,
        pageSize,
      })
      if (result.success && result.data) {
        setJobs(result.data.jobs)
        setTotal(result.data.total)
      } else {
        toast({ title: '작업 이력 조회 실패', description: result.error ?? '', variant: 'destructive' })
      }
      setLoading(false)
    }
    load()
  }, [page, actionType, status, toast, dueChecked])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={actionType} onValueChange={(v) => { setActionType(v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="작업 종류" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="report">리포트</SelectItem>
            <SelectItem value="comment">코멘트</SelectItem>
            <SelectItem value="send">전송</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="queued">대기</SelectItem>
            <SelectItem value="running">실행 중</SelectItem>
            <SelectItem value="succeeded">성공</SelectItem>
            <SelectItem value="partial_failed">일부 실패</SelectItem>
            <SelectItem value="failed">실패</SelectItem>
            <SelectItem value="canceled">취소됨</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          불러오는 중...
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={History}
          title="작업 이력이 없습니다"
          description="일괄작업을 실행하면 이곳에 이력이 표시됩니다."
        />
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시작 시각</TableHead>
                  <TableHead>작업</TableHead>
                  <TableHead>대상</TableHead>
                  <TableHead>성공률</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const progress = job.progress
                  const percent = progress.total > 0
                    ? Math.round((progress.success / progress.total) * 100)
                    : 0
                  return (
                    <TableRow
                      key={job.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/jobs/${job.id}`)}
                    >
                      <TableCell className="text-sm">
                        {job.started_at
                          ? new Date(job.started_at).toLocaleString('ko-KR')
                          : new Date(job.created_at).toLocaleString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <JobTypeBadge type={job.action_type} />
                      </TableCell>
                      <TableCell>{progress.total}명</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={percent} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-10 text-right">{percent}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <JobStatusBadge status={job.status} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">{page} / {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
