'use client'

import { useQuery } from '@tanstack/react-query'
import { getTextbooksListEnriched } from '@/app/actions/textbooks'
import { queryKeys } from '@/lib/query-keys'

/**
 * 교재 목록 페이지 전용: 전체 교재 + 대출/단원 카운트.
 *
 * 검색/페이지네이션은 컴포넌트에서 인메모리로 처리하세요.
 * 서버 unstable_cache(5분) + React Query staleTime(5분) 이중 캐시.
 *
 * 무효화: 교재/대출/단원 mutation 시 자동 (서버 캐시).
 * React Query 측은 `queryClient.invalidateQueries({ queryKey: queryKeys.textbooks.all() })`로 트리거.
 */
export function useTextbooksEnrichedQuery() {
  return useQuery({
    queryKey: queryKeys.textbooks.enriched(),
    queryFn: async () => {
      const result = await getTextbooksListEnriched()
      if (!result.success) {
        throw new Error(result.error || '교재 목록을 불러올 수 없습니다')
      }
      return result.data
    },
    staleTime: 5 * 60_000,
  })
}
