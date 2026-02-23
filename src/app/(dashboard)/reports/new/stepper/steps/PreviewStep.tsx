'use client'

import { Card, CardContent } from '@ui/card'
import { Button } from '@ui/button'
import { ChevronLeft, ChevronRight, Eye, Pencil } from 'lucide-react'
import { ReportViewer } from '@/components/features/reports/ReportViewer'
import type { ReportData } from '@/core/types/report.types'

interface PreviewStepProps {
  previewData: ReportData | null
  onConfirm: () => void
  onBack: () => void
}

export function PreviewStep({ previewData, onConfirm, onBack }: PreviewStepProps) {
  if (!previewData) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          미리볼 데이터가 없습니다. 이전 단계를 완료해주세요.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 안내 배너 (간결하게) */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-muted/60 border text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Eye className="h-4 w-4 shrink-0" />
          <span>보호자에게 전달될 최종 리포트입니다</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 shrink-0 h-7">
          <Pencil className="h-3.5 w-3.5" />
          코멘트 수정
        </Button>
      </div>

      {/* 리포트 뷰어 */}
      <ReportViewer reportData={previewData} showEditButton={false} />

      {/* 하단 고정 내비게이션 */}
      <div className="sticky bottom-4 z-10">
        <div className="flex items-center justify-between bg-background/95 backdrop-blur-sm border rounded-xl px-4 py-3 shadow-lg">
          <Button variant="outline" onClick={onBack} className="gap-1">
            <ChevronLeft className="h-4 w-4" />
            코멘트 수정
          </Button>
          <Button onClick={onConfirm} className="gap-1">
            생성 및 전송 설정
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
