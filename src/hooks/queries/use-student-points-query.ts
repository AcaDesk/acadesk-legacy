'use client'

import { useQuery } from '@tanstack/react-query'
import {
  getStudentPointBalance,
  getStudentPointHistory,
  getPointTypes,
} from '@/app/actions/student-points'
import { queryKeys } from '@/lib/query-keys'

export function useStudentPointBalanceQuery(studentId: string) {
  return useQuery({
    queryKey: queryKeys.points.balance(studentId),
    queryFn: async () => {
      const result = await getStudentPointBalance(studentId)
      if (!result.success) throw new Error(result.error || '잔액 조회 실패')
      return result.data ?? 0
    },
    enabled: !!studentId,
  })
}

export function useStudentPointHistoryQuery(studentId: string, limit = 20) {
  return useQuery({
    queryKey: queryKeys.points.history(studentId),
    queryFn: async () => {
      const result = await getStudentPointHistory(studentId, limit)
      if (!result.success) throw new Error(result.error || '이력 조회 실패')
      return result.data ?? []
    },
    enabled: !!studentId,
  })
}

export function usePointTypesQuery() {
  return useQuery({
    queryKey: queryKeys.points.types(),
    queryFn: async () => {
      const result = await getPointTypes()
      if (!result.success) throw new Error(result.error || '유형 조회 실패')
      return result.data ?? []
    },
    staleTime: 1000 * 60 * 60, // reference data — cache 1h
  })
}
