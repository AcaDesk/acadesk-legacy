'use client'

/**
 * Excel 템플릿 다운로드 버튼
 */

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { downloadStudentImportTemplate } from '@/lib/excel-template'

export function TemplateDownloadButton() {
  const handleDownload = () => {
    try {
      downloadStudentImportTemplate()
    } catch (error) {
      console.error('템플릿 다운로드 실패:', error)
      alert('템플릿 다운로드에 실패했습니다.')
    }
  }

  return (
    <Button onClick={handleDownload} variant="outline" className="gap-2">
      <Download className="h-4 w-4" />
      엑셀 템플릿 다운로드
    </Button>
  )
}
