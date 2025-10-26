'use client'

/**
 * Excel 템플릿 다운로드 버튼
 */

import { Button } from '@ui/button'
import { Download } from 'lucide-react'
import { downloadStudentImportTemplate } from '@/lib/excel-template'
import { useToast } from '@/hooks/use-toast'

export function TemplateDownloadButton() {
  const { toast } = useToast()

  const handleDownload = () => {
    try {
      downloadStudentImportTemplate()
    } catch (error) {
      console.error('템플릿 다운로드 실패:', error)
      toast({
        title: '다운로드 실패',
        description: '템플릿 다운로드에 실패했습니다.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Button onClick={handleDownload} variant="outline" className="gap-2">
      <Download className="h-4 w-4" />
      엑셀 템플릿 다운로드
    </Button>
  )
}
