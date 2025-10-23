'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Search, CreditCard, Building2, Banknote, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useServerPagination } from '@/hooks/use-pagination'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@ui/pagination'
import { Button } from '@ui/button'
import type { PaymentMethod } from '@/core/types/payment'
import { ReceiptDialog } from './receipt-dialog'

interface PaymentHistoryItem {
  id: string
  student_code: string
  student_name: string
  billing_month: string
  payment_date: string
  paid_amount: number
  payment_method: PaymentMethod
  reference_number: string | null
}

interface PaymentHistoryListProps {
  month?: string
}

export function PaymentHistoryList({ month }: PaymentHistoryListProps) {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('')

  const { toast } = useToast()

  const itemsPerPage = 20

  const {
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex,
    totalItems,
  } = useServerPagination({
    totalCount,
    itemsPerPage,
  })

  useEffect(() => {
    loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, methodFilter, month])

  useEffect(() => {
    resetPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, methodFilter, month])

  async function loadPayments() {
    try {
      setLoading(true)

      // TODO: Replace with actual database query when tables are created
      // Mock data
      const mockPayments: PaymentHistoryItem[] = [
        {
          id: '1',
          student_code: 'ST001',
          student_name: '김철수',
          billing_month: '2025-10',
          payment_date: '2025-10-01',
          paid_amount: 500000,
          payment_method: 'transfer',
          reference_number: 'TR20251001001',
        },
        {
          id: '2',
          student_code: 'ST002',
          student_name: '이영희',
          billing_month: '2025-10',
          payment_date: '2025-10-02',
          paid_amount: 300000,
          payment_method: 'card',
          reference_number: 'CARD20251002001',
        },
        {
          id: '3',
          student_code: 'ST003',
          student_name: '박민수',
          billing_month: '2025-09',
          payment_date: '2025-10-03',
          paid_amount: 550000,
          payment_method: 'cash',
          reference_number: null,
        },
        {
          id: '4',
          student_code: 'ST001',
          student_name: '김철수',
          billing_month: '2025-09',
          payment_date: '2025-09-05',
          paid_amount: 500000,
          payment_method: 'transfer',
          reference_number: 'TR20250905001',
        },
      ]

      // Apply filters
      let filtered = mockPayments

      if (searchTerm) {
        filtered = filtered.filter(
          (payment) =>
            payment.student_name.includes(searchTerm) ||
            payment.student_code.includes(searchTerm) ||
            payment.reference_number?.includes(searchTerm)
        )
      }

      if (methodFilter !== 'all') {
        filtered = filtered.filter((payment) => payment.payment_method === methodFilter)
      }

      if (month) {
        filtered = filtered.filter((payment) => payment.billing_month === month)
      }

      setPayments(filtered)
      setTotalCount(filtered.length)
    } catch (error) {
      console.error('Error loading payments:', error)
      toast({
        title: '데이터 로드 오류',
        description: '수납 내역을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function getPaymentMethodBadge(method: PaymentMethod) {
    switch (method) {
      case 'card':
        return (
          <Badge variant="default">
            <CreditCard className="h-3 w-3 mr-1" />
            카드
          </Badge>
        )
      case 'transfer':
        return (
          <Badge variant="secondary">
            <Building2 className="h-3 w-3 mr-1" />
            계좌이체
          </Badge>
        )
      case 'cash':
        return (
          <Badge variant="outline">
            <Banknote className="h-3 w-3 mr-1" />
            현금
          </Badge>
        )
    }
  }

  const totalPaidAmount = payments.reduce((sum, p) => sum + p.paid_amount, 0)

  if (loading && payments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        로딩 중...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="학생 이름, 학번, 거래번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="결제 방법" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 방법</SelectItem>
              <SelectItem value="transfer">계좌이체</SelectItem>
              <SelectItem value="card">카드</SelectItem>
              <SelectItem value="cash">현금</SelectItem>
            </SelectContent>
          </Select>

          <Badge variant="secondary" className="h-10 px-4 flex items-center whitespace-nowrap">
            {startIndex}-{endIndex} / {totalItems}건
          </Badge>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">총 수납 건수</div>
            <div className="text-2xl font-bold">{totalItems}건</div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">총 수납 금액</div>
            <div className="text-2xl font-bold text-green-600">
              {totalPaidAmount.toLocaleString()}원
            </div>
          </div>
          <div className="border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">평균 수납액</div>
            <div className="text-2xl font-bold">
              {totalItems > 0 ? Math.round(totalPaidAmount / totalItems).toLocaleString() : 0}원
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {payments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>수납 내역이 없습니다.</p>
          {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>수납일</TableHead>
                <TableHead>학생</TableHead>
                <TableHead>청구월</TableHead>
                <TableHead>결제 방법</TableHead>
                <TableHead className="text-right">수납액</TableHead>
                <TableHead>거래번호</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {new Date(payment.payment_date).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.student_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {payment.student_code}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{payment.billing_month}</TableCell>
                  <TableCell>
                    {getPaymentMethodBadge(payment.payment_method)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-600">
                    {payment.paid_amount.toLocaleString()}원
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {payment.reference_number || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPaymentId(payment.id)
                        setReceiptDialogOpen(true)
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      영수증
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            페이지 {currentPage} / {totalPages}
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={previousPage}
                  className={!hasPreviousPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => goToPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )
                }
                return null
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={nextPage}
                  className={!hasNextPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Receipt Dialog */}
      <ReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        paymentId={selectedPaymentId}
        paymentDetails={
          selectedPaymentId
            ? {
                receipt_number: `RC-${new Date().getFullYear()}-${selectedPaymentId.padStart(6, '0')}`,
                student_name: payments.find(p => p.id === selectedPaymentId)?.student_name || '',
                student_code: payments.find(p => p.id === selectedPaymentId)?.student_code || '',
                payment_date: payments.find(p => p.id === selectedPaymentId)?.payment_date || '',
                billing_month: payments.find(p => p.id === selectedPaymentId)?.billing_month || '',
                paid_amount: payments.find(p => p.id === selectedPaymentId)?.paid_amount || 0,
                payment_method: payments.find(p => p.id === selectedPaymentId)?.payment_method || 'cash',
                reference_number: payments.find(p => p.id === selectedPaymentId)?.reference_number || null,
                academy_name: '아카데스크 학원',
                academy_registration_number: '123-45-67890',
                academy_address: '서울특별시 강남구 테헤란로 123',
                academy_phone: '02-1234-5678',
              }
            : undefined
        }
      />
    </div>
  )
}
