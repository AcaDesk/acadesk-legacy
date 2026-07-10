'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/query-keys'
import type { StudentTodoWithStudent } from '@/core/types/todo.types'

/**
 * 검증 대기 과제 목록 (완료됐지만 미검증)
 *
 * 클라이언트 Supabase(RLS 적용)로 조회 — 프레젠테이션용 복합 조인.
 */
export function usePendingTodosQuery(tenantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.todos.pendingVerification(),
    queryFn: async (): Promise<StudentTodoWithStudent[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('todos')
        .select(`
          *,
          students (
            id,
            student_code,
            users (
              name
            )
          )
        `)
        .eq('tenant_id', tenantId!)
        .not('completed_at', 'is', null)
        .is('verified_at', null)
        .is('deleted_at', null)
        .order('completed_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as StudentTodoWithStudent[]
    },
    enabled: !!tenantId,
  })
}
