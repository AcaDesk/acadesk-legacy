'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import {
  createSubject,
  updateSubject,
  deleteSubject,
  type CreateSubjectInput,
  type UpdateSubjectInput,
} from '@/app/actions/subjects'
import { queryKeys } from '@/lib/query-keys'

export function useCreateSubjectMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSubjectInput) => {
      const result = await createSubject(input)
      if (!result.success) throw new Error(result.error || '과목 추가 실패')
      return result.data
    },
    onSuccess: (_data, variables) => {
      toast({
        title: '과목 추가 완료',
        description: `"${variables.name}" 과목이 추가되었습니다.`,
      })
    },
    onError: (error: Error) => {
      toast({ title: '과목 추가 실패', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all() })
    },
  })
}

export function useUpdateSubjectMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSubjectInput }) => {
      const result = await updateSubject(id, input)
      if (!result.success) throw new Error(result.error || '과목 수정 실패')
      return result.data
    },
    onSuccess: (_data, variables) => {
      toast({
        title: '과목 수정 완료',
        description: `"${variables.input.name}" 과목이 수정되었습니다.`,
      })
    },
    onError: (error: Error) => {
      toast({ title: '과목 수정 실패', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all() })
    },
  })
}

export function useDeleteSubjectMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const result = await deleteSubject(id)
      if (!result.success) throw new Error(result.error || '과목 삭제 실패')
    },
    onSuccess: (_data, variables) => {
      toast({
        title: '과목 삭제 완료',
        description: `"${variables.name}" 과목이 삭제되었습니다.`,
      })
    },
    onError: (error: Error) => {
      toast({ title: '과목 삭제 실패', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subjects.all() })
    },
  })
}
