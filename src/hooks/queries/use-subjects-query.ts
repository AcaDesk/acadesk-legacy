'use client'

import { useQuery } from '@tanstack/react-query'
import { getSubjectsWithStatistics, type SubjectStatistics } from '@/app/actions/subjects'
import { queryKeys } from '@/lib/query-keys'

export function useSubjectsWithStatsQuery(initialData?: SubjectStatistics[]) {
  return useQuery({
    queryKey: queryKeys.subjects.listWithStats(),
    queryFn: async () => {
      const result = await getSubjectsWithStatistics()
      if (!result.success) throw new Error(result.error || '과목 조회 실패')
      return result.data
    },
    initialData,
  })
}
