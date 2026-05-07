'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Book, Search, Trash2, Loader2, X } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import { getTextbooks, bulkDeleteTextbooks } from '@/app/actions/textbooks'
import { useTextbooksQuery } from '@/hooks/queries/use-textbooks-query'
import { queryKeys } from '@/lib/query-keys'

const DEFAULT_PAGE_SIZE = 15
const SEARCH_DEBOUNCE_MS = 180

export function TextbooksClient() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 검색어 디바운스
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setCurrentPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeout)
  }, [searchInput])

  const { data, isFetching } = useTextbooksQuery({
    search: debouncedSearch || undefined,
    page: currentPage,
    pageSize,
  })

  // 다음 페이지 백그라운드 프리페치
  useEffect(() => {
    const total = data?.totalCount ?? 0
    const pages = Math.max(1, Math.ceil(total / pageSize))
    const canPrefetchNext = data?.totalCountExact === false
      ? data?.hasNextPage
      : currentPage < pages
    if (!canPrefetchNext) return

    const nextFilters = { search: debouncedSearch || undefined, page: currentPage + 1, pageSize }
    queryClient.prefetchQuery({
      queryKey: queryKeys.textbooks.list(nextFilters as unknown as Record<string, unknown>),
      queryFn: async () => {
        const result = await getTextbooks(nextFilters)
        if (!result.success) throw new Error('교재 목록을 불러올 수 없습니다')
        return {
          data: result.data ?? [],
          lendingCountByTextbookId: result.lendingCountByTextbookId ?? {},
          unitCountByTextbookId: result.unitCountByTextbookId ?? {},
          totalCount: result.totalCount ?? 0,
          totalCountExact: result.totalCountExact ?? true,
          hasNextPage: result.hasNextPage ?? false,
          page: result.page ?? nextFilters.page,
          pageSize: result.pageSize ?? nextFilters.pageSize,
        }
      },
      staleTime: 60_000,
    })
  }, [currentPage, data?.hasNextPage, data?.totalCount, data?.totalCountExact, pageSize, debouncedSearch, queryClient])

  const textbooks = useMemo(() => data?.data ?? [], [data?.data])
  const lendingCountByTextbookId = data?.lendingCountByTextbookId ?? {}
  const unitCountByTextbookId = data?.unitCountByTextbookId ?? {}
  const totalCount = data?.totalCount ?? 0
  const totalCountExact = data?.totalCountExact ?? true
  const hasNextPage = data?.hasNextPage ?? false
  const totalPages = totalCountExact
    ? Math.max(1, Math.ceil(totalCount / pageSize))
    : currentPage + (hasNextPage ? 1 : 0)
  const canGoNext = totalCountExact ? currentPage < totalPages : hasNextPage
  const isSearchPending = searchInput.trim() !== debouncedSearch
  const searchBusy = isSearchPending || (isFetching && Boolean(debouncedSearch))

  // 페이지 변경 시 선택 초기화
  useEffect(() => {
    setSelectedIds(new Set())
  }, [currentPage])

  const isAllSelected = textbooks.length > 0 && textbooks.every(t => selectedIds.has(t.id))
  const isSomeSelected = textbooks.some(t => selectedIds.has(t.id))

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (isAllSelected) {
        textbooks.forEach(t => next.delete(t.id))
      } else {
        textbooks.forEach(t => next.add(t.id))
      }
      return next
    })
  }, [isAllSelected, textbooks])

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
      if (!result.success) throw new Error(result.error || '일괄 삭제 실패')

      setSelectedIds(new Set())
      toast({
        title: '일괄 삭제 완료',
        description: `${result.data?.deletedCount ?? ids.length}개의 교재가 삭제되었습니다.`,
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.textbooks.all() })
    } catch (error) {
      console.error('[bulkDelete] Error:', error)
      toast({ title: '일괄 삭제 실패', description: '교재 삭제 중 오류가 발생했습니다.', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }, [selectedIds, queryClient, toast])

  // 초기 로딩 (데이터 없고 로딩 중)
  if (!data && isFetching) {
    return (
      <section aria-label="교재 목록" {...PAGE_ANIMATIONS.getSection(0)}>
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          교재 목록을 불러오는 중...
        </div>
      </section>
    )
  }

  // 데이터 없고 검색어도 없으면 빈 상태
  if (textbooks.length === 0 && !debouncedSearch && !isFetching) {
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
              placeholder="교재명, 저자, 출판사, 관리번호, 바코드 검색..."
              className="pl-10 pr-16"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {searchBusy && (
              <Loader2
                className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground ${
                  searchInput ? 'right-9' : 'right-3'
                }`}
              />
            )}
            {searchInput && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setSearchInput('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <section aria-label="일괄 작업" className="flex items-center gap-3 px-1">
          <span className="text-sm text-muted-foreground">{selectedIds.size}개 선택됨</span>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-1" />
            일괄 삭제
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
            선택 해제
          </Button>
        </section>
      )}

      {/* Textbook List */}
      <section aria-label="교재 목록" {...PAGE_ANIMATIONS.getSection(1)}>
        <SectionErrorBoundary sectionName="교재 목록">
          {textbooks.length === 0 && !isFetching ? (
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title="검색 결과가 없습니다"
              description={`"${debouncedSearch}"에 해당하는 교재를 찾을 수 없습니다`}
            />
          ) : (
            <Card className={isFetching ? 'opacity-70' : ''}>
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
                      <TableHead>관리번호</TableHead>
                      <TableHead>바코드</TableHead>
                      <TableHead>보유/대출</TableHead>
                      <TableHead>가격</TableHead>
                      <TableHead>단원 수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {textbooks.map((textbook) => (
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
                          <Link href={`/textbooks/${textbook.id}`} className="hover:underline">
                            {textbook.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm">{textbook.author || '-'}</TableCell>
                        <TableCell className="text-sm">{textbook.publisher || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{textbook.management_code || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{textbook.barcode || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {(() => {
                            const total = textbook.total_copies || 1
                            const lending = lendingCountByTextbookId[textbook.id] || 0
                            const available = Math.max(total - lending, 0)
                            if (lending === 0) return `${total}권`
                            return (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="text-muted-foreground">{available}/{total}권</span>
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">대출 {lending}</span>
                              </span>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {textbook.price ? `${textbook.price.toLocaleString()}원` : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {unitCountByTextbookId[textbook.id] || 0}개
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <div className="text-sm text-muted-foreground">
                    전체 {totalCount}{!totalCountExact && hasNextPage ? '+' : ''}개
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">페이지당 행 수</span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(value) => {
                          setPageSize(Number(value))
                          setCurrentPage(1)
                        }}
                      >
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
                      {totalCountExact
                        ? `페이지 ${currentPage} / ${totalPages}`
                        : `페이지 ${currentPage}${hasNextPage ? ' / 다음 있음' : ''}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="hidden lg:flex h-8 w-8"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1 || isFetching}
                      >
                        <IconChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || isFetching}
                      >
                        <IconChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={!canGoNext || isFetching}
                      >
                        <IconChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="hidden lg:flex h-8 w-8"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={!totalCountExact || currentPage === totalPages || isFetching}
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
