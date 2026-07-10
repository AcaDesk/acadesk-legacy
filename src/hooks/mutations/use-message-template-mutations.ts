'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import {
  createMessageTemplate,
  updateMessageTemplate,
  deleteMessageTemplate,
  createDefaultTemplates,
} from '@/app/actions/messaging/messages'
import { queryKeys } from '@/lib/query-keys'

type TemplateFormData = Parameters<typeof createMessageTemplate>[0]

export function useSaveMessageTemplateMutation(callbacks?: { onSuccess?: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: TemplateFormData }) => {
      const result = id ? await updateMessageTemplate(id, data) : await createMessageTemplate(data)
      if (!result.success) throw new Error(result.error || '템플릿 저장 실패')
    },
    onSuccess: (_data, variables) => {
      toast({
        title: variables.id ? '템플릿 수정 완료' : '템플릿 생성 완료',
        description: `${variables.data.name} 템플릿이 저장되었습니다.`,
      })
      callbacks?.onSuccess?.()
    },
    onError: (error: Error) => {
      toast({ title: '저장 오류', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messaging.templates() })
    },
  })
}

export function useDeleteMessageTemplateMutation(callbacks?: { onSettled?: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const result = await deleteMessageTemplate(id)
      if (!result.success) throw new Error(result.error || '템플릿 삭제 실패')
    },
    onSuccess: (_data, variables) => {
      toast({
        title: '템플릿 삭제 완료',
        description: `${variables.name} 템플릿이 삭제되었습니다.`,
      })
    },
    onError: (error: Error) => {
      toast({ title: '삭제 오류', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messaging.templates() })
      callbacks?.onSettled?.()
    },
  })
}

export function useCreateDefaultTemplatesMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await createDefaultTemplates()
      if (!result.success) throw new Error(result.error || '기본 템플릿 생성 실패')
      return result
    },
    onSuccess: () => {
      toast({ title: '기본 템플릿 생성 완료', description: '6개의 샘플 템플릿이 추가되었습니다.' })
    },
    onError: (error: Error) => {
      toast({ title: '생성 오류', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.messaging.templates() })
    },
  })
}
