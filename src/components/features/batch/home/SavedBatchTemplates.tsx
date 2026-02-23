'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBatchJobTemplates } from '@/app/actions/batch-jobs'
import { createBatchDraft } from '@/app/actions/batch-drafts'
import { JobTypeBadge } from '@/components/features/jobs/JobTypeBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { BookMarked, Loader2 } from 'lucide-react'
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
      const result = await createBatchDraft({
        actionType: tpl.action_type,
      })
      if (result.success && result.data) {
        router.push(`/batch/new/${result.data}`)
      } else {
        toast({ title: '템플릿 적용 실패', description: result.error ?? '', variant: 'destructive' })
      }
    } catch {
      toast({ title: '오류가 발생했습니다.', variant: 'destructive' })
    } finally {
      setCreating(null)
    }
  }

  if (!loading && templates.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookMarked className="h-4 w-4" />
          저장된 템플릿
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">불러오는 중...</p>
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
