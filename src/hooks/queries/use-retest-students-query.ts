'use client'

import { useQuery } from '@tanstack/react-query'
import { getRetestStudents, type RetestStudent } from '@/app/actions/grades/retests'
import { queryKeys } from '@/lib/query-keys'

export function useRetestStudentsQuery() {
  return useQuery<RetestStudent[]>({
    queryKey: queryKeys.grades.retests(),
    queryFn: async () => {
      const result = await getRetestStudents()
      if (!result.success || !result.data) {
        throw new Error(result.error || '재시험 대상 학생을 불러올 수 없습니다')
      }
      return result.data
    },
    staleTime: 30_000, // 30초
  })
}
