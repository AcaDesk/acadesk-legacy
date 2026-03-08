'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { waiveRetest, postponeRetest, createRetestExam } from '@/app/actions/grades/retests'
import { queryKeys } from '@/lib/query-keys'

export function useWaiveRetestMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ examScoreId }: { examScoreId: string; studentName: string }) => {
      const result = await waiveRetest(examScoreId)
      if (!result.success) throw new Error(result.error || '재시험 면제 실패')
    },
    onSuccess: (_, { studentName }) => {
      toast({
        title: '재시험 면제 완료',
        description: `${studentName} 학생의 재시험이 면제되었습니다.`,
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.grades.retests() })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '재시험 면제 실패',
        description: error.message,
      })
    },
  })
}

export function usePostponeRetestMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ examScoreId }: { examScoreId: string; studentName: string }) => {
      const result = await postponeRetest(examScoreId)
      if (!result.success) throw new Error(result.error || '재시험 연기 실패')
    },
    onSuccess: (_, { studentName }) => {
      toast({
        title: '재시험 연기 완료',
        description: `${studentName} 학생의 재시험이 연기되었습니다.`,
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.grades.retests() })
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '재시험 연기 실패',
        description: error.message,
      })
    },
  })
}

export function useCreateRetestMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async ({
      examId,
      studentIds,
      retestDate,
    }: {
      examId: string
      studentIds: string[]
      retestDate: string
      selectedCount: number
    }) => {
      const result = await createRetestExam(examId, studentIds, retestDate)
      if (!result.success || !result.data) throw new Error(result.error || '재시험 생성 실패')
      return result.data
    },
    onSuccess: (data, { selectedCount }) => {
      toast({
        title: '재시험 생성 완료',
        description: `${selectedCount}명의 학생이 재시험에 배정되었습니다.`,
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.grades.retests() })
      router.push(`/grades/exams/${data.retestExamId}`)
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '재시험 생성 실패',
        description: error.message,
      })
    },
  })
}
