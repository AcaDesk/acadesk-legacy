'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Card, CardContent } from '@ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { deleteExam, bulkDeleteExams, archiveExam, unarchiveExam } from '@/app/actions/exams'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { EmptyState, NoSearchResultsEmptyState } from '@ui/empty-state'
import { PAGE_LAYOUT, TEXT_STYLES } from '@/lib/constants'
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
  status: string | null
  archived_at: string | null
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
  subjects?: {
    id: string
    name: string
    color: string | null
  } | {
    id: string
    name: string
    color: string | null
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

type ExamListPeriod = 'this_month' | 'last_15_days' | 'last_3_months' | 'all'
type VisibilityFilter = 'active' | 'archived' | 'all'

function getPeriodStartDate(period: ExamListPeriod): Date | null {
  const today = new Date()
  if (period === 'all') return null
  if (period === 'this_month') {
    return new Date(today.getFullYear(), today.getMonth(), 1)
  }
  if (period === 'last_15_days') {
    const d = new Date(today)
    d.setDate(d.getDate() - 15)
    return d
  }
  const d = new Date(today)
  d.setMonth(d.getMonth() - 3)
  return d
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
  const [exams, setExams] = useState(initialExams)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<ExamListPeriod>('this_month')
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('active')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [examToDelete, setExamToDelete] = useState<{ id: string; name: string } | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pageSize, setPageSize] = useState(10)

  // Sync with server data on revalidation
  useEffect(() => {
    setExams(initialExams)
  }, [initialExams])

  const availableSubjects = useMemo(() => {
    const map = new Map<string, string>()
    exams.forEach((exam) => {
      const subject = Array.isArray(exam.subjects) ? exam.subjects[0] : exam.subjects
      if (subject?.id && subject?.name) {
        map.set(subject.id, subject.name)
      }
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exams])

  const filteredExams = useMemo(() => {
    let filtered = exams

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

    if (selectedSubject !== 'all') {
      filtered = filtered.filter((exam) => {
        const subject = Array.isArray(exam.subjects) ? exam.subjects[0] : exam.subjects
        return subject?.id === selectedSubject
      })
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter((exam) => exam.exam_type === selectedType)
    }

    if (visibilityFilter === 'active') {
      filtered = filtered.filter((exam) => !exam.archived_at)
    } else if (visibilityFilter === 'archived') {
      filtered = filtered.filter((exam) => !!exam.archived_at)
    }

    const startDate = getPeriodStartDate(selectedPeriod)
    if (startDate) {
      filtered = filtered.filter((exam) => {
        if (!exam.exam_date) return false
        return new Date(exam.exam_date) >= startDate
      })
    }

    return filtered
  }, [exams, searchTerm, selectedCategory, selectedSubject, selectedType, selectedPeriod, visibilityFilter])

  const {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    resetPage,
  } = usePagination({
    data: filteredExams,
    itemsPerPage: pageSize,
  })

  // Reset page when filters change
  useEffect(() => {
    resetPage()
  }, [searchTerm, selectedCategory, selectedSubject, selectedType, selectedPeriod, visibilityFilter, resetPage])

  const activeFilterCount =
    (selectedCategory !== 'all' ? 1 : 0) +
    (selectedSubject !== 'all' ? 1 : 0) +
    (selectedType !== 'all' ? 1 : 0) +
    (selectedPeriod !== 'this_month' ? 1 : 0) +
    (visibilityFilter !== 'active' ? 1 : 0)

  const thisMonthExamCount = useMemo(() => {
    const now = new Date()
    return exams.filter((e) => {
      if (!e.exam_date) return false
      const examDate = new Date(e.exam_date)
      return examDate.getMonth() === now.getMonth() && examDate.getFullYear() === now.getFullYear()
    }).length
  }, [exams])

  const totalParticipants = useMemo(() => {
    return exams.reduce((sum, exam) => sum + (exam._count?.exam_scores || 0), 0)
  }, [exams])

  const archivedCount = useMemo(() => exams.filter((exam) => !!exam.archived_at).length, [exams])

  // Selection handlers
  const isAllSelected = paginatedData.length > 0 && paginatedData.every(e => selectedIds.has(e.id))
  const isSomeSelected = paginatedData.some(e => selectedIds.has(e.id))

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (isAllSelected) {
        paginatedData.forEach(e => next.delete(e.id))
      } else {
        paginatedData.forEach(e => next.add(e.id))
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

  function handleDeleteClick(id: string, name: string) {
    setExamToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!examToDelete) return

    setIsDeleting(true)
    const previousExams = exams
    setExams(prev => prev.filter(e => e.id !== examToDelete.id))
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(examToDelete.id)
      return next
    })

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
      setExams(previousExams)
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

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setIsDeleting(true)
    const previousExams = exams
    setExams(prev => prev.filter(e => !selectedIds.has(e.id)))

    try {
      const result = await bulkDeleteExams(ids)
      if (!result.success) {
        throw new Error(result.error || '일괄 삭제 실패')
      }

      setSelectedIds(new Set())
      toast({
        title: '일괄 삭제 완료',
        description: `${result.data?.deletedCount ?? ids.length}개의 시험이 삭제되었습니다.`,
      })
      router.refresh()
    } catch (error) {
      console.error('[bulkDelete] Error:', error)
      setExams(previousExams)
      toast({
        title: '일괄 삭제 실패',
        description: '시험 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setBulkDeleteDialogOpen(false)
    }
  }, [selectedIds, exams, router, toast])

  async function handleArchiveToggle(exam: Exam) {
    const previousExams = exams
    const isArchived = !!exam.archived_at

    setExams((prev) =>
      prev.map((e) =>
        e.id === exam.id
          ? { ...e, archived_at: isArchived ? null : new Date().toISOString() }
          : e
      )
    )

    try {
      const result = isArchived ? await unarchiveExam(exam.id) : await archiveExam(exam.id)
      if (!result.success) {
        throw new Error(result.error || '상태 변경 실패')
      }
      toast({
        title: isArchived ? '시험 복구 완료' : '시험 아카이브 완료',
        description: isArchived
          ? `"${exam.name}" 시험이 다시 기본 목록에 표시됩니다.`
          : `"${exam.name}" 시험이 기본 목록에서 숨김 처리되었습니다.`,
      })
      router.refresh()
    } catch (error) {
      setExams(previousExams)
      toast({
        title: '처리 오류',
        description: error instanceof Error ? error.message : '상태 변경 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
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
          <Button asChild className="gap-2">
            <Link href="/grades/exams/new">
              <Plus className="h-4 w-4" />
              시험 등록
            </Link>
          </Button>
        </div>
      </section>

      {/* Stats Cards */}
      <section
        className={cn("grid gap-4 md:grid-cols-4", PAGE_ANIMATIONS.getSection(0).className)}
        style={PAGE_ANIMATIONS.getSection(0).style}
      >
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              총 시험 수
            </div>
            <div className="text-2xl font-bold mt-2">{exams.length}개</div>
            <p className="text-xs text-muted-foreground mt-1">등록된 전체 시험</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              이번 달 시험
            </div>
            <div className="text-2xl font-bold text-info mt-2">{thisMonthExamCount}개</div>
            <p className="text-xs text-muted-foreground mt-1">이번 달 예정된 시험</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Users className="h-4 w-4" />
              총 응시 인원
            </div>
            <div className="text-2xl font-bold text-green-600 mt-2">{totalParticipants}명</div>
            <p className="text-xs text-muted-foreground mt-1">전체 시험 응시자 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              아카이브 시험
            </div>
            <div className="text-2xl font-bold mt-2">{archivedCount}개</div>
            <p className="text-xs text-muted-foreground mt-1">기본 목록에서 숨김된 시험</p>
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

          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="과목" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 과목</SelectItem>
              {availableSubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as ExamListPeriod)}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="기간" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">이번 달</SelectItem>
              <SelectItem value="last_15_days">최근 15일</SelectItem>
              <SelectItem value="last_3_months">최근 3개월</SelectItem>
              <SelectItem value="all">전체 기간</SelectItem>
            </SelectContent>
          </Select>

          <Select value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as VisibilityFilter)}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="표시 범위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">기본 목록</SelectItem>
              <SelectItem value="archived">아카이브만</SelectItem>
              <SelectItem value="all">전체 보기</SelectItem>
            </SelectContent>
          </Select>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedType('all')
                setSelectedCategory('all')
                setSelectedSubject('all')
                setSelectedPeriod('this_month')
                setVisibilityFilter('active')
              }}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              초기화
            </Button>
          )}
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
            onClick={() => setBulkDeleteDialogOpen(true)}
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
                <Button asChild>
                  <Link href="/grades/exams/new">
                    <Plus className="h-4 w-4 mr-2" />
                    시험 등록
                  </Link>
                </Button>
              }
            />
          )
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
                    <TableHead>시험명</TableHead>
                    <TableHead>과목</TableHead>
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
                    <TableRow
                      key={exam.id}
                      data-state={selectedIds.has(exam.id) ? 'selected' : undefined}
                    >
                      <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(exam.id)}
                          onCheckedChange={() => handleSelectOne(exam.id)}
                          aria-label={`${exam.name} 선택`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/grades/exams/${exam.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {exam.name}
                        </Link>
                        {exam.archived_at && (
                          <Badge variant="secondary" className="ml-2">아카이브</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const subject = Array.isArray(exam.subjects)
                            ? exam.subjects[0]
                            : exam.subjects
                          if (!subject) {
                            return <span className="text-xs text-muted-foreground">-</span>
                          }
                          return (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: subject.color || '#9ca3af' }}
                              />
                              <span className="text-sm">{subject.name}</span>
                            </div>
                          )
                        })()}
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
                            <DropdownMenuItem onClick={() => handleArchiveToggle(exam)}>
                              <ClipboardList className="h-4 w-4 mr-2" />
                              {exam.archived_at ? '시험 복구' : '시험 아카이브'}
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

              {/* Pagination */}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  전체 {filteredExams.length}개
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">페이지당 행 수</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v))
                        resetPage()
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
      </section>

      {/* Single Delete Confirmation Dialog */}
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

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title={`${selectedIds.size}개의 시험을 삭제하시겠습니까?`}
        description="삭제된 시험과 연결된 모든 성적 데이터가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}
