'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import {
  createInvoicesBulk,
  recordPayment,
  deleteInvoice,
  sendPaymentReminders,
  type CreateInvoicesInput,
  type RecordPaymentInput,
} from '@/app/actions/payments/mutations'
import { queryKeys } from '@/lib/query-keys'

export function useCreateInvoicesMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateInvoicesInput) => {
      const result = await createInvoicesBulk(input)
      if (!result.success || !result.data) {
        throw new Error(result.error || '청구서 생성 실패')
      }
      return result.data
    },
    onSuccess: (data) => {
      const parts = [`${data.created}건 생성`]
      if (data.skippedExisting > 0) parts.push(`${data.skippedExisting}건 중복 제외`)
      if (data.failed > 0) parts.push(`${data.failed}건 실패`)
      toast({ title: '청구서 생성 완료', description: parts.join(', ') })
    },
    onError: (error: Error) =>
      toast({ variant: 'destructive', title: '청구서 생성 오류', description: error.message }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() }),
  })
}

export function useRecordPaymentMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RecordPaymentInput) => {
      const result = await recordPayment(input)
      if (!result.success || !result.data) {
        throw new Error(result.error || '수납 처리 실패')
      }
      return result.data
    },
    onSuccess: (data) => {
      toast({
        title: '수납 처리 완료',
        description: data.status === 'paid' ? '완납 처리되었습니다.' : '부분 수납이 기록되었습니다.',
      })
    },
    onError: (error: Error) =>
      toast({ variant: 'destructive', title: '수납 처리 오류', description: error.message }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() }),
  })
}

export function useDeleteInvoiceMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const result = await deleteInvoice(invoiceId)
      if (!result.success) throw new Error(result.error || '청구서 삭제 실패')
    },
    onSuccess: () => toast({ title: '청구서 삭제 완료' }),
    onError: (error: Error) =>
      toast({ variant: 'destructive', title: '청구서 삭제 오류', description: error.message }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() }),
  })
}

export function useSendRemindersMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      const result = await sendPaymentReminders(invoiceIds)
      if (!result.success || !result.data) {
        throw new Error(result.error || '미납 안내 발송 실패')
      }
      return result.data
    },
    onSuccess: (data) =>
      toast({ title: '미납 안내 발송 완료', description: `${data.sent}건 발송되었습니다.` }),
    onError: (error: Error) =>
      toast({ variant: 'destructive', title: '미납 안내 발송 오류', description: error.message }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.payments.all() }),
  })
}
