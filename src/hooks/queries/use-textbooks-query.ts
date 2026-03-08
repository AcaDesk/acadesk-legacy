'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getTextbooks } from '@/app/actions/textbooks'
import { queryKeys } from '@/lib/query-keys'

export interface TextbookFilters {
  search?: string
  page: number
  pageSize: number
}

export function useTextbooksQuery(filters: TextbookFilters) {
  return useQuery({
    queryKey: queryKeys.textbooks.list(filters as unknown as Record<string, unknown>),
    queryFn: async () => {
      const result = await getTextbooks({
        search: filters.search || undefined,
        page: filters.page,
        pageSize: filters.pageSize,
      })
      if (!result.success) {
        throw new Error('교재 목록을 불러올 수 없습니다')
      }
      return {
        data: result.data ?? [],
        lendingCountByTextbookId: result.lendingCountByTextbookId ?? {},
        unitCountByTextbookId: result.unitCountByTextbookId ?? {},
        totalCount: result.totalCount ?? 0,
        page: result.page ?? filters.page,
        pageSize: result.pageSize ?? filters.pageSize,
      }
    },
    placeholderData: keepPreviousData, // 페이지 이동 시 이전 데이터 유지
    staleTime: 60_000, // 1분
  })
}
