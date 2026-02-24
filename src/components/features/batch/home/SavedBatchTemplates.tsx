'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBatchJobTemplates } from '@/app/actions/batch/jobs'
import { createBatchDraftFromTemplate } from '@/app/actions/batch/drafts'
import { JobTypeBadge } from '@/components/features/jobs/JobTypeBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { BookMarked, Loader2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { BatchJob } from '@/core/types/batch.types'

export function SavedBatchTemplates() {
  const router = useRouter()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<BatchJob[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const result = await getBatchJobTemplates()
      if (result.success && result.data) {
        setTemplates(result.data)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleTemplateClick(tpl: BatchJob) {
    if (creating) return
    setCreating(tpl.id)
    try {
      const result = await createBatchDraftFromTemplate(tpl.id)
      if (result.success && result.data) {
        router.push(`/batch/new/${result.data}/targets`)
      } else {
        toast({ title: '템플릿 적용 실패', description: result.error ?? '', variant: 'destructive' })
      }
    } catch {
      toast({ title: '오류가 발생했습니다.', variant: 'destructive' })
    } finally {
      setCreating(null)
    }
  }

  // 로딩 중에는 카드를 숨김
  if (loading) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookMarked className="h-4 w-4" />
          저장된 템플릿
        </CardTitle>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          /* 빈 상태 */
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <BookMarked className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">저장된 템플릿이 없습니다</p>
              <p className="text-xs text-muted-foreground">
                일괄작업 완료 후 템플릿으로 저장하면 다음에 빠르게 재사용할 수 있습니다
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/batch/new')}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              새 일괄작업 시작
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                onClick={() => handleTemplateClick(tpl)}
              >
                <div className="flex items-center gap-3">
                  {creating === tpl.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <JobTypeBadge type={tpl.action_type} />
                  )}
                  <span className="text-sm font-medium">{tpl.template_name ?? tpl.job_name ?? '템플릿'}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(tpl.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
