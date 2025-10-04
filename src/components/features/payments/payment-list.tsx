'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, CreditCard, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react'
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
} from '@/components/ui/pagination'
import type { InvoiceStatus } from '@/types/payment'

interface InvoiceListItem {
  id: string
  student_code: string
  student_name: string
  billing_month: string
  due_date: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  status: InvoiceStatus
  days_overdue: number
}

interface PaymentListProps {
  month?: string
  onPaymentClick?: (invoiceId: string) => void
}

export function PaymentList({ month, onPaymentClick }: PaymentListProps) {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

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
    from,
    to,
  } = useServerPagination({
    totalCount,
    itemsPerPage,
  })

  useEffect(() => {
    loadInvoices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter, month])

  useEffect(() => {
    resetPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, month])

  async function loadInvoices() {
    try {
      setLoading(true)

      // TODO: Replace with actual database query when tables are created
      // Mock data for now
      const mockInvoices: InvoiceListItem[] = [
        {
          id: '1',
          student_code: 'ST001',
          student_name: '김철수',
          billing_month: '2025-10',
          due_date: '2025-10-05',
          total_amount: 500000,
          paid_amount: 500000,
          remaining_amount: 0,
          status: 'paid',
          days_overdue: 0,
        },
        {
          id: '2',
          student_code: 'ST002',
          student_name: '이영희',
          billing_month: '2025-10',
          due_date: '2025-10-05',
          total_amount: 600000,
          paid_amount: 300000,
          remaining_amount: 300000,
          status: 'partially_paid',
          days_overdue: 0,
        },
        {
          id: '3',
          student_code: 'ST003',
          student_name: '박민수',
          billing_month: '2025-10',
          due_date: '2025-09-30',
          total_amount: 550000,
          paid_amount: 0,
          remaining_amount: 550000,
          status: 'overdue',
          days_overdue: 5,
        },
        {
          id: '4',
          student_code: 'ST004',
          student_name: '최지영',
          billing_month: '2025-10',
          due_date: '2025-10-10',
          total_amount: 700000,
          paid_amount: 0,
          remaining_amount: 700000,
          status: 'unpaid',
          days_overdue: 0,
        },
      ]

      // Apply filters
      let filtered = mockInvoices

      if (searchTerm) {
        filtered = filtered.filter(
          (inv) =>
            inv.student_name.includes(searchTerm) ||
            inv.student_code.includes(searchTerm)
        )
      }

      if (statusFilter !== 'all') {
        filtered = filtered.filter((inv) => inv.status === statusFilter)
      }

      if (month) {
        filtered = filtered.filter((inv) => inv.billing_month === month)
      }

      setInvoices(filtered)
      setTotalCount(filtered.length)
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast({
        title: '데이터 로드 오류',
        description: '청구서 목록을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: InvoiceStatus, daysOverdue: number) {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            완납
          </Badge>
        )
      case 'partially_paid':
        return (
          <Badge variant="secondary">
            <DollarSign className="h-3 w-3 mr-1" />
            부분납
          </Badge>
        )
      case 'overdue':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            연체 ({daysOverdue}일)
          </Badge>
        )
      case 'unpaid':
      default:
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            미납
          </Badge>
        )
    }
  }

  if (loading && invoices.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        로딩 중...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="학생 이름, 학번으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="납부 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="unpaid">미납</SelectItem>
            <SelectItem value="partially_paid">부분납</SelectItem>
            <SelectItem value="paid">완납</SelectItem>
            <SelectItem value="overdue">연체</SelectItem>
          </SelectContent>
        </Select>

        <Badge variant="secondary" className="h-10 px-4 flex items-center whitespace-nowrap">
          {startIndex}-{endIndex} / {totalItems}건
        </Badge>
      </div>

      {/* Table */}
      {invoices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg">
          <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>등록된 청구서가 없습니다.</p>
          {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>학생</TableHead>
                <TableHead>청구월</TableHead>
                <TableHead>납부 기한</TableHead>
                <TableHead className="text-right">청구액</TableHead>
                <TableHead className="text-right">수납액</TableHead>
                <TableHead className="text-right">미납액</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{invoice.student_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {invoice.student_code}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{invoice.billing_month}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(invoice.due_date).toLocaleDateString('ko-KR')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.total_amount.toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-right text-green-600 font-medium">
                    {invoice.paid_amount.toLocaleString()}원
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.remaining_amount > 0 ? (
                      <span className="text-orange-600 font-medium">
                        {invoice.remaining_amount.toLocaleString()}원
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invoice.status, invoice.days_overdue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.status !== 'paid' && (
                      <Button
                        size="sm"
                        onClick={() => onPaymentClick?.(invoice.id)}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        수납 처리
                      </Button>
                    )}
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
    </div>
  )
}
