'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import { Plus, Edit, Trash2, Search, PenSquare, UserPlus, ClipboardList, X, MoreVertical, CalendarDays, Users } from 'lucide-react'
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react'
import { useToast } from '@/hooks/use-toast'
import { usePagination } from '@/hooks/use-pagination'
import { deleteExam } from '@/app/actions/exams'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { EmptyState, NoSearchResultsEmptyState } from '@ui/empty-state'
import { PAGE_LAYOUT, GRID_LAYOUTS, TEXT_STYLES } from '@/lib/constants'
import { PAGE_ANIMATIONS } from '@/lib/animation-config'
import { cn } from '@/lib/utils'

interface Exam {
  id: string
  name: string
  category_code: string | null
  exam_type: string | null
  exam_date: string | null
  total_questions: number | null
  description: string | null
  created_at: string
  _count?: {
    exam_scores: number
  }
  classes?: {
    id: string
    name: string
  } | {
    id: string
    name: string
  }[] | null
}

interface ExamCategory {
  code: string
  label: string
}

interface ExamsClientProps {
  initialExams: Exam[]
  categories: ExamCategory[]
}

const EXAM_TYPE_MAP: Record<string, string> = {
  vocabulary: '단어시험',
  midterm: '중간고사',
  final: '기말고사',
  quiz: '퀴즈',
  mock: '모의고사',
  assignment: '과제',
}

function getExamTypeBadgeVariant(type: string | null): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (type) {
    case 'midterm':
    case 'final':
      return 'default'
    case 'mock':
      return 'destructive'
    case 'quiz':
    case 'vocabulary':
      return 'secondary'
    default:
      return 'outline'
  }
}

