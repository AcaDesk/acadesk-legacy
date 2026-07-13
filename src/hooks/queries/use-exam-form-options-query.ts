'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getSubjects } from '@/app/actions/subjects'
import { getClassesForExam } from '@/app/actions/grades/exams'
import { queryKeys } from '@/lib/query-keys'

export interface ExamCategory {
  code: string
  label: string
}

export interface ExamClassOption {
  id: string
  name: string
  subject: string | null
  active: boolean
}

export interface SubjectOption {
  id: string
  name: string
  code: string | null
  color: string
  active: boolean
}

/** 시험 분류 참조 코드 — 시험/템플릿 등록·수정 폼에서 공유 */
export function useExamCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.refCodes.examCategories(),
    queryFn: async (): Promise<ExamCategory[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('ref_exam_categories')
        .select('code, label')
        .eq('active', true)
        .order('sort_order')
      if (error) throw error
      return data
    },
    staleTime: 10 * 60_000,
  })
}

/** 시험에 연결 가능한 수업 목록 */
export function useClassesForExamQuery() {
  return useQuery({
    queryKey: queryKeys.classes.forExam(),
    queryFn: async (): Promise<ExamClassOption[]> => {
      const result = await getClassesForExam()
      if (!result.success || !result.data) {
        throw new Error(result.error || '수업 목록 조회 실패')
      }
      return result.data.map((c) => ({
        id: c.id,
        name: c.name,
        subject: c.subject ?? null,
        active: true,
      }))
    },
    staleTime: 5 * 60_000,
  })
}

/** 과목 목록 (통계 없는 기본 목록) */
export function useSubjectsListQuery() {
  return useQuery({
    queryKey: queryKeys.subjects.list(),
    queryFn: async (): Promise<SubjectOption[]> => {
      const result = await getSubjects()
      if (!result.success || !result.data) {
        throw new Error(result.error || '과목 목록 조회 실패')
      }
      return result.data
    },
    staleTime: 5 * 60_000,
  })
}
