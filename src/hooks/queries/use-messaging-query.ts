'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  getMessageHistory,
  getMessageStatistics,
  getMessageTemplates,
} from '@/app/actions/messaging/messages'
import { getMessagingBalance } from '@/app/actions/messaging/config'
import { queryKeys } from '@/lib/query-keys'

export interface MessageHistoryFilters {
  limit: number
  startDate: string
  endDate: string
  type?: 'SMS' | 'LMS' | 'MMS'
}

export function useMessageHistoryQuery(filters: MessageHistoryFilters) {
  return useQuery({
    queryKey: queryKeys.messaging.history({ ...filters }),
    queryFn: async () => {
      const result = await getMessageHistory(filters)
      if (!result.success || !result.data) {
        throw new Error(result.error || '메시지 이력 조회 실패')
      }
      return result.data.messageList || []
    },
    placeholderData: keepPreviousData,
  })
}

export interface MessageStatisticsFilters {
  startDate: string
  endDate: string
}

export interface MessageStatistics {
  total: number
  success: number
  pending: number
  failed: number
}

export function useMessageStatisticsQuery(filters: MessageStatisticsFilters) {
  return useQuery({
    queryKey: queryKeys.messaging.statistics({ ...filters }),
    queryFn: async (): Promise<MessageStatistics> => {
      const result = await getMessageStatistics(filters)
      if (!result.success || !result.data) {
        throw new Error(result.error || '통계 조회 실패')
      }
      // Solapi SDK 응답 타입이 유니온이라 통계 카드가 쓰는 형태로 좁힌다
      return result.data as unknown as MessageStatistics
    },
    placeholderData: keepPreviousData,
  })
}

export function useMessageTemplatesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.messaging.templates(),
    queryFn: async () => {
      const result = await getMessageTemplates()
      if (!result.success || !result.data) {
        throw new Error(result.error || '템플릿 로드 실패')
      }
      return result.data
    },
    enabled,
  })
}

export type MessagingBalance = NonNullable<
  Awaited<ReturnType<typeof getMessagingBalance>>['data']
>

export function useMessagingBalanceQuery(initialData?: MessagingBalance) {
  return useQuery({
    queryKey: queryKeys.messaging.balance(),
    queryFn: async () => {
      const result = await getMessagingBalance()
      if (!result.success || !result.data) {
        throw new Error(result.error || '잔액 조회 실패')
      }
      return result.data
    },
    staleTime: 60_000,
    initialData,
  })
}
