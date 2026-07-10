'use client'

import { useQuery } from '@tanstack/react-query'
import { getStudentActivityLogs } from '@/app/actions/student-points'
import { queryKeys } from '@/lib/query-keys'

export function useStudentActivityLogsQuery(studentId: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.students.activityLogs(studentId, limit),
    queryFn: async () => {
      const result = await getStudentActivityLogs(studentId, limit)
      if (!result.success) {
        throw new Error(result.error || '활동 이력을 불러올 수 없습니다')
      }
      return result.data ?? []
    },
    enabled: !!studentId,
  })
}
