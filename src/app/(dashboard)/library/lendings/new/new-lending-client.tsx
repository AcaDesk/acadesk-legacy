'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Button } from '@ui/button'
import { Label } from '@ui/label'
import { Input } from '@ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/alert-dialog'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { DatePicker } from '@ui/date-picker'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { EmptyState } from '@ui/empty-state'
import { StudentSearch, type Student } from '@/components/features/students/student-search'
import { createBulkBookLending, type BulkLendingResult } from '@/app/actions/book-lendings'
import { useToast } from '@/hooks/use-toast'

// ============================================================================
// Types
// ============================================================================

interface NewLendingClientProps {
  students: Array<{
    id: string
    name: string
    studentCode: string
  }>
  textbooks: Array<{
    id: string
    title: string
    author: string | null
    barcode: string | null
    managementCode: string | null
    totalCopies: number
    activeLendingCount: number
    availableCopies: number
    isAvailable: boolean
  }>
}

interface CartItem {
  id: string
  textbookId: string
  title: string
  author: string | null
  barcode: string | null
  borrowedAt: string
  dueDate: string
  notes: string
  usesGlobalDates: boolean
}

// ============================================================================
// Helpers
// ============================================================================

function getTodayKST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatYMD(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(ymd: string, days: number): string {
  const date = parseYMD(ymd)
  date.setDate(date.getDate() + days)
  return formatYMD(date)
}

function getSemesterEndDate(): string {
  const now = new Date()
  const kstMonth = Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', month: 'numeric' }).format(now)
  )
  const kstYear = Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(now)
  )

  if (kstMonth >= 3 && kstMonth <= 7) {
    return `${kstYear}-07-31`
  } else if (kstMonth >= 8) {
    return `${kstYear + 1}-02-28`
  } else {
    return `${kstYear}-02-28`
  }
}

// ============================================================================
// Component
// ============================================================================

