'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, AlertTriangle, CheckCircle2, FileUp, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { bulkCreateTextbooks, validateBulkTextbooks } from '@/app/actions/textbooks'

type ParsedTextbookInput = {
  rowNumber: number
  title: string
  author?: string
  publisher?: string
  isbn?: string
  barcode?: string
}

type ReviewedRow = {
  row: ParsedTextbookInput
  errors: string[]
  warnings: string[]
}

type MergedReviewedRow = {
  row: ParsedTextbookInput
  mergedErrors: string[]
  mergedWarnings: string[]
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

function detectDelimiter(line: string): string {
  const commaCount = (line.match(/,/g) || []).length
  const tabCount = (line.match(/\t/g) || []).length
  return tabCount > commaCount ? '\t' : ','
}

function parseBulkInput(rawText: string): ParsedTextbookInput[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => Boolean(line))

  if (lines.length === 0) return []

  const rows = lines.map(({ line, lineNumber }) => {
    const delimiter = detectDelimiter(line)
    return {
      lineNumber,
      cols: splitCsvLine(line, delimiter),
    }
  })

  const firstRow = rows[0]?.cols || []
  const firstCol = (firstRow[0] || '').toLowerCase().replace(/["'\s]/g, '')
  const isHeaderRow =
    firstCol.includes('title') ||
    firstCol.includes('교재') ||
    firstCol.includes('도서') ||
    firstCol.includes('책')

  const dataRows = isHeaderRow ? rows.slice(1) : rows

  return dataRows
    .map(({ lineNumber, cols }) => ({
      rowNumber: lineNumber,
      title: (cols[0] || '').trim(),
      author: (cols[1] || '').trim() || undefined,
      publisher: (cols[2] || '').trim() || undefined,
      isbn: (cols[3] || '').trim() || undefined,
      barcode: (cols[4] || '').trim() || undefined,
    }))
    .filter(
      (row) =>
        row.title.length > 0 ||
        Boolean(row.author) ||
        Boolean(row.publisher) ||
        Boolean(row.isbn) ||
        Boolean(row.barcode)
    )
}

function validateRows(rows: ParsedTextbookInput[]): ReviewedRow[] {
  const barcodeMap = new Map<string, number[]>()

  for (const row of rows) {
    const key = (row.barcode || '').trim().toLowerCase()
    if (!key) continue
    const list = barcodeMap.get(key) || []
    list.push(row.rowNumber)
    barcodeMap.set(key, list)
  }

  return rows.map((row) => {
    const errors: string[] = []
    const warnings: string[] = []
    const title = row.title.trim()
    const author = (row.author || '').trim()
    const publisher = (row.publisher || '').trim()
    const isbn = (row.isbn || '').trim()
    const barcode = (row.barcode || '').trim()

    if (!title) errors.push('교재명은 필수입니다.')
    if (title.length > 200) errors.push('교재명은 200자 이하여야 합니다.')
    if (author.length > 100) errors.push('저자는 100자 이하여야 합니다.')
    if (publisher.length > 100) errors.push('출판사는 100자 이하여야 합니다.')
    if (isbn.length > 50) errors.push('ISBN은 50자 이하여야 합니다.')
    if (barcode.length > 100) errors.push('바코드는 100자 이하여야 합니다.')

    if (barcode && /\s/.test(barcode)) {
      errors.push('바코드에 공백이 포함되어 있습니다.')
    }

    if (barcode) {
      const duplicateRows = barcodeMap.get(barcode.toLowerCase()) || []
      if (duplicateRows.length > 1) {
        errors.push(`입력 내 중복 바코드입니다. (행: ${duplicateRows.join(', ')})`)
      }
    }

    if (isbn && !/^[0-9Xx-]+$/.test(isbn)) {
      warnings.push('ISBN 형식이 일반적이지 않습니다. (숫자/하이픈 권장)')
    }

    return {
      row: {
        rowNumber: row.rowNumber,
        title,
        author: author || undefined,
        publisher: publisher || undefined,
        isbn: isbn || undefined,
        barcode: barcode || undefined,
      },
      errors,
      warnings,
    }
  })
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function BulkInsertTextbooksButton() {
  const [openDialog, setOpenDialog] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [serverValidation, setServerValidation] = useState<{
    rows: Array<{
      rowNumber: number
      errors: string[]
      warnings: string[]
      canInsert: boolean
    }>
    blockedRows: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  const parsedRows = useMemo(() => parseBulkInput(bulkText), [bulkText])
  const reviewedRows = useMemo(() => validateRows(parsedRows), [parsedRows])
  const invalidRows = useMemo(
    () => reviewedRows.filter((row) => row.errors.length > 0),
    [reviewedRows]
  )
  const validRows = useMemo(
    () => reviewedRows.filter((row) => row.errors.length === 0),
    [reviewedRows]
  )
  const warningCount = useMemo(
    () => reviewedRows.reduce((sum, row) => sum + row.warnings.length, 0),
    [reviewedRows]
  )
  const serverRowsByNumber = useMemo(
    () =>
      new Map(
        (serverValidation?.rows || []).map((row) => [row.rowNumber, row] as const)
      ),
    [serverValidation]
  )
  const serverBlockedRows = serverValidation?.blockedRows || 0
  const hasValidated = serverValidation !== null
  const mergedRows = useMemo<MergedReviewedRow[]>(
    () =>
      reviewedRows.map(({ row, errors, warnings }) => {
        const serverRow = serverRowsByNumber.get(row.rowNumber)
        return {
          row,
          mergedErrors: [...errors, ...(serverRow?.errors || [])],
          mergedWarnings: [...warnings, ...(serverRow?.warnings || [])],
        }
      }),
    [reviewedRows, serverRowsByNumber]
  )
  const errorRowsForDownload = useMemo(
    () => mergedRows.filter((r) => r.mergedErrors.length > 0),
    [mergedRows]
  )

  async function handleSelectFile(file: File) {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let convertedText = ''

      if (!ext || ['csv', 'txt'].includes(ext)) {
        convertedText = await file.text()
      } else if (['xlsx', 'xls'].includes(ext)) {
        const XLSX = await import('xlsx')
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, {
          header: 1,
          defval: '',
        })
        convertedText = rows
          .map((cols) =>
            cols
              .map((cell) => String(cell ?? '').replace(/\t/g, ' ').trim())
              .join('\t')
          )
          .filter((line) => line.trim().length > 0)
          .join('\n')
      } else {
        toast({
          title: '지원하지 않는 파일 형식',
          description: 'CSV, TXT, XLSX, XLS 파일만 업로드할 수 있습니다.',
          variant: 'destructive',
        })
        return
      }

      setBulkText(convertedText)
      setIsConfirmed(false)
      setServerValidation(null)
      toast({
        title: '파일 불러오기 완료',
        description: '파일 내용을 입력 영역에 반영했습니다. 검증을 진행하세요.',
      })
    } catch (error) {
      console.error('file parse error:', error)
      toast({
        title: '파일 처리 실패',
        description: '파일을 읽는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function downloadErrorRows() {
    if (errorRowsForDownload.length === 0) {
      toast({
        title: '다운로드할 오류 행 없음',
        description: '오류가 있는 행이 없습니다.',
      })
      return
    }

    const header = ['행', '교재명', '저자', '출판사', 'ISBN', '바코드', '오류', '경고']
    const lines = [header.join(',')]

    for (const item of errorRowsForDownload) {
      const { row, mergedErrors, mergedWarnings } = item
      const cols = [
        String(row.rowNumber),
        row.title || '',
        row.author || '',
        row.publisher || '',
        row.isbn || '',
        row.barcode || '',
        mergedErrors.join(' / '),
        mergedWarnings.join(' / '),
      ].map(csvEscape)
      lines.push(cols.join(','))
    }

    const csvContent = `\uFEFF${lines.join('\n')}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `textbook-bulk-errors-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleValidate() {
    if (reviewedRows.length === 0) {
      toast({
        title: '입력 확인 필요',
        description: '검증할 교재 행이 없습니다.',
        variant: 'destructive',
      })
      return
    }

    if (invalidRows.length > 0) {
      toast({
        title: '입력 오류 수정 필요',
        description: `오류가 있는 행 ${invalidRows.length}건을 먼저 수정하세요.`,
        variant: 'destructive',
      })
      return
    }

    setIsValidating(true)
    try {
      const payload = validRows.map(({ row }) => ({
        rowNumber: row.rowNumber,
        title: row.title,
        author: row.author,
        publisher: row.publisher,
        isbn: row.isbn,
        barcode: row.barcode,
      }))

      const result = await validateBulkTextbooks({ textbooks: payload })
      if (!result.success || !result.data) {
        throw new Error(result.error || '사전 검증 실패')
      }

      setServerValidation(result.data)
      setIsConfirmed(false)

      if (result.data.blockedRows > 0) {
        toast({
          title: '사전 검증 완료',
          description: `등록 차단 행 ${result.data.blockedRows}건을 수정하세요.`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: '사전 검증 완료',
          description: '등록 가능한 상태입니다.',
        })
      }
    } catch (error) {
      console.error('validate textbooks error:', error)
      toast({
        title: '사전 검증 실패',
        description: '검증 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsValidating(false)
    }
  }

  async function handleBulkInsert() {
    if (reviewedRows.length === 0) {
      toast({
        title: '입력 확인 필요',
        description: '등록할 교재 행이 없습니다.',
        variant: 'destructive',
      })
      return
    }

    if (invalidRows.length > 0) {
      toast({
        title: '오류 행 수정 필요',
        description: `오류가 있는 행 ${invalidRows.length}건을 먼저 수정하세요.`,
        variant: 'destructive',
      })
      return
    }

    if (!hasValidated) {
      toast({
        title: '사전 검증 필요',
        description: '등록 전에 사전 검증을 먼저 실행하세요.',
        variant: 'destructive',
      })
      return
    }

    if (serverBlockedRows > 0) {
      toast({
        title: '등록 차단 행 존재',
        description: `사전 검증에서 차단된 행 ${serverBlockedRows}건을 수정하세요.`,
        variant: 'destructive',
      })
      return
    }

    if (!isConfirmed) {
      toast({
        title: '최종 확인 필요',
        description: '검토 완료 체크 후 등록할 수 있습니다.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = validRows.map(({ row }) => ({
        title: row.title,
        author: row.author,
        publisher: row.publisher,
        isbn: row.isbn,
        barcode: row.barcode,
      }))

      const result = await bulkCreateTextbooks({ textbooks: payload })

      if (!result.success || !result.data) {
        throw new Error(result.error || '교재 일괄 삽입 실패')
      }

      const { insertedCount, skippedCount, duplicateBarcodes } = result.data
      const duplicateText =
        duplicateBarcodes.length > 0
          ? ` | 중복 바코드: ${duplicateBarcodes.slice(0, 5).join(', ')}${duplicateBarcodes.length > 5 ? ' 외' : ''}`
          : ''

      toast({
        title: '교재 일괄 삽입 완료',
        description:
          skippedCount > 0
            ? `${insertedCount}권 등록, ${skippedCount}권 건너뜀${duplicateText}`
            : `${insertedCount}권 등록 완료`,
      })

      setBulkText('')
      setIsConfirmed(false)
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
              `교재명,저자,출판사,ISBN,바코드` 순서로 입력하세요. 탭/콤마 모두 지원하며 1행 헤더는 자동 무시됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleSelectFile(file)
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-4 w-4 mr-2" />
              파일 업로드
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={downloadErrorRows}
              disabled={errorRowsForDownload.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              오류 행 다운로드
            </Button>
          </div>

          <Textarea
            rows={12}
            value={bulkText}
            onChange={(e) => {
              setBulkText(e.target.value)
              setIsConfirmed(false)
              setServerValidation(null)
            }}
            placeholder={'예시\n수학의 정석,홍성대,성지출판,9781234567890,BC001\n수학의 바이블,이창희,이투스북'}
          />

          <div className="rounded-md border p-3 text-sm">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                파싱: {reviewedRows.length}건
              </div>
              <div className="flex items-center gap-1 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                등록 가능: {validRows.length}건
              </div>
              <div className="flex items-center gap-1 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                오류: {invalidRows.length}건
              </div>
              <div className="flex items-center gap-1 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                서버 차단: {serverBlockedRows}건
              </div>
              <div className="flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                경고: {warningCount}건
              </div>
            </div>
          </div>

          {reviewedRows.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>행</TableHead>
                    <TableHead>교재명</TableHead>
                    <TableHead>바코드</TableHead>
                    <TableHead>검증 결과</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mergedRows.map(({ row, mergedErrors, mergedWarnings }) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell className="font-medium">{row.title || '-'}</TableCell>
                      <TableCell>{row.barcode || '-'}</TableCell>
                      <TableCell>
                        {mergedErrors.length > 0 ? (
                          <div className="text-xs text-red-700">{mergedErrors.join(' / ')}</div>
                        ) : mergedWarnings.length > 0 ? (
                          <div className="text-xs text-amber-700">{mergedWarnings.join(' / ')}</div>
                        ) : (
                          <div className="text-xs text-green-700">정상</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
            />
            검증 결과를 확인했고, 정상 행만 등록하는 것에 동의합니다.
          </label>

          <DialogFooter>
            <Button variant="secondary" onClick={handleValidate} disabled={isValidating || reviewedRows.length === 0}>
              {isValidating ? '검증 중...' : '사전 검증'}
            </Button>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              취소
            </Button>
            <Button
              onClick={handleBulkInsert}
              disabled={
                isSubmitting ||
                reviewedRows.length === 0 ||
                invalidRows.length > 0 ||
                !hasValidated ||
                serverBlockedRows > 0
              }
            >
              {isSubmitting ? '등록 중...' : '일괄 삽입'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
