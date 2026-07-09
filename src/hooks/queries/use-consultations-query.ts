'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getConsultations, getConsultationPageMeta } from '@/app/actions/consultations'
import { queryKeys } from '@/lib/query-keys'

export type ConsultationListItem = {
  id: string
  is_lead: boolean
  student_id: string | null
  lead_name: string | null
  lead_guardian_name: string | null
  lead_guardian_phone: string | null
  converted_to_student_id: string | null
  converted_at: string | null
  consultation_date: string
  consultation_type: string
  title: string
  summary: string | null
  outcome: string | null
  follow_up_required: boolean
  next_consultation_date: string | null
  students?: { name: string }
  users?: { name: string }
}

export type ConsultationStats = {
  total: number
  lead: number
  student: number
  converted: number
}

export type ConsultationFilterOptions = {
  conductors: Array<{ id: string; name: string }>
}

export interface ConsultationListFilters {
  page: number
  pageSize: number
  tab: 'all' | 'lead' | 'student'
  type: string
  conductor: string
  followUp: string
  startDate?: string
  endDate?: string
  search: string
}

export interface ConsultationListResult {
  consultations: ConsultationListItem[]
  totalCount: number
}

export function useConsultationsQuery(
  filters: ConsultationListFilters,
  initialData?: ConsultationListResult
) {
  return useQuery({
    queryKey: queryKeys.consultations.list({ ...filters }),
    queryFn: async (): Promise<ConsultationListResult> => {
      const result = await getConsultations({
        page: filters.page,
        pageSize: filters.pageSize,
        isLead: filters.tab === 'all' ? undefined : filters.tab === 'lead',
        consultationType: filters.type !== 'all' ? filters.type : undefined,
        conductedBy: filters.conductor !== 'all' ? filters.conductor : undefined,
        followUpOnly: filters.followUp === 'required' ? true : undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
        searchTerm: filters.search.trim() || undefined,
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || '상담 목록 로드 실패')
      }
      return {
        consultations: result.data as ConsultationListItem[],
        totalCount: result.totalCount,
      }
    },
    placeholderData: keepPreviousData,
    initialData,
  })
}

export interface ConsultationPageMeta {
  stats: ConsultationStats
  filterOptions: ConsultationFilterOptions
  upcomingFollowUps: ConsultationListItem[]
}

export function useConsultationPageMetaQuery(initialData?: ConsultationPageMeta) {
  return useQuery({
    queryKey: queryKeys.consultations.pageMeta(),
    queryFn: async (): Promise<ConsultationPageMeta> => {
      const result = await getConsultationPageMeta(7)
      if (!result.success || !result.data) {
        throw new Error(result.error || '상담 페이지 메타 로드 실패')
      }
      return {
        stats: result.data.stats,
        filterOptions: result.data.filterOptions,
        upcomingFollowUps: result.data.upcomingFollowUps as ConsultationListItem[],
      }
    },
    initialData,
  })
}
