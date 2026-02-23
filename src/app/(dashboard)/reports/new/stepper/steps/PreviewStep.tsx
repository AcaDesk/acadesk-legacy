'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Alert, AlertDescription } from '@ui/alert'
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
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
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>미리보기</CardTitle>
              <CardDescription>보호자가 받게 될 리포트입니다</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertDescription>
              아래 내용은 보호자에게 전달될 최종 리포트입니다. 수정이 필요하면 &quot;이전&quot; 버튼으로 돌아가세요.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Report Viewer */}
      <ReportViewer reportData={previewData} showEditButton={false} />

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          코멘트 수정
        </Button>
        <Button onClick={onConfirm} className="gap-1">
          다음
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
