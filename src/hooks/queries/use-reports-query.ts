'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getReports } from '@/app/actions/reports/queries'
import { queryKeys } from '@/lib/query-keys'
import type { ReportWithStudent } from '@/core/types/report.types'

export type ReportPeriod = 'this_month' | 'last_month' | 'last_3_months' | 'all'

export interface ReportListFilters {
  studentId: string
  reportType: string
  period: ReportPeriod
}

export function useReportsQuery(filters: ReportListFilters, initialData?: ReportWithStudent[]) {
  return useQuery({
    queryKey: queryKeys.reports.list({ ...filters }),
    queryFn: async (): Promise<ReportWithStudent[]> => {
      const result = await getReports({
        studentId: filters.studentId !== 'all' ? filters.studentId : undefined,
        reportType: filters.reportType !== 'all' ? filters.reportType : undefined,
        period: filters.period,
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || '리포트를 불러오는 중 오류가 발생했습니다.')
      }
      return result.data
    },
    placeholderData: keepPreviousData,
    initialData,
  })
}
