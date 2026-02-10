'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Search, Plus, BookOpen, Calendar, AlertCircle, CheckCircle, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import type { BookLending } from '@/app/actions/book-lendings'
import { returnBook, sendReminder, sendBulkReminder } from '@/app/actions/book-lendings'

interface BookLendingsClientProps {
  initialLendings: BookLending[]
}

type LendingStatusFilter = 'all' | 'active' | 'due_soon' | 'overdue' | 'returned'
type LendingSortOption = 'borrowed_desc' | 'due_asc' | 'due_desc' | 'student'
type DueRangeFilter = 'all' | 'today' | '7days' | 'custom'
type QuickPreset = 'overdue_unsent' | 'due_soon_unsent' | 'today_due'
const PAGE_SIZE = 15

function getTodayKST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

function getDateDiffInDays(from: string, to: string): number {
  const [fromY, fromM, fromD] = from.split('-').map(Number)
  const [toY, toM, toD] = to.split('-').map(Number)
  const fromUtc = Date.UTC(fromY, fromM - 1, fromD)
  const toUtc = Date.UTC(toY, toM - 1, toD)
  return Math.floor((toUtc - fromUtc) / (1000 * 60 * 60 * 24))
}

function formatYmdKST(dateString: string): string {
  const [y, m, d] = dateString.split('-').map(Number)
  const utcDate = new Date(Date.UTC(y, m - 1, d))
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utcDate)
}

function formatDateTimeKST(dateTime: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateTime))
}