export function NewLendingClient({ students, textbooks }: NewLendingClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  // ── State ──────────────────────────────────────────────────────────────

  const today = useMemo(() => getTodayKST(), [])
  const [studentId, setStudentId] = useState('')
  const [globalBorrowedAt, setGlobalBorrowedAt] = useState(today)
  const [globalDueDate, setGlobalDueDate] = useState(() => addDays(today, 14))
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [textbookSearch, setTextbookSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<BulkLendingResult | null>(null)
  const [resultDialogOpen, setResultDialogOpen] = useState(false)

  // ── Derived State ──────────────────────────────────────────────────────

  const mappedStudents: Student[] = useMemo(
    () =>
      students.map((s) => ({
        id: s.id,
        name: s.name,
        student_code: s.studentCode,
      })),
    [students]
  )

  const selectedStudentName = useMemo(
    () => students.find((s) => s.id === studentId)?.name || '',
    [students, studentId]
  )

  const cartTextbookCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of cartItems) {
      counts.set(item.textbookId, (counts.get(item.textbookId) || 0) + 1)
    }
    return counts
  }, [cartItems])

  const textbooksWithRemaining = useMemo(
    () =>
      textbooks.map((t) => ({
        ...t,
        remainingCopies: t.availableCopies - (cartTextbookCounts.get(t.id) || 0),
      })),
    [textbooks, cartTextbookCounts]
  )

  const filteredTextbooks = useMemo(() => {
    const search = textbookSearch.trim().toLowerCase()
    if (!search) return textbooksWithRemaining
    return textbooksWithRemaining.filter(
      (t) =>
        t.title.toLowerCase().includes(search) ||
        (t.author && t.author.toLowerCase().includes(search)) ||
        (t.barcode && t.barcode.toLowerCase().includes(search)) ||
        (t.managementCode && t.managementCode.toLowerCase().includes(search))
    )
  }, [textbooksWithRemaining, textbookSearch])

  const globalDateError = useMemo(() => {
    if (globalDueDate < globalBorrowedAt) {
      return '반납 예정일은 대출일 이후여야 합니다.'
    }
    return null
  }, [globalBorrowedAt, globalDueDate])

  const cartItemErrors = useMemo(() => {
    const errors = new Map<string, string>()
    for (const item of cartItems) {
      if (item.dueDate < item.borrowedAt) {
        errors.set(item.id, '반납 예정일은 대출일 이후여야 합니다.')
      }
    }
    return errors
  }, [cartItems])

  const canSubmit =
    !!studentId && cartItems.length > 0 && cartItemErrors.size === 0

  // ── Handlers: Global Dates ─────────────────────────────────────────────

  function handleGlobalBorrowedAtChange(date: Date | undefined) {
    if (!date) return
    const ymd = formatYMD(date)
    setGlobalBorrowedAt(ymd)
    setCartItems((prev) =>
      prev.map((item) => (item.usesGlobalDates ? { ...item, borrowedAt: ymd } : item))
    )
  }

  function handleGlobalDueDateChange(date: Date | undefined) {
    if (!date) return
    const ymd = formatYMD(date)
    setGlobalDueDate(ymd)
    setCartItems((prev) =>
      prev.map((item) => (item.usesGlobalDates ? { ...item, dueDate: ymd } : item))
    )
  }

  function handleQuickDueDate(days: number | 'semester') {
    const newDueDate =
      days === 'semester' ? getSemesterEndDate() : addDays(globalBorrowedAt, days)
    setGlobalDueDate(newDueDate)
    setCartItems((prev) =>
      prev.map((item) =>
        item.usesGlobalDates ? { ...item, dueDate: newDueDate } : item
      )
    )
  }

  function applyGlobalDatesToAll() {
    setCartItems((prev) =>
      prev.map((item) => ({
        ...item,
        borrowedAt: globalBorrowedAt,
        dueDate: globalDueDate,
        usesGlobalDates: true,
      }))
    )
  }

  // ── Handlers: Cart ─────────────────────────────────────────────────────

  function addToCart(textbook: (typeof textbooksWithRemaining)[number]) {
    if (textbook.remainingCopies <= 0) return
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      textbookId: textbook.id,
      title: textbook.title,
      author: textbook.author,
      barcode: textbook.barcode,
      borrowedAt: globalBorrowedAt,
      dueDate: globalDueDate,
      notes: '',
      usesGlobalDates: true,
    }
    setCartItems((prev) => [...prev, newItem])
  }

  function removeFromCart(itemId: string) {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  function updateCartItemDate(
    itemId: string,
    field: 'borrowedAt' | 'dueDate',
    date: Date | undefined
  ) {
    if (!date) return
    const ymd = formatYMD(date)
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [field]: ymd, usesGlobalDates: false } : item
      )
    )
  }

  function updateCartItemNotes(itemId: string, notes: string) {
    setCartItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes } : item))
    )
  }

  // ── Handlers: Submit ───────────────────────────────────────────────────

  function handleSubmitClick() {
    if (!canSubmit) return
    setConfirmDialogOpen(true)
  }

  async function handleConfirmSubmit() {
    setIsSubmitting(true)
    try {
      const result = await createBulkBookLending({
        studentId,
        items: cartItems.map((item) => ({
          textbookId: item.textbookId,
          borrowedAt: item.borrowedAt,
          dueDate: item.dueDate,
          notes: item.notes.trim() || undefined,
        })),
      })

      setConfirmDialogOpen(false)

      if (!result.success) {
        throw new Error(result.error || '대출 등록 실패')
      }

      const bulkResult = result.data
      setSubmissionResult(bulkResult)

      if (bulkResult.failedCount === 0) {
        toast({
          title: '대출 등록 완료',
          description: `${bulkResult.successCount}권의 교재 대출이 등록되었습니다.`,
        })
        router.push('/library/lendings')
        router.refresh()
      } else {
        setResultDialogOpen(true)
      }
    } catch (error) {
      setConfirmDialogOpen(false)
      console.error('bulk lending error:', error)
      toast({
        title: '대출 등록 실패',
        description: '대출 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleRetryFailed() {
    if (!submissionResult) return
    const failedIndices = new Set<number>()
    submissionResult.results.forEach((r, i) => {
      if (!r.success) failedIndices.add(i)
    })
    setCartItems((prev) => prev.filter((_, i) => failedIndices.has(i)))
    setResultDialogOpen(false)
    setSubmissionResult(null)
  }

  function handleGoToList() {
    setResultDialogOpen(false)
    router.push('/library/lendings')
    router.refresh()
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <PageWrapper
      title="대출 등록"
      subtitle="학생에게 교재 대출을 등록합니다."
      actions={
        <Button asChild variant="ghost" size="icon">
          <Link href="/library/lendings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* ── Section 1: Student Selection ── */}
        <Card>
          <CardHeader>
            <CardTitle>학생 선택</CardTitle>
            <CardDescription>대출할 학생을 선택하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <StudentSearch
              mode="single"
              variant="select"
              students={mappedStudents}
              fetchStudents={false}
              value={studentId || undefined}
              onChange={(id) => setStudentId(id || '')}
              placeholder="학생을 선택하세요"
              showGrade={false}
            />
          </CardContent>
        </Card>

        {/* ── Section 2: Date Settings ── */}
        <Card>
          <CardHeader>
            <CardTitle>대출 기간 설정</CardTitle>
            <CardDescription>
              기본 대출 기간을 설정합니다. 장바구니에서 항목별로 개별 수정할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>대출일</Label>
                <DatePicker
                  value={parseYMD(globalBorrowedAt)}
                  onChange={handleGlobalBorrowedAtChange}
                  dateFormat="yyyy년 MM월 dd일"
                  placeholder="대출일 선택"
                />
              </div>
              <div className="space-y-2">
                <Label>반납 예정일</Label>
                <DatePicker
                  value={parseYMD(globalDueDate)}
                  onChange={handleGlobalDueDateChange}
                  dateFormat="yyyy년 MM월 dd일"
                  placeholder="반납 예정일 선택"
                />
              </div>
            </div>

            {globalDateError && (
              <p className="text-sm text-destructive">{globalDateError}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground self-center mr-1">
                빠른 설정:
              </span>
              {[
                { label: '7일', value: 7 as const },
                { label: '14일', value: 14 as const },
                { label: '30일', value: 30 as const },
              ].map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDueDate(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDueDate('semester')}
              >
                학기말
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Textbook Search + Cart ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  교재 선택
                  {cartItems.length > 0 && (
                    <Badge variant="secondary">{cartItems.length}권</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  교재를 검색하고 클릭하여 장바구니에 추가하세요.
                </CardDescription>
              </div>
              {cartItems.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyGlobalDatesToAll}
                >
                  전체 날짜 일괄 적용
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Textbook Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="교재명, 저자, 관리번호, 바코드로 검색..."
                value={textbookSearch}
                onChange={(e) => setTextbookSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            <div className="max-h-48 overflow-y-auto rounded-md border">
              {filteredTextbooks.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {textbookSearch
                    ? '검색 결과가 없습니다.'
                    : '등록된 교재가 없습니다.'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTextbooks.map((textbook) => {
                    const canAdd = textbook.remainingCopies > 0
                    return (
                      <div
                        key={textbook.id}
                        className={`flex items-center justify-between px-3 py-2 text-sm ${
                          canAdd
                            ? 'cursor-pointer hover:bg-muted'
                            : 'cursor-not-allowed opacity-50'
                        }`}
                        onClick={() => canAdd && addToCart(textbook)}
                        role="button"
                        tabIndex={canAdd ? 0 : -1}
                        onKeyDown={(e) => {
                          if ((e.key === 'Enter' || e.key === ' ') && canAdd) {
                            e.preventDefault()
                            addToCart(textbook)
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{textbook.title}</span>
                          {textbook.author && (
                            <span className="text-muted-foreground ml-2">
                              {textbook.author}
                            </span>
                          )}
                          {textbook.managementCode && (
                            <span className="text-muted-foreground ml-2">
                              #{textbook.managementCode}
                            </span>
                          )}
                          {textbook.barcode && !textbook.managementCode && (
                            <span className="text-muted-foreground ml-2">
                              #{textbook.barcode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          <Badge
                            variant={canAdd ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {canAdd
                              ? `잔여 ${textbook.remainingCopies}권`
                              : '재고 없음'}
                          </Badge>
                          {canAdd && (
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Cart */}
            {cartItems.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="장바구니가 비어 있습니다"
                description="위에서 교재를 검색하고 클릭하여 추가하세요."
                variant="minimal"
                className="min-h-[200px]"
              />
            ) : (
              <>
                {/* Desktop: Table View */}
                <div className="hidden sm:block rounded-md border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>교재명</TableHead>
                        <TableHead className="w-[160px]">대출일</TableHead>
                        <TableHead className="w-[160px]">반납 예정일</TableHead>
                        <TableHead className="w-[140px]">메모</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartItems.map((item) => {
                        const error = cartItemErrors.get(item.id)
                        return (
                          <TableRow
                            key={item.id}
                            className={error ? 'bg-destructive/5' : undefined}
                          >
                            <TableCell>
                              <div>
                                <span className="font-medium">{item.title}</span>
                                {item.author && (
                                  <span className="text-muted-foreground text-xs ml-1">
                                    {item.author}
                                  </span>
                                )}
                              </div>
                              {error && (
                                <p className="text-xs text-destructive mt-1">
                                  {error}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <DatePicker
                                value={parseYMD(item.borrowedAt)}
                                onChange={(date) =>
                                  updateCartItemDate(item.id, 'borrowedAt', date)
                                }
                                dateFormat="yyyy-MM-dd"
                                className="h-8 text-xs"
                              />
                            </TableCell>
                            <TableCell>
                              <DatePicker
                                value={parseYMD(item.dueDate)}
                                onChange={(date) =>
                                  updateCartItemDate(item.id, 'dueDate', date)
                                }
                                dateFormat="yyyy-MM-dd"
                                className="h-8 text-xs"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.notes}
                                onChange={(e) =>
                                  updateCartItemNotes(item.id, e.target.value)
                                }
                                placeholder="메모"
                                className="h-8 text-xs"
                                maxLength={500}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeFromCart(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile: Card View */}
                <div className="space-y-3 sm:hidden">
                  {cartItems.map((item) => {
                    const error = cartItemErrors.get(item.id)
                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg border p-3 space-y-3 ${error ? 'border-destructive/50 bg-destructive/5' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-medium">{item.title}</span>
                            {item.author && (
                              <span className="text-muted-foreground text-xs ml-1">
                                {item.author}
                              </span>
                            )}
                            {error && (
                              <p className="text-xs text-destructive mt-1">{error}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">대출일</Label>
                            <DatePicker
                              value={parseYMD(item.borrowedAt)}
                              onChange={(date) =>
                                updateCartItemDate(item.id, 'borrowedAt', date)
                              }
                              dateFormat="yyyy-MM-dd"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">반납 예정일</Label>
                            <DatePicker
                              value={parseYMD(item.dueDate)}
                              onChange={(date) =>
                                updateCartItemDate(item.id, 'dueDate', date)
                              }
                              dateFormat="yyyy-MM-dd"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <Input
                          value={item.notes}
                          onChange={(e) =>
                            updateCartItemNotes(item.id, e.target.value)
                          }
                          placeholder="메모"
                          className="h-8 text-xs"
                          maxLength={500}
                        />
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Submit Buttons ── */}
        <div className="flex items-center justify-end gap-2">
          {!canSubmit && cartItems.length > 0 && (
            <p className="text-sm text-muted-foreground mr-auto flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {cartItemErrors.size > 0
                ? '날짜 오류를 수정하세요.'
                : !studentId
                  ? '학생을 선택하세요.'
                  : ''}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/library/lendings')}
          >
            취소
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmitClick}
          >
            {isSubmitting
              ? '등록 중...'
              : cartItems.length > 0
                ? `대출 등록 (${cartItems.length}권)`
                : '대출 등록'}
          </Button>
        </div>
      </div>

      {/* ── Confirmation Dialog ── */}
      <ConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        title={`${cartItems.length}권의 교재를 대출 등록하시겠습니까?`}
        description={
          <div className="space-y-2 text-sm max-h-60 overflow-y-auto">
            <p>
              <span className="font-medium">학생:</span> {selectedStudentName}
            </p>
            <ul className="list-disc pl-4 space-y-1">
              {cartItems.map((item) => (
                <li key={item.id}>
                  {item.title} ({item.borrowedAt} ~ {item.dueDate})
                </li>
              ))}
            </ul>
          </div>
        }
        confirmText="대출 등록"
        variant="default"
        isLoading={isSubmitting}
        onConfirm={handleConfirmSubmit}
      />

      {/* ── Result Dialog ── */}
      <AlertDialog
        open={resultDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleGoToList()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>대출 등록 결과</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                {submissionResult && (
                  <>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>성공 {submissionResult.successCount}건</span>
                      </div>
                      <div className="flex items-center gap-1 text-destructive">
                        <XCircle className="h-4 w-4" />
                        <span>실패 {submissionResult.failedCount}건</span>
                      </div>
                    </div>
                    {submissionResult.failedCount > 0 && (
                      <div className="rounded-md border p-3 space-y-2 max-h-40 overflow-y-auto">
                        <p className="text-sm font-medium">실패 사유:</p>
                        {submissionResult.results
                          .filter((r) => !r.success)
                          .map((r, i) => (
                            <div key={i} className="text-sm">
                              <span className="font-medium">
                                {r.textbookTitle}
                              </span>
                              <span className="text-muted-foreground ml-1">
                                - {r.error}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {submissionResult && submissionResult.failedCount > 0 && (
              <Button variant="outline" onClick={handleRetryFailed}>
                <RotateCcw className="mr-2 h-4 w-4" />
                실패 항목 재시도
              </Button>
            )}
            <Button onClick={handleGoToList}>목록으로 이동</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  )
}
