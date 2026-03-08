'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getStudents, getStudentFilterOptions } from '@/app/actions/students'
import { queryKeys } from '@/lib/query-keys'

export interface StudentFilters {
  grade?: string
  classId?: string
  school?: string
  commuteMethod?: string
  marketingSource?: string
  enrollmentDateFrom?: string
  enrollmentDateTo?: string
  search?: string
  page: number
  pageSize: number
}

export function useStudentsQuery(filters: StudentFilters) {
  return useQuery({
    queryKey: queryKeys.students.list(filters as unknown as Record<string, unknown>),
    queryFn: async () => {
      const result = await getStudents({
        grade: filters.grade,
        classId: filters.classId,
        school: filters.school,
        commuteMethod: filters.commuteMethod,
        marketingSource: filters.marketingSource,
        enrollmentDateFrom: filters.enrollmentDateFrom,
        enrollmentDateTo: filters.enrollmentDateTo,
        search: filters.search,
        page: filters.page,
        pageSize: filters.pageSize,
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || '학생 목록을 불러올 수 없습니다')
      }
      return {
        data: result.data,
        totalCount: result.totalCount ?? result.data.length,
        page: result.page ?? filters.page,
        pageSize: result.pageSize ?? filters.pageSize,
      }
    },
    placeholderData: keepPreviousData, // 페이지 이동 시 이전 데이터 유지 (깜빡임 방지)
    staleTime: 30_000,
  })
}

export function useStudentFilterOptionsQuery() {
  return useQuery({
    queryKey: queryKeys.students.filterOptions(),
    queryFn: async () => {
      const result = await getStudentFilterOptions()
      if (!result.success || !result.data) {
        throw new Error(result.error || '필터 옵션을 불러올 수 없습니다')
      }
      return result.data
    },
    staleTime: 5 * 60_000, // 5분 (필터 옵션은 자주 변경되지 않음)
  })
}
