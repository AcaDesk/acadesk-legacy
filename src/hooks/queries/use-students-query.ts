'use client'

import { useQuery } from '@tanstack/react-query'
import { getStudents, getStudentsListEnriched } from '@/app/actions/students/queries'
import { queryKeys } from '@/lib/query-keys'

/**
 * 학생 목록 페이지 전용: 전체 학생 + 부가 데이터를 한 번에 가져옵니다.
 *
 * 검색/필터/정렬/페이지네이션은 컴포넌트에서 인메모리로 처리하세요.
 * 서버 측 unstable_cache(5분 TTL) + React Query staleTime(5분)으로 이중 캐시됩니다.
 *
 * 무효화: 학생/보호자/반 mutation 시 자동 (서버 캐시).
 * React Query 측은 mutation 후 `queryClient.invalidateQueries({ queryKey: queryKeys.students.all() })`로 트리거하세요.
 */
export function useStudentsEnrichedQuery() {
  return useQuery({
    queryKey: queryKeys.students.enriched(),
    queryFn: async () => {
      const result = await getStudentsListEnriched()
      if (!result.success) {
        throw new Error(result.error || '학생 목록을 불러올 수 없습니다')
      }
      return result.data
    },
    staleTime: 5 * 60_000,
  })
}

/**
 * 기본 학생 목록 (id, 이름, 학생 코드 등) — 선택기/플래너 등 가벼운 용도.
 */
export function useStudentsBasicQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.students.list({ view: 'basic' }),
    queryFn: async () => {
      const result = await getStudents()
      if (!result.success || !result.data) {
        throw new Error(result.error || '학생 목록을 불러올 수 없습니다')
      }
      return result.data
    },
    staleTime: 5 * 60_000,
    enabled,
  })
}
