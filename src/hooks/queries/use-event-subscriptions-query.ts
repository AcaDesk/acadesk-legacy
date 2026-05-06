'use client'

import { useQuery } from '@tanstack/react-query'
import { getEventSubscriptions, type EventSubscription } from '@/app/actions/messaging/event-subscriptions'
import { queryKeys } from '@/lib/query-keys'

const POLLING_STATUSES = new Set(['inspecting', 'provisioning'])

/**
 * 학원 이벤트 구독 목록을 조회한다.
 *
 * inspecting/provisioning 상태가 1개라도 있으면 60초마다 자동 새로고침해서
 * 카카오 검수 결과를 학원장이 페이지를 떠나지 않고 확인할 수 있게 한다.
 */
export function useEventSubscriptionsQuery(initialData?: EventSubscription[]) {
  return useQuery({
    queryKey: queryKeys.eventSubscriptions.list(),
    queryFn: async () => {
      const result = await getEventSubscriptions()
      if (!result.success) {
        throw new Error(result.error || '이벤트 구독 조회 실패')
      }
      return result.data
    },
    initialData,
    refetchInterval: (query) => {
      const data = query.state.data as EventSubscription[] | undefined
      if (!data) return false
      const hasPending = data.some((sub) => POLLING_STATUSES.has(sub.provisioningStatus))
      return hasPending ? 60_000 : false
    },
    refetchIntervalInBackground: false,
  })
}
