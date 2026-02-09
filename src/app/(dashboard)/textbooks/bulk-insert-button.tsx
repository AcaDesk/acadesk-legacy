'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { bulkCreateTextbooks } from '@/app/actions/textbooks'

type ParsedTextbookInput = {
  title: string
  author?: string
  publisher?: string
  isbn?: string
  barcode?: string
}

function parseBulkInput(rawText: string): ParsedTextbookInput[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const rows = lines.map((line) => {
    const delimiter = line.includes('\t') ? '\t' : ','
    return line.split(delimiter).map((cell) => cell.trim())
  })

  const firstRow = rows[0]
  const firstCol = (firstRow[0] || '').toLowerCase()
  const isHeaderRow =
    firstCol.includes('title') ||
    firstCol.includes('교재') ||
    firstCol.includes('도서') ||
    firstCol.includes('책')

  const dataRows = isHeaderRow ? rows.slice(1) : rows

  return dataRows
    .map((cols) => ({
      title: cols[0] || '',
      author: cols[1] || undefined,
      publisher: cols[2] || undefined,
      isbn: cols[3] || undefined,
      barcode: cols[4] || undefined,
    }))
    .filter((row) => row.title.length > 0)
}

export function BulkInsertTextbooksButton() {
  const [openDialog, setOpenDialog] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const parsedRows = useMemo(() => parseBulkInput(bulkText), [bulkText])

  async function handleBulkInsert() {
    if (parsedRows.length === 0) {
      toast({
        title: '입력 확인 필요',
        description: '등록할 교재 행이 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await bulkCreateTextbooks({ textbooks: parsedRows })

      if (!result.success || !result.data) {
        throw new Error(result.error || '교재 일괄 삽입 실패')
      }

      const { insertedCount, skippedCount } = result.data

      toast({
        title: '교재 일괄 삽입 완료',
        description:
          skippedCount > 0
            ? `${insertedCount}권 등록, ${skippedCount}권 건너뜀`
            : `${insertedCount}권 등록 완료`,
      })

      setBulkText('')
      setOpenDialog(false)
      router.refresh()
    } catch (error) {
      console.error('bulk insert textbooks error:', error)
      toast({
        title: '교재 일괄 삽입 실패',
        description: '교재 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpenDialog(true)}>
        <Upload className="h-4 w-4 mr-2" />
        일괄 삽입
      </Button>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>교재 일괄 삽입</DialogTitle>
            <DialogDescription>
              한 줄에 한 권씩 입력하세요. 형식: 교재명,저자,출판사,ISBN,바코드 (저자/출판사/ISBN/바코드는 생략 가능)
            </DialogDescription>
          </DialogHeader>

          <Textarea
            rows={12}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'예시\n수학의 정석,홍성대,성지출판,9781234567890,BC001\n수학의 바이블,이창희,이투스북'}
          />

          <div className="text-sm text-muted-foreground">
            파싱된 행 수: {parsedRows.length}건
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              취소
            </Button>
            <Button onClick={handleBulkInsert} disabled={isSubmitting}>
              {isSubmitting ? '등록 중...' : '일괄 삽입'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
