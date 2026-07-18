'use client'

/**
 * 리포트 코멘트 AI 초안 생성 훅
 *
 * 캐시 무효화가 필요 없는 일회성 생성 액션이므로 invalidateQueries 없이
 * 성공 시 콜백으로 초안을 전달한다.
 */

import { useMutation, useQuery } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import {
  generateAiCommentDraft,
  isAiCommentAvailable,
  type AiCommentInput,
  type AiCommentDraft,
} from '@/app/actions/reports/ai-comment'

/** ANTHROPIC_API_KEY 설정 여부 — AI 초안 버튼 노출 판단 */
export function useAiCommentAvailableQuery(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.reports.aiAvailable(),
    queryFn: async () => {
      const result = await isAiCommentAvailable()
      return result.success ? result.data : false
    },
    enabled,
    staleTime: 60 * 60 * 1000,
  })
}

export function useGenerateAiCommentMutation(
  onDraft: (draft: AiCommentDraft) => void
) {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: AiCommentInput) => {
      const result = await generateAiCommentDraft(input)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'AI 초안 생성에 실패했습니다')
      }
      return result.data
    },
    onSuccess: (draft) => {
      onDraft(draft)
      toast({
        title: 'AI 초안이 생성되었습니다',
        description: '내용을 검토하고 필요한 부분을 수정해주세요.',
      })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'AI 초안 생성 오류',
        description: error.message,
      })
    },
  })
}
