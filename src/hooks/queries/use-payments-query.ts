'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getInvoices,
  getInvoiceDetail,
  getPaymentHistory,
  getPaymentDashboardStats,
} from '@/app/actions/payments/queries'
import { queryKeys } from '@/lib/query-keys'
import type { InvoiceStatus } from '@/core/types/payment'

export interface InvoiceFilters {
  billingMonth?: string
  status?: InvoiceStatus | 'all'
  unpaidOnly?: boolean
  search?: string
  page?: number
  pageSize?: number
}

export function useInvoicesQuery(filters: InvoiceFilters) {
  return useQuery({
    queryKey: queryKeys.payments.invoices(filters as Record<string, unknown>),
    queryFn: async () => {
      const result = await getInvoices(filters)
      if (!result.success || !result.data) {
        throw new Error(result.error || '청구서 목록을 불러올 수 없습니다')
      }
      return result.data
    },
    staleTime: 30_000,
  })
}

export function useInvoiceDetailQuery(invoiceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.payments.invoiceDetail(invoiceId),
    queryFn: async () => {
      const result = await getInvoiceDetail(invoiceId)
      if (!result.success || !result.data) {
        throw new Error(result.error || '청구서를 불러올 수 없습니다')
      }
      return result.data
    },
    enabled: enabled && Boolean(invoiceId),
  })
}

export function usePaymentHistoryQuery(filters: {
  billingMonth?: string
  method?: 'card' | 'transfer' | 'cash' | 'all'
  search?: string
  page?: number
  pageSize?: number
}) {
  return useQuery({
    queryKey: queryKeys.payments.history(filters as Record<string, unknown>),
    queryFn: async () => {
      const result = await getPaymentHistory(filters)
      if (!result.success || !result.data) {
        throw new Error(result.error || '수납 이력을 불러올 수 없습니다')
      }
      return result.data
    },
    staleTime: 30_000,
  })
}

export function usePaymentStatsQuery(billingMonth: string) {
  return useQuery({
    queryKey: queryKeys.payments.stats(billingMonth),
    queryFn: async () => {
      const result = await getPaymentDashboardStats(billingMonth)
      if (!result.success) {
        throw new Error(result.error || '수납 통계를 불러올 수 없습니다')
      }
      return result.data
    },
    staleTime: 60_000,
  })
}
