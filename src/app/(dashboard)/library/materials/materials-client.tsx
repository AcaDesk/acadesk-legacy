'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Search, Upload, Library } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { BookItem } from '@/app/actions/books'
import { bulkCreateBooks } from '@/app/actions/books'

interface MaterialsClientProps {
  initialBooks: BookItem[]
}

type ParsedBookInput = {
  title: string
  author?: string
  barcode?: string
}

function parseBulkInput(rawText: string): ParsedBookInput[] {
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
    firstCol.includes('도서') ||
    firstCol.includes('책')

  const dataRows = isHeaderRow ? rows.slice(1) : rows

  return dataRows
    .map((cols) => ({
      title: cols[0] || '',
      author: cols[1] || undefined,
      barcode: cols[2] || undefined,
    }))
    .filter((row) => row.title.length > 0)
}

export function MaterialsClient({ initialBooks }: MaterialsClientProps) {
  const [search, setSearch] = useState('')
  const [openBulkDialog, setOpenBulkDialog] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const books = initialBooks

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return books

    return books.filter((book) => {
      const title = book.title.toLowerCase()
      const author = (book.author || '').toLowerCase()
      const barcode = (book.barcode || '').toLowerCase()
      return title.includes(query) || author.includes(query) || barcode.includes(query)
    })
  }, [books, search])

  const parsedRows = useMemo(() => parseBulkInput(bulkText), [bulkText])

  async function handleBulkInsert() {
    if (parsedRows.length === 0) {
      toast({
        title: '입력 확인 필요',
        description: '등록할 도서 행이 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await bulkCreateBooks({ books: parsedRows })

      if (!result.success || !result.data) {
        throw new Error(result.error || '도서 일괄 삽입 실패')
      }

      const insertedCount = result.data.insertedCount
      const skippedCount = result.data.skippedCount

      toast({
        title: '도서 일괄 삽입 완료',
        description:
          skippedCount > 0
            ? `${insertedCount}권 등록, ${skippedCount}권 건너뜀`
            : `${insertedCount}권 등록 완료`,
      })

      setBulkText('')
      setOpenBulkDialog(false)
      router.refresh()
    } catch (error) {
      console.error('bulk insert books error:', error)
      toast({
        title: '도서 일괄 삽입 실패',
        description: '도서 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PageWrapper
      title="도서 목록"
      subtitle="보유 도서를 조회하고 목록을 일괄 삽입할 수 있습니다."
      actions={
        <Button onClick={() => setOpenBulkDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          도서 목록 일괄 삽입
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>도서 검색</CardTitle>
            <CardDescription>도서명, 저자, 바코드로 검색할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="도서명, 저자, 바코드 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>도서 목록</CardTitle>
            <CardDescription>총 {books.length}권 등록됨</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredBooks.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Library className="h-10 w-10 mx-auto mb-2 opacity-60" />
                표시할 도서가 없습니다.
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>도서명</TableHead>
                      <TableHead>저자</TableHead>
                      <TableHead>바코드</TableHead>
                      <TableHead className="text-right">등록일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBooks.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-medium">{book.title}</TableCell>
                        <TableCell>{book.author || '-'}</TableCell>
                        <TableCell>{book.barcode || '-'}</TableCell>
                        <TableCell className="text-right">
                          {new Date(book.created_at).toLocaleDateString('ko-KR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openBulkDialog} onOpenChange={setOpenBulkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>도서 목록 일괄 삽입</DialogTitle>
            <DialogDescription>
              한 줄에 한 권씩 입력하세요. 형식: 도서명,저자,바코드 (저자/바코드는 생략 가능)
            </DialogDescription>
          </DialogHeader>

          <Textarea
            rows={12}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'예시\n수학의 정석,홍성대,9781234567890\n수학의 바이블,이창희,9781234567891'}
          />

          <div className="text-sm text-muted-foreground">
            파싱된 행 수: {parsedRows.length}건
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenBulkDialog(false)}>
              취소
            </Button>
            <Button onClick={handleBulkInsert} disabled={isSubmitting}>
              {isSubmitting ? '등록 중...' : '일괄 삽입'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
