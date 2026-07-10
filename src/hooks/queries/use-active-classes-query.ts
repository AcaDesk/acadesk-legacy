'use client'

import { useQuery } from '@tanstack/react-query'
import { getActiveClasses } from '@/app/actions/classes'
import { queryKeys } from '@/lib/query-keys'

/**
 * 활성 수업 목록 — 수업 배정 다이얼로그 등에서 공유.
 */
export function useActiveClassesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.classes.active(),
    queryFn: async () => {
      const result = await getActiveClasses()
      if (!result.success || !result.data) {
        throw new Error(result.error || '수업 목록을 불러올 수 없습니다')
      }
      return result.data
    },
    staleTime: 5 * 60_000,
    enabled,
  })
}