export function ExamsClient({ initialExams, categories }: ExamsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [examToDelete, setExamToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pageSize, setPageSize] = useState(10)

  const filteredExams = useMemo(() => {
    let filtered = initialExams

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter((exam) => {
        const name = exam.name?.toLowerCase() || ''
        return name.includes(search)
      })
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((exam) => exam.category_code === selectedCategory)
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter((exam) => exam.exam_type === selectedType)
    }

    return filtered
  }, [initialExams, searchTerm, selectedCategory, selectedType])

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    totalItems,
  } = usePagination({
    data: filteredExams,
    itemsPerPage: pageSize,
  })

  // Reset page when filters change
  useEffect(() => {
    resetPage()
  }, [searchTerm, selectedCategory, selectedType, resetPage])

  const activeFilterCount = (selectedCategory !== 'all' ? 1 : 0) + (selectedType !== 'all' ? 1 : 0)

  const thisMonthExamCount = useMemo(() => {
    const now = new Date()
    return initialExams.filter((e) => {
      if (!e.exam_date) return false
      const examDate = new Date(e.exam_date)
      return examDate.getMonth() === now.getMonth() && examDate.getFullYear() === now.getFullYear()
    }).length
  }, [initialExams])

  const totalParticipants = useMemo(() => {
    return initialExams.reduce((sum, exam) => sum + (exam._count?.exam_scores || 0), 0)
  }, [initialExams])

  function handleDeleteClick(id: string, name: string) {
    setExamToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!examToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteExam(examToDelete.id)

      if (!result.success) {
        throw new Error(result.error || '시험 삭제에 실패했습니다')
      }

      toast({
        title: '삭제 완료',
        description: `${examToDelete.name} 시험이 삭제되었습니다.`,
      })

      router.refresh()
    } catch (error) {
      console.error('Error deleting exam:', error)
      toast({
        title: '삭제 오류',
        description: error instanceof Error ? error.message : '시험을 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setExamToDelete(null)
    }
  }

  function getCategoryLabel(code: string | null) {
    if (!code) return '-'
    const category = categories.find((c) => c.code === code)
    return category?.label || code
  }

  function getExamTypeLabel(type: string | null) {
    if (!type) return '-'
    return EXAM_TYPE_MAP[type] || type
  }

  function formatExamDate(dateStr: string | null) {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className={PAGE_LAYOUT.SECTION_SPACING}>
      {/* Header */}
      <section className={PAGE_ANIMATIONS.header}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className={TEXT_STYLES.PAGE_TITLE}>시험 관리</h1>
            <p className={TEXT_STYLES.PAGE_DESCRIPTION}>시험을 등록하고 관리합니다</p>
          </div>
          <Link href="/grades/exams/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              시험 등록
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats Cards */}
      <section
        className={cn(GRID_LAYOUTS.STATS, PAGE_ANIMATIONS.getSection(0).className)}
        style={PAGE_ANIMATIONS.getSection(0).style}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              총 시험 수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{initialExams.length}개</div>
            <p className="text-xs text-muted-foreground mt-1">
              등록된 전체 시험
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              이번 달 시험
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{thisMonthExamCount}개</div>
            <p className="text-xs text-muted-foreground mt-1">
              이번 달 예정된 시험
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              총 응시 인원
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalParticipants}명</div>
            <p className="text-xs text-muted-foreground mt-1">
              전체 시험 응시자 수
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Search & Filters */}
      <section
        className={cn("space-y-3", PAGE_ANIMATIONS.getSection(1).className)}
        style={PAGE_ANIMATIONS.getSection(1).style}
      >
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="시험명으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-7">
              필터 {activeFilterCount}개
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">필터:</span>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="시험 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              <SelectItem value="vocabulary">단어시험</SelectItem>
              <SelectItem value="midterm">중간고사</SelectItem>
              <SelectItem value="final">기말고사</SelectItem>
              <SelectItem value="quiz">퀴즈</SelectItem>
              <SelectItem value="mock">모의고사</SelectItem>
              <SelectItem value="assignment">과제</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="시험 분류" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 분류</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.code} value={category.code}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedType('all')
                setSelectedCategory('all')
              }}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              초기화
            </Button>
          )}
        </div>
      </section>

      {/* Exams Table */}
      <section
        className={cn(PAGE_ANIMATIONS.getSection(2).className)}
        style={PAGE_ANIMATIONS.getSection(2).style}
      >
        {filteredExams.length === 0 ? (
          searchTerm || activeFilterCount > 0 ? (
            <NoSearchResultsEmptyState
              searchTerm={searchTerm || '필터 조건'}
              onClearSearch={() => {
                setSearchTerm('')
                setSelectedType('all')
                setSelectedCategory('all')
              }}
              icon={Search}
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="등록된 시험이 없습니다"
              description="새로운 시험을 등록하여 학생들의 성적을 관리하세요"
              action={
                <Link href="/grades/exams/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    시험 등록
                  </Button>
                </Link>
              }
            />
          )
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시험명</TableHead>
                    <TableHead>시험 유형</TableHead>
                    <TableHead>분류</TableHead>
                    <TableHead>시험일</TableHead>
                    <TableHead className="text-center">문항 수</TableHead>
                    <TableHead className="text-center">응시 인원</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/grades/exams/${exam.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {exam.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getExamTypeBadgeVariant(exam.exam_type)}>
                          {getExamTypeLabel(exam.exam_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(exam.category_code)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatExamDate(exam.exam_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        {exam.total_questions || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {exam._count?.exam_scores || 0}명
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">메뉴 열기</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/grades/exams/${exam.id}`)}>
                              <UserPlus className="h-4 w-4 mr-2" />
                              학생 배정
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/grades/exams/${exam.id}/bulk-entry`)}>
                              <PenSquare className="h-4 w-4 mr-2" />
                              성적 입력
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/grades/exams/${exam.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              시험 수정
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(exam.id, exam.name)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              시험 삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            전체 {totalItems}개
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <label htmlFor="rows-per-page" className="text-sm font-medium">
                페이지당 행 수
              </label>
              <Select
                value={`${pageSize}`}
                onValueChange={(value) => {
                  setPageSize(Number(value))
                  resetPage()
                }}
              >
                <SelectTrigger className="w-20" id="rows-per-page">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 15, 20, 30, 50].map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              페이지 {currentPage} / {totalPages}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => goToPage(1)}
                disabled={!hasPreviousPage}
              >
                <span className="sr-only">첫 페이지로</span>
                <IconChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={previousPage}
                disabled={!hasPreviousPage}
              >
                <span className="sr-only">이전 페이지</span>
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={nextPage}
                disabled={!hasNextPage}
              >
                <span className="sr-only">다음 페이지</span>
                <IconChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => goToPage(totalPages)}
                disabled={!hasNextPage}
              >
                <span className="sr-only">마지막 페이지로</span>
                <IconChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="시험을 삭제하시겠습니까?"
        description={examToDelete ? `"${examToDelete.name}" 시험과 연결된 모든 성적 데이터가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.` : ''}
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
