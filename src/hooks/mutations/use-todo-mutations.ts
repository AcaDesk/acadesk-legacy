'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { verifyTodoAction, deleteTodoAction } from '@/app/(dashboard)/todos/actions'
import { sendTodoReminder } from '@/app/actions/messaging/messages'
import { verifyTodos, rejectTodo } from '@/app/actions/todos'
import { deleteTodoTemplate, toggleTodoTemplateActive, updateTodoTemplate } from '@/app/actions/todo-templates'
import { queryKeys } from '@/lib/query-keys'

export function useVerifyTodoMutation() {
  const { toast } = useToast()
  const router = useRouter()

  return useMutation({
    mutationFn: async (todoId: string) => {
      const result = await verifyTodoAction(todoId)
      if (!result.success) throw new Error(result.error || '검증 실패')
    },
    onSuccess: () => {
      toast({ title: '검증 완료', description: 'TODO가 검증되었습니다.' })
      router.refresh()
    },
    onError: (error: Error) => {
      toast({ title: '검증 오류', description: error.message, variant: 'destructive' })
    },
  })
}

export function useDeleteTodoMutation() {
  const { toast } = useToast()
  const router = useRouter()

  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const result = await deleteTodoAction(id)
      if (!result.success) throw new Error(result.error || '삭제 실패')
    },
    onSuccess: () => {
      toast({ title: '삭제 완료', description: 'TODO가 삭제되었습니다.' })
      router.refresh()
    },
    onError: (error: Error) => {
      toast({ title: '삭제 오류', description: error.message, variant: 'destructive' })
    },
  })
}

export function useVerifyTodosBulkMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (todoIds: string[]) => {
      const result = await verifyTodos({ todoIds })
      if (!result.success) throw new Error(result.error || '검증 실패')
      return result.data
    },
    onSuccess: (data) => {
      if (data && data.failedTodoIds.length > 0) {
        toast({
          title: '일부 검증 실패',
          description: `${data.verifiedCount}개 검증 완료, ${data.failedTodoIds.length}개 실패`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: '검증 완료',
          description: `${data?.verifiedCount || 0}개의 과제가 검증되었습니다.`,
        })
      }
    },
    onError: (error: Error) => {
      toast({ title: '검증 실패', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.pendingVerification() })
    },
  })
}

export function useRejectTodoMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ todoId, rejectionReason }: { todoId: string; rejectionReason: string }) => {
      const result = await rejectTodo({ todoId, rejectionReason })
      if (!result.success) throw new Error(result.error || '반려 실패')
    },
    onSuccess: () => {
      toast({
        title: '과제 반려',
        description: '과제가 반려되었습니다. 학생에게 피드백이 전달됩니다.',
      })
    },
    onError: (error: Error) => {
      toast({ title: '반려 실패', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.pendingVerification() })
    },
  })
}

export function useDeleteTodoTemplateMutation(callbacks?: { onSettled?: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; title: string }) => {
      const result = await deleteTodoTemplate(id)
      if (!result.success) throw new Error(result.error || '삭제 실패')
    },
    onSuccess: (_data, variables) => {
      toast({ title: '삭제 완료', description: `${variables.title} 템플릿이 삭제되었습니다.` })
    },
    onError: (error: Error) => {
      toast({ title: '삭제 오류', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.templates() })
      callbacks?.onSettled?.()
    },
  })
}

export function useToggleTodoTemplateActiveMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; title: string; active: boolean }) => {
      const result = await toggleTodoTemplateActive(id)
      if (!result.success) throw new Error(result.error || '변경 실패')
    },
    onSuccess: (_data, variables) => {
      toast({
        title: variables.active ? '비활성화됨' : '활성화됨',
        description: `"${variables.title}" 템플릿이 ${variables.active ? '비활성화' : '활성화'}되었습니다.`,
      })
    },
    onError: (error: Error) => {
      toast({ title: '변경 오류', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.templates() })
    },
  })
}

export function useUpdateTodoTemplateMutation(callbacks?: { onSuccess?: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Parameters<typeof updateTodoTemplate>[0]) => {
      const result = await updateTodoTemplate(input)
      if (!result.success) throw new Error(result.error || '템플릿 수정 실패')
      return input
    },
    onSuccess: (input) => {
      toast({ title: '템플릿 수정 완료', description: `${input.title} 템플릿이 수정되었습니다.` })
      callbacks?.onSuccess?.()
    },
    onError: (error: Error) => {
      toast({ title: '수정 오류', description: error.message, variant: 'destructive' })
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.templates() })
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.todos.template(variables.id) })
      }
    },
  })
}

export function useSendTodoReminderMutation() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id }: { id: string; name: string }) => {
      const result = await sendTodoReminder(id)
      if (!result.success) throw new Error(result.error || '알림 전송 중 오류가 발생했습니다.')
    },
    onSuccess: () => {
      toast({ title: '알림 전송 완료', description: '과제 알림이 학생에게 전송되었습니다.' })
    },
    onError: (error: Error) => {
      toast({ title: '전송 오류', description: error.message, variant: 'destructive' })
    },
  })
}
