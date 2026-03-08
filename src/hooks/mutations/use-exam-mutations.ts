'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { deleteExam, bulkDeleteExams, archiveExam, unarchiveExam } from '@/app/actions/grades/exams'
import { queryKeys } from '@/lib/query-keys'

export function useDeleteExamMutation(callbacks?: {
  onMutate?: (id: string) => void
  onRollback?: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const result = await deleteExam(id)
      if (!result.success) throw new Error(result.error || '시험 삭제에 실패했습니다')
    },
    onMutate: ({ id }) => {
      callbacks?.onMutate?.(id)
    },
    onSuccess: (_, { name }) => {
      toast({ title: '삭제 완료', description: `${name} 시험이 삭제되었습니다.` })
      router.refresh()
      queryClient.invalidateQueries({ queryKey: queryKeys.grades.exams() })
    },
    onError: (error: Error) => {
      callbacks?.onRollback?.()
      toast({ title: '삭제 오류', description: error.message, variant: 'destructive' })
    },
  })
}

export function useBulkDeleteExamsMutation(callbacks?: {
  onMutate?: (ids: string[]) => void
  onRollback?: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const result = await bulkDeleteExams(ids)
      if (!result.success) throw new Error(result.error || '일괄 삭제 실패')
      return result.data
    },
    onMutate: (ids) => {
      callbacks?.onMutate?.(ids)
    },
    onSuccess: (data, ids) => {
      toast({
        title: '일괄 삭제 완료',
        description: `${data?.deletedCount ?? ids.length}개의 시험이 삭제되었습니다.`,
      })
      router.refresh()
      queryClient.invalidateQueries({ queryKey: queryKeys.grades.exams() })
    },
    onError: (error: Error) => {
      callbacks?.onRollback?.()
      toast({ title: '일괄 삭제 실패', description: '시험 삭제 중 오류가 발생했습니다.', variant: 'destructive' })
      console.error('[bulkDelete] Error:', error)
    },
  })
}

export function useArchiveExamMutation(callbacks?: {
  onMutate?: (id: string, archive: boolean) => void
  onRollback?: () => void
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async ({ id, isArchived, name }: { id: string; isArchived: boolean; name: string }) => {
      const result = isArchived ? await unarchiveExam(id) : await archiveExam(id)
      if (!result.success) throw new Error(result.error || '상태 변경 실패')
      return { isArchived }
    },
    onMutate: ({ id, isArchived }) => {
      // isArchived=true → 복구하므로 archive=false, isArchived=false → 아카이브하므로 archive=true
      callbacks?.onMutate?.(id, !isArchived)
    },
    onSuccess: (data, { name }) => {
      const isArchived = data.isArchived
      toast({
        title: isArchived ? '시험 복구 완료' : '시험 아카이브 완료',
        description: isArchived
          ? `"${name}" 시험이 다시 기본 목록에 표시됩니다.`
          : `"${name}" 시험이 기본 목록에서 숨김 처리되었습니다.`,
      })
      router.refresh()
      queryClient.invalidateQueries({ queryKey: queryKeys.grades.exams() })
    },
    onError: (error: Error) => {
      callbacks?.onRollback?.()
      toast({ title: '처리 오류', description: error.message, variant: 'destructive' })
    },
  })
}
