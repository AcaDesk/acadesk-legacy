'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { verifyTodoAction, deleteTodoAction } from '@/app/(dashboard)/todos/actions'
import { sendTodoReminder } from '@/app/actions/messaging/messages'

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
