'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  provisionAllSharedTemplates,
  refreshAllSubscriptionStatuses,
  toggleEventSubscription,
  retryProvision,
  type BulkProvisionResult,
} from '@/app/actions/messaging/event-subscriptions'
import { sendTestAlimtalk } from '@/app/actions/messaging/messages'
import { useToast } from '@/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'

export function useProvisionAllTemplatesMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<BulkProvisionResult[]> => {
      const result = await provisionAllSharedTemplates()
      if (!result.success) throw new Error(result.error || '템플릿 자동 등록 실패')
      return result.data
    },
    onSuccess: (results) => {
      const failed = results.filter((r) => r.status === 'failed').length
      const inspecting = results.filter((r) => r.status === 'inspecting').length
      const approved = results.filter((r) => r.status === 'approved').length

      if (failed === 0) {
        toast({
          title: '템플릿 등록 요청 완료',
          description: `검수 중 ${inspecting}건, 승인됨 ${approved}건. 카카오 검수가 완료되면 자동으로 갱신됩니다.`,
        })
      } else {
        toast({
          variant: 'destructive',
          title: '일부 템플릿 등록 실패',
          description: `실패 ${failed}건, 검수 중 ${inspecting}건, 승인됨 ${approved}건.`,
        })
      }
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '공용 템플릿 등록 실패',
        description: (
          <div className="space-y-2">
            <p>{error.message}</p>
            <div className="text-xs opacity-80">
              <p className="font-medium">확인해보세요</p>
              <ul className="list-disc list-inside space-y-0.5 mt-1">
                <li>메시징 연동 탭에서 Solapi API 키가 인증되었는지</li>
                <li>카카오 채널 연동 상태가 &ldquo;연동됨&rdquo;인지</li>
                <li>Solapi 콘솔에서 API Key 역할에 &ldquo;메시지/카카오 알림톡&rdquo;이 활성화되어 있는지</li>
                <li>
                  반복되면 <a href="mailto:support@acadesk.com" className="underline">support@acadesk.com</a> 으로 문의
                </li>
              </ul>
            </div>
          </div>
        ),
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventSubscriptions.all() })
    },
  })
}

export function useRefreshAllStatusesMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await refreshAllSubscriptionStatuses()
      if (!result.success) throw new Error(result.error || '상태 갱신 실패')
      return result.data
    },
    onSuccess: ({ refreshed, pending }) => {
      toast({
        title: '검수 상태 갱신',
        description:
          refreshed === 0
            ? '갱신할 항목이 없습니다.'
            : `${refreshed}건 갱신, ${pending}건은 아직 검수 중입니다.`,
      })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '갱신 오류', description: error.message })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventSubscriptions.all() })
    },
  })
}

export function useToggleEventSubscriptionMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventType, enabled }: { eventType: string; enabled: boolean }) => {
      const result = await toggleEventSubscription(eventType, enabled)
      if (!result.success) throw new Error(result.error || '활성화 상태 변경 실패')
    },
    onSuccess: () => {
      toast({ title: '저장됨', description: '이벤트 구독 상태가 변경되었습니다.' })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '변경 실패', description: error.message })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventSubscriptions.all() })
    },
  })
}

export function useRetryProvisionMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventType: string) => {
      const result = await retryProvision(eventType)
      if (!result.success) throw new Error(result.error || '재등록 실패')
    },
    onSuccess: () => {
      toast({ title: '재등록 요청 완료', description: '템플릿을 다시 등록했습니다.' })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '재등록 실패',
        description: (
          <div className="space-y-2">
            <p>{error.message}</p>
            <p className="text-xs opacity-80">
              메시징 연동 → Solapi 인증 상태와 카카오 채널 연동 상태를 먼저 확인해주세요.
              반복되면 <a href="mailto:support@acadesk.com" className="underline">support@acadesk.com</a> 으로 문의 부탁드립니다.
            </p>
          </div>
        ),
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.eventSubscriptions.all() })
    },
  })
}

export function useSendTestAlimtalkMutation() {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: { phoneNumber: string; eventType: string }) => {
      const result = await sendTestAlimtalk(input)
      if (!result.success) throw new Error(result.error || '테스트 발송 실패')
      return result.data
    },
    onSuccess: () => {
      toast({
        title: '테스트 알림톡 발송됨',
        description: '입력하신 번호로 테스트 메시지를 발송했습니다.',
      })
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '발송 실패', description: error.message })
    },
  })
}
