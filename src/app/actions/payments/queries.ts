'use server'

/**
 * 수납/청구 조회 액션
 *
 * 모든 조회는 검증된 세션의 tenantId로 스코프되고,
 * 리스트는 표준 페이지네이션 유틸(src/lib/pagination.ts)을 사용한다.
 */

import { withServerAction } from '@/lib/server-action-helpers'
import { resolvePageRange, buildPaginatedResult, type PaginatedResult } from '@/lib/pagination'
import type {
  Invoice,
  InvoiceItem,
  Payment,
  InvoiceStatus,
  PaymentDashboardStats,
} from '@/core/types/payment'

export interface InvoiceListRow extends Invoice {
  student_name: string
  student_code: string
  remaining_amount: number
}

interface InvoiceRowRaw extends Invoice {
  students: { name: string | null; student_code: string | null } | { name: string | null; student_code: string | null }[] | null
}

function flattenStudent(row: InvoiceRowRaw): InvoiceListRow {
  const student = Array.isArray(row.students) ? row.students[0] : row.students
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { students: _students, ...invoice } = row
  return {
    ...invoice,
    student_name: student?.name || '',
    student_code: student?.student_code || '',
    remaining_amount: Math.max(row.total_amount - row.paid_amount, 0),
  }
}

/**
 * 청구서 목록 (월/상태 필터 + 페이지네이션)
 */
export async function getInvoices(options?: {
  billingMonth?: string
  status?: InvoiceStatus | 'all'
  studentId?: string
  page?: number
  pageSize?: number
}) {
  return withServerAction<PaginatedResult<InvoiceListRow> | null>(
    async ({ tenantId, serviceClient }) => {
      const range = resolvePageRange(options)

      let query = serviceClient
        .from('tuition_invoices')
        .select('*, students!inner(name, student_code)', { count: 'planned' })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      if (options?.billingMonth) {
        query = query.eq('billing_month', options.billingMonth)
      }
      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status)
      }
      if (options?.studentId) {
        query = query.eq('student_id', options.studentId)
      }

      const { data, count, error } = await query
        .order('due_date', { ascending: false })
        .range(range.from, range.to)

      if (error) throw error

      return buildPaginatedResult(
        ((data || []) as unknown as InvoiceRowRaw[]).map(flattenStudent),
        count,
        range
      )
    },
    { actionName: 'getInvoices', defaultValue: null }
  )
}

/**
 * 청구서 상세 (항목 + 수납 이력 포함)
 */
export async function getInvoiceDetail(invoiceId: string) {
  return withServerAction<
    | (InvoiceListRow & { items: InvoiceItem[]; payments: Payment[] })
    | null
  >(
    async ({ tenantId, serviceClient }) => {
      const { data, error } = await serviceClient
        .from('tuition_invoices')
        .select(
          `*,
          students!inner(name, student_code),
          tuition_invoice_items(*),
          payments(*)`
        )
        .eq('id', invoiceId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) throw error
      if (!data) throw new Error('청구서를 찾을 수 없습니다')

      const raw = data as unknown as InvoiceRowRaw & {
        tuition_invoice_items: InvoiceItem[]
        payments: Payment[]
      }
      const { tuition_invoice_items, payments, ...invoiceRow } = raw

      return {
        ...flattenStudent(invoiceRow),
        items: (tuition_invoice_items || []).filter((i) => !i.deleted_at),
        payments: (payments || [])
          .filter((p) => !p.deleted_at)
          .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1)),
      }
    },
    { actionName: 'getInvoiceDetail', defaultValue: null }
  )
}

/**
 * 월별 수납 대시보드 통계
 */
export async function getPaymentDashboardStats(billingMonth: string) {
  const fallback: PaymentDashboardStats = {
    totalBilled: 0,
    totalCollected: 0,
    totalUnpaid: 0,
    unpaidCount: 0,
    overdueCount: 0,
    collectionRate: 0,
  }

  return withServerAction<PaymentDashboardStats, PaymentDashboardStats>(
    async ({ tenantId, serviceClient }) => {
      const { data, error } = await serviceClient
        .from('tuition_invoices')
        .select('total_amount, paid_amount, status')
        .eq('tenant_id', tenantId)
        .eq('billing_month', billingMonth)
        .is('deleted_at', null)

      if (error) throw error

      const rows = (data || []) as Array<{
        total_amount: number
        paid_amount: number
        status: InvoiceStatus
      }>

      const totalBilled = rows.reduce((sum, r) => sum + r.total_amount, 0)
      const totalCollected = rows.reduce((sum, r) => sum + r.paid_amount, 0)
      const totalUnpaid = Math.max(totalBilled - totalCollected, 0)
      const unpaidCount = rows.filter((r) => r.status !== 'paid').length
      const overdueCount = rows.filter((r) => r.status === 'overdue').length
      const collectionRate =
        totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0

      return {
        totalBilled,
        totalCollected,
        totalUnpaid,
        unpaidCount,
        overdueCount,
        collectionRate,
      }
    },
    { actionName: 'getPaymentDashboardStats', defaultValue: fallback }
  )
}

export interface PaymentHistoryRow extends Payment {
  billing_month: string
  student_name: string
  student_code: string
}

/**
 * 수납(결제) 이력 목록 (최근순 + 페이지네이션)
 */
export async function getPaymentHistory(options?: {
  billingMonth?: string
  page?: number
  pageSize?: number
}) {
  return withServerAction<PaginatedResult<PaymentHistoryRow> | null>(
    async ({ tenantId, serviceClient }) => {
      const range = resolvePageRange(options)

      let query = serviceClient
        .from('payments')
        .select(
          '*, tuition_invoices!inner(billing_month, students!inner(name, student_code))',
          { count: 'planned' }
        )
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)

      if (options?.billingMonth) {
        query = query.eq('tuition_invoices.billing_month', options.billingMonth)
      }

      const { data, count, error } = await query
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(range.from, range.to)

      if (error) throw error

      interface PaymentRowRaw extends Payment {
        tuition_invoices: {
          billing_month: string
          students:
            | { name: string | null; student_code: string | null }
            | { name: string | null; student_code: string | null }[]
            | null
        } | null
      }

      const rows = ((data || []) as unknown as PaymentRowRaw[]).map((row) => {
        const invoice = row.tuition_invoices
        const student = Array.isArray(invoice?.students)
          ? invoice?.students[0]
          : invoice?.students
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { tuition_invoices: _inv, ...payment } = row
        return {
          ...payment,
          billing_month: invoice?.billing_month || '',
          student_name: student?.name || '',
          student_code: student?.student_code || '',
        }
      })

      return buildPaginatedResult(rows, count, range)
    },
    { actionName: 'getPaymentHistory', defaultValue: null }
  )
}