export function BookLendingsClient({ initialLendings }: BookLendingsClientProps) {
  const [lendings, setLendings] = useState<BookLending[]>(initialLendings)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<LendingStatusFilter>('active')
  const [sortBy, setSortBy] = useState<LendingSortOption>('borrowed_desc')
  const [showUnsentOnly, setShowUnsentOnly] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all')
  const [selectedTextbookKey, setSelectedTextbookKey] = useState<string>('all')
  const [dueRange, setDueRange] = useState<DueRangeFilter>('all')
  const [customDueStart, setCustomDueStart] = useState('')
  const [customDueEnd, setCustomDueEnd] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [bulkReminderDialogOpen, setBulkReminderDialogOpen] = useState(false)
  const [isSendingBulkReminder, setIsSendingBulkReminder] = useState(false)
  const [isReturningId, setIsReturningId] = useState<string | null>(null)
  const [isSendingReminderId, setIsSendingReminderId] = useState<string | null>(null)
  const [returnTarget, setReturnTarget] = useState<BookLending | null>(null)
  const [reminderTarget, setReminderTarget] = useState<BookLending | null>(null)

  const { toast } = useToast()
  const router = useRouter()

  // Calculate stats
  const stats = useMemo(() => {
    const today = getTodayKST()
    return {
      total: lendings.length,
      active: lendings.filter((l) => !l.returned_at).length,
      dueSoon: lendings.filter((l) => {
        if (l.returned_at) return false
        const diff = getDateDiffInDays(today, l.due_date)
        return diff >= 0 && diff <= 3
      }).length,
      overdue: lendings.filter((l) => !l.returned_at && l.due_date < today).length,
      returned: lendings.filter((l) => l.returned_at).length,
      overdueUnsent: lendings.filter(
        (l) => !l.returned_at && l.due_date < today && !l.reminder_sent_at
      ).length,
    }
  }, [lendings])

  const studentOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const lending of lendings) {
      const id = lending.students?.id
      const name = lending.students?.users?.name
      if (id && name) map.set(id, name)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [lendings])

  const textbookOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const lending of lendings) {
      const key = lending.textbooks?.barcode || lending.textbooks?.title
      const title = lending.textbooks?.title
      if (key && title) map.set(key, title)
    }
    return Array.from(map.entries())
      .map(([key, title]) => ({ key, title }))
      .sort((a, b) => a.title.localeCompare(b.title, 'ko'))
  }, [lendings])

  // Filter lendings
  const filteredLendings = useMemo(() => {
    let filtered = [...lendings]
    const today = getTodayKST()

    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter((l) => !l.returned_at)
    } else if (filterStatus === 'due_soon') {
      filtered = filtered.filter((l) => {
        if (l.returned_at) return false
        const diff = getDateDiffInDays(today, l.due_date)
        return diff >= 0 && diff <= 3
      })
    } else if (filterStatus === 'overdue') {
      filtered = filtered.filter((l) => !l.returned_at && l.due_date < today)
    } else if (filterStatus === 'returned') {
      filtered = filtered.filter((l) => l.returned_at)
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((lending) => {
        const bookTitle = lending.textbooks?.title?.toLowerCase() || ''
        const author = lending.textbooks?.author?.toLowerCase() || ''
        const studentName = lending.students?.users?.name?.toLowerCase() || ''
        const studentCode = lending.students?.student_code?.toLowerCase() || ''
        const barcode = lending.textbooks?.barcode?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()

        return (
          bookTitle.includes(search) ||
          author.includes(search) ||
          studentName.includes(search) ||
          studentCode.includes(search) ||
          barcode.includes(search)
        )
      })
    }

    if (showUnsentOnly) {
      filtered = filtered.filter((l) => !l.returned_at && !l.reminder_sent_at)
    }

    if (selectedStudentId !== 'all') {
      filtered = filtered.filter((l) => l.students?.id === selectedStudentId)
    }

    if (selectedTextbookKey !== 'all') {
      filtered = filtered.filter((l) => {
        const key = l.textbooks?.barcode || l.textbooks?.title
        return key === selectedTextbookKey
      })
    }

    if (dueRange !== 'all') {
      filtered = filtered.filter((l) => {
        const diff = getDateDiffInDays(today, l.due_date)
        if (dueRange === 'today') return diff === 0
        if (dueRange === '7days') return diff >= 0 && diff <= 7
        if (dueRange === 'custom') {
          if (!customDueStart && !customDueEnd) return true
          if (customDueStart && l.due_date < customDueStart) return false
          if (customDueEnd && l.due_date > customDueEnd) return false
          return true
        }
        return true
      })
    }

    filtered.sort((a, b) => {
      if (sortBy === 'due_asc') return a.due_date.localeCompare(b.due_date)
      if (sortBy === 'due_desc') return b.due_date.localeCompare(a.due_date)
      if (sortBy === 'student') {
        const aName = a.students?.users?.name || ''
        const bName = b.students?.users?.name || ''
        return aName.localeCompare(bName, 'ko')
      }
      return b.borrowed_at.localeCompare(a.borrowed_at)
    })

    return filtered
  }, [
    lendings,
    searchTerm,
    filterStatus,
    sortBy,
    showUnsentOnly,
    selectedStudentId,
    selectedTextbookKey,
    dueRange,
    customDueStart,
    customDueEnd,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredLendings.length / PAGE_SIZE))
  const paginatedLendings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredLendings.slice(start, start + PAGE_SIZE)
  }, [filteredLendings, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchTerm,
    filterStatus,
    sortBy,
    showUnsentOnly,
    selectedStudentId,
    selectedTextbookKey,
    dueRange,
    customDueStart,
    customDueEnd,
  ])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  function resetAdvancedFilters() {
    setSelectedStudentId('all')
    setSelectedTextbookKey('all')
    setDueRange('all')
    setCustomDueStart('')
    setCustomDueEnd('')
  }

  function applyPreset(preset: QuickPreset) {
    resetAdvancedFilters()
    setSearchTerm('')
    setCurrentPage(1)
    setSortBy('due_asc')
    if (preset === 'overdue_unsent') {
      setFilterStatus('overdue')
      setShowUnsentOnly(true)
      return
    }
    if (preset === 'due_soon_unsent') {
      setFilterStatus('due_soon')
      setShowUnsentOnly(true)
      return
    }
    setFilterStatus('active')
    setShowUnsentOnly(false)
    setDueRange('today')
  }

  async function handleReturn(lendingId: string) {
    setIsReturningId(lendingId)
    try {
      const result = await returnBook(lendingId)

      if (!result.success) {
        throw new Error(result.error || '반납 처리 실패')
      }

      // Update local state
      setLendings((prev) =>
        prev.map((l) =>
          l.id === lendingId
            ? { ...l, returned_at: getTodayKST() }
            : l
        )
      )

      toast({
        title: '반납 처리 완료',
        description: '도서가 반납 처리되었습니다.',
      })
    } catch (error) {
      console.error('Error returning book:', error)
      toast({
        title: '반납 처리 오류',
        description: '도서 반납 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsReturningId(null)
      setReturnTarget(null)
    }
  }

  async function handleSendReminder(lending: BookLending) {
    setIsSendingReminderId(lending.id)
    try {
      const result = await sendReminder(lending.id)

      if (!result.success) {
        throw new Error(result.error || '알림 전송 실패')
      }

      // Update local state
      setLendings((prev) =>
        prev.map((l) =>
          l.id === lending.id
            ? { ...l, reminder_sent_at: new Date().toISOString() }
            : l
        )
      )

      toast({
        title: '알림 전송 완료',
        description: `${lending.students?.users?.name} 학생에게 반납 알림이 전송되었습니다.`,
      })
    } catch (error) {
      console.error('Error sending reminder:', error)
      toast({
        title: '알림 전송 오류',
        description: '알림 전송 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingReminderId(null)
      setReminderTarget(null)
    }
  }

  function handleBulkReminderClick() {
    const today = getTodayKST()
    const overdueLendings = lendings.filter(
      (l) => !l.returned_at && l.due_date < today && !l.reminder_sent_at
    )

    if (overdueLendings.length === 0) {
      toast({
        title: '알림 대상 없음',
        description: '알림을 보낼 연체 도서가 없습니다.',
      })
      return
    }

    setBulkReminderDialogOpen(true)
  }

  async function handleConfirmBulkReminder() {
    const today = getTodayKST()
    const overdueLendings = lendings.filter(
      (l) => !l.returned_at && l.due_date < today && !l.reminder_sent_at
    )

    setIsSendingBulkReminder(true)

    try {
      const result = await sendBulkReminder(overdueLendings.map((l) => l.id))

      if (!result.success) {
        throw new Error(result.error || '일괄 알림 전송 실패')
      }

      // Update local state
      const now = new Date().toISOString()
      const overdueIds = new Set(overdueLendings.map((l) => l.id))
      setLendings((prev) =>
        prev.map((l) =>
          overdueIds.has(l.id) ? { ...l, reminder_sent_at: now } : l
        )
      )

      toast({
        title: '일괄 알림 전송 완료',
        description: `${result.data}명에게 반납 알림이 전송되었습니다.`,
      })
    } catch (error) {
      console.error('Error sending bulk reminder:', error)
      toast({
        title: '일괄 알림 전송 오류',
        description: '일괄 알림 전송 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingBulkReminder(false)
      setBulkReminderDialogOpen(false)
    }
  }

  function getStatusBadge(lending: BookLending) {
    if (lending.returned_at) {
      return (
        <Badge variant="outline" className="bg-green-50">
          <CheckCircle className="h-3 w-3 mr-1" />
          반납 완료
        </Badge>
      )
    }

    const today = getTodayKST()
    const isOverdue = lending.due_date < today

    if (isOverdue) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          연체
        </Badge>
      )
    }

    const daysUntilDue = getDateDiffInDays(today, lending.due_date)

    if (daysUntilDue <= 3) {
      return (
        <Badge variant="secondary" className="bg-yellow-50">
          <Calendar className="h-3 w-3 mr-1" />
          반납 임박 ({daysUntilDue}일)
        </Badge>
      )
    }

    return <Badge variant="outline">대출 중</Badge>
  }

  return (
    <PageWrapper
      title="도서 대출 관리"
      subtitle="도서 대출 현황을 관리하고 반납 알림을 전송하세요"
      actions={
        <div className="flex gap-2">
          {stats.overdueUnsent > 0 && (
            <Button variant="outline" onClick={handleBulkReminderClick}>
              <Send className="h-4 w-4 mr-2" />
              연체 알림 ({stats.overdueUnsent}건)
            </Button>
          )}
          <Button onClick={() => router.push('/library/lendings/new')}>
            <Plus className="h-4 w-4 mr-2" />
            대출 등록
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>전체 대출</CardDescription>
              <CardTitle className="text-3xl">{stats.total}건</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>대출 중</CardDescription>
              <CardTitle className="text-3xl text-info">{stats.active}건</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>연체</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.overdue}건</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>반납 완료</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.returned}건</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="도서명, 저자, 학생명, 바코드로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              전체 ({stats.total})
            </Button>
            <Button
              variant={filterStatus === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('active')}
            >
              대출 중 ({stats.active})
            </Button>
            <Button
              variant={filterStatus === 'due_soon' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('due_soon')}
            >
              반납 임박 ({stats.dueSoon})
            </Button>
            <Button
              variant={filterStatus === 'overdue' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('overdue')}
            >
              연체 ({stats.overdue})
            </Button>
            <Button
              variant={filterStatus === 'returned' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('returned')}
            >
              반납 완료 ({stats.returned})
            </Button>
            <Button
              variant={showUnsentOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowUnsentOnly((prev) => !prev)}
            >
              미전송만
            </Button>
            <Button
              variant={sortBy === 'due_asc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('due_asc')}
            >
              반납일 빠른순
            </Button>
            <Button
              variant={sortBy === 'borrowed_desc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('borrowed_desc')}
            >
              최신 대출순
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => applyPreset('overdue_unsent')}>
            연체+미전송 처리
          </Button>
          <Button variant="secondary" size="sm" onClick={() => applyPreset('due_soon_unsent')}>
            임박+미전송 점검
          </Button>
          <Button variant="secondary" size="sm" onClick={() => applyPreset('today_due')}>
            오늘 반납 예정
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">고급 필터</CardTitle>
            <CardDescription>학생/교재/반납 예정일 조건으로 목록을 좁힙니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="학생 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 학생</SelectItem>
                  {studentOptions.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTextbookKey} onValueChange={setSelectedTextbookKey}>
                <SelectTrigger>
                  <SelectValue placeholder="교재 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 교재</SelectItem>
                  {textbookOptions.map((textbook) => (
                    <SelectItem key={textbook.key} value={textbook.key}>
                      {textbook.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dueRange} onValueChange={(v) => setDueRange(v as DueRangeFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="반납 예정일" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">기간 전체</SelectItem>
                  <SelectItem value="today">오늘 반납</SelectItem>
                  <SelectItem value="7days">7일 이내 반납</SelectItem>
                  <SelectItem value="custom">기간 직접 선택</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={resetAdvancedFilters}>
                필터 초기화
              </Button>
            </div>

            {dueRange === 'custom' && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Input
                  type="date"
                  value={customDueStart}
                  onChange={(e) => setCustomDueStart(e.target.value)}
                />
                <Input
                  type="date"
                  value={customDueEnd}
                  onChange={(e) => setCustomDueEnd(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lendings Table */}
        <Card>
          <CardHeader>
            <CardTitle>대출 목록</CardTitle>
            <CardDescription>도서 대출 현황 및 반납 관리</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLendings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>표시할 대출 기록이 없습니다.</p>
                {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학생</TableHead>
                      <TableHead>도서</TableHead>
                      <TableHead>대출일</TableHead>
                      <TableHead>반납 예정일</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>알림</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLendings.map((lending) => (
                      <TableRow key={lending.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {lending.students?.users?.name || '이름 없음'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {lending.students?.student_code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{lending.textbooks?.title}</div>
                            {lending.textbooks?.author && (
                              <div className="text-xs text-muted-foreground">
                                {lending.textbooks.author}
                              </div>
                            )}
                            {lending.textbooks?.barcode && (
                              <div className="text-xs text-muted-foreground">
                                #{lending.textbooks.barcode}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatYmdKST(lending.borrowed_at)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatYmdKST(lending.due_date)}
                        </TableCell>
                        <TableCell>{getStatusBadge(lending)}</TableCell>
                        <TableCell>
                          {lending.reminder_sent_at ? (
                            <div className="text-xs text-muted-foreground">
                              {formatDateTimeKST(lending.reminder_sent_at)}
                            </div>
                          ) : !lending.returned_at ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReminderTarget(lending)}
                              disabled={isSendingReminderId === lending.id || isReturningId === lending.id}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              {isSendingReminderId === lending.id ? '전송 중...' : '전송'}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!lending.returned_at && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReturnTarget(lending)}
                              disabled={isReturningId === lending.id || isSendingReminderId === lending.id}
                            >
                              {isReturningId === lending.id ? '처리 중...' : '반납 처리'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {filteredLendings.length > 0 && (
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  총 {filteredLendings.length}건 중 {(currentPage - 1) * PAGE_SIZE + 1}-
                  {Math.min(currentPage * PAGE_SIZE, filteredLendings.length)}건 표시
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    이전
                  </Button>
                  <span>
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    다음
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Reminder Confirmation Dialog */}
        <ConfirmationDialog
          open={bulkReminderDialogOpen}
          onOpenChange={setBulkReminderDialogOpen}
          title="연체 알림을 전송하시겠습니까?"
          description={`${stats.overdueUnsent}명에게 반납 알림이 전송됩니다.`}
          confirmText="전송"
          variant="default"
          isLoading={isSendingBulkReminder}
          onConfirm={handleConfirmBulkReminder}
        />
        <ConfirmationDialog
          open={Boolean(returnTarget)}
          onOpenChange={(open) => {
            if (!open) setReturnTarget(null)
          }}
          title="반납 처리하시겠습니까?"
          description={`${returnTarget?.students?.users?.name || '해당 학생'}의 ${returnTarget?.textbooks?.title || '교재'}를 반납 처리합니다.`}
          confirmText="반납 처리"
          variant="default"
          isLoading={Boolean(returnTarget && isReturningId === returnTarget.id)}
          onConfirm={() => {
            if (returnTarget) {
              void handleReturn(returnTarget.id)
            }
          }}
        />
        <ConfirmationDialog
          open={Boolean(reminderTarget)}
          onOpenChange={(open) => {
            if (!open) setReminderTarget(null)
          }}
          title="반납 알림을 전송하시겠습니까?"
          description={`${reminderTarget?.students?.users?.name || '해당 학생'}에게 ${reminderTarget?.textbooks?.title || '교재'} 반납 알림을 전송합니다.`}
          confirmText="알림 전송"
          variant="default"
          isLoading={Boolean(reminderTarget && isSendingReminderId === reminderTarget.id)}
          onConfirm={() => {
            if (reminderTarget) {
              void handleSendReminder(reminderTarget)
            }
          }}
        />
      </div>
    </PageWrapper>
  )
}
