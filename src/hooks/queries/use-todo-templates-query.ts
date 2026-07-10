'use client'

import { useQuery } from '@tanstack/react-query'
import { getTodoTemplates, getTodoTemplateById } from '@/app/actions/todo-templates'
import { queryKeys } from '@/lib/query-keys'

export function useTodoTemplatesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.todos.templates(),
    queryFn: async () => {
      const result = await getTodoTemplates()
      if (!result.success || !result.data) {
        throw new Error(result.error || '템플릿 목록을 불러올 수 없습니다')
      }
      return result.data
    },
    enabled,
  })
}

export function useTodoTemplateQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.todos.template(id ?? ''),
    queryFn: async () => {
      const result = await getTodoTemplateById(id!)
      if (!result.success || !result.data) {
        throw new Error(result.error || '템플릿을 불러올 수 없습니다')
      }
      return result.data
    },
    enabled: !!id,
  })
}
