'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Book, Search, Trash2 } from 'lucide-react'
import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/ui/loading-state'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { SectionErrorBoundary } from '@/components/layout/page-error-boundary'
import { PAGE_ANIMATIONS } from '@/lib/animation-config'
import { usePagination } from '@/hooks/use-pagination'
import { useToast } from '@/hooks/use-toast'
import { bulkDeleteTextbooks } from '@/app/actions/textbooks'

type Textbook = {
  id: string
  title: string
  author: string | null
  publisher: string | null
  isbn: string | null
  barcode: string | null
  price: number | null
  is_active: boolean
  textbook_units?: any[]
}

interface TextbooksClientProps {
  textbooks: Textbook[]
}

export function TextbooksClient({ textbooks: initialTextbooks }: TextbooksClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [textbooks, setTextbooks] = useState(initialTextbooks)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pageSize, setPageSize] = useState(15)

  // Filter textbooks based on search query
  const filteredTextbooks = useMemo(() => {
    if (!searchQuery) return textbooks
    const query = searchQuery.toLowerCase()
    return textbooks.filter((textbook) =>
      textbook.title.toLowerCase().includes(query) ||
      (textbook.author?.toLowerCase() || '').includes(query) ||
      (textbook.publisher?.toLowerCase() || '').includes(query) ||
      (textbook.barcode?.toLowerCase() || '').includes(query) ||
      (textbook.isbn?.toLowerCase() || '').includes(query)
    )
  }, [textbooks, searchQuery])

  const { paginatedData, currentPage, totalPages, goToPage } = usePagination({
    data: filteredTextbooks,
    itemsPerPage: pageSize,
  })

  // Selection handlers
  const isAllSelected = paginatedData.length > 0 && paginatedData.every(t => selectedIds.has(t.id))
  const isSomeSelected = paginatedData.some(t => selectedIds.has(t.id))

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (isAllSelected) {
        paginatedData.forEach(t => next.delete(t.id))
      } else {
        paginatedData.forEach(t => next.add(t.id))
      }
      return next
    })
  }, [isAllSelected, paginatedData])

  const handleSelectOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setIsDeleting(true)
    try {
      const result = await bulkDeleteTextbooks(ids)
      if (!result.success) {
        throw new Error(result.error || '일괄 삭제 실패')
      }

      setTextbooks(prev => prev.filter(t => !selectedIds.has(t.id)))
      setSelectedIds(new Set())
      toast({
        title: '일괄 삭제 완료',
        description: `${result.data?.deletedCount ?? ids.length}개의 교재가 삭제되었습니다.`,
      })
      router.refresh()
    } catch (error) {
      console.error('[bulkDelete] Error:', error)
      toast({
        title: '일괄 삭제 실패',
        description: '교재 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }, [selectedIds, router, toast])

  if (textbooks.length === 0) {
    return (
      <section aria-label="교재 목록" {...PAGE_ANIMATIONS.getSection(0)}>
        <EmptyState
          icon={<Book className="h-12 w-12" />}
          title="등록된 교재가 없습니다"
          description="새 교재를 등록하여 진도 관리를 시작하세요"
          action={
            <Button asChild>
              <Link href="/textbooks/new">
                <Plus className="mr-2 h-4 w-4" />
                교재 등록
              </Link>
            </Button>
          }
        />
      </section>
    )
  }

  return (
    <>
      {/* Search Bar */}
      <section aria-label="검색" className={PAGE_ANIMATIONS.firstSection}>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="교재명, 저자, 출판사, 바코드 검색..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <section aria-label="일괄 작업" className="flex items-center gap-3 px-1">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size}개 선택됨
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            일괄 삭제
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            선택 해제
          </Button>
        </section>
      )}

      {/* Textbook List */}
      <section aria-label="교재 목록" {...PAGE_ANIMATIONS.getSection(1)}>
        <SectionErrorBoundary sectionName="교재 목록">
          {filteredTextbooks.length === 0 ? (
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title="검색 결과가 없습니다"
              description={`"${searchQuery}"에 해당하는 교재를 찾을 수 없습니다`}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 pl-4">
                        <Checkbox
                          checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                          onCheckedChange={handleSelectAll}
                          aria-label="전체 선택"
                        />
                      </TableHead>
                      <TableHead>교재명</TableHead>
                      <TableHead>저자</TableHead>
                      <TableHead>출판사</TableHead>
                      <TableHead>바코드</TableHead>
                      <TableHead>가격</TableHead>
                      <TableHead>단원 수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((textbook) => (
                      <TableRow
                        key={textbook.id}
                        className="cursor-pointer"
                        data-state={selectedIds.has(textbook.id) ? 'selected' : undefined}
                      >
                        <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(textbook.id)}
                            onCheckedChange={() => handleSelectOne(textbook.id)}
                            aria-label={`${textbook.title} 선택`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/textbooks/${textbook.id}`}
                            className="hover:underline"
                          >
                            {textbook.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{textbook.author || '-'}</TableCell>
                        <TableCell className="text-sm">{textbook.publisher || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {textbook.barcode || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {textbook.price
                            ? `${textbook.price.toLocaleString()}원`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {textbook.textbook_units?.length || 0}개
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <div className="text-sm text-muted-foreground">
                    전체 {filteredTextbooks.length}개
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">페이지당 행 수</span>
                      <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                        <SelectTrigger className="h-8 w-[70px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      페이지 {currentPage} / {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="hidden lg:flex h-8 w-8"
                        onClick={() => goToPage(1)}
                        disabled={currentPage === 1}
                      >
                        <IconChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <IconChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <IconChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="hidden lg:flex h-8 w-8"
                        onClick={() => goToPage(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <IconChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </SectionErrorBoundary>
      </section>

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={`${selectedIds.size}개의 교재를 삭제하시겠습니까?`}
        description="삭제된 교재는 복구할 수 없습니다. 배부 기록이 있는 교재도 함께 삭제됩니다."
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleBulkDelete}
      />
    </>
  )
}
