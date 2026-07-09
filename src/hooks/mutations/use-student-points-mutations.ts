'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import {
  awardStudentPoints,
  deleteStudentPoint,
  type AwardPointInput,
} from '@/app/actions/student-points'
import { queryKeys } from '@/lib/query-keys'

function invalidatePoints(queryClient: ReturnType<typeof useQueryClient>, studentId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.points.balance(studentId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.points.history(studentId) })
}

export function useAwardStudentPointsMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AwardPointInput) => {
      const result = await awardStudentPoints(input)
      if (!result.success) throw new Error(result.error || '상벌점 부여 실패')
    },
    onSuccess: () => toast({ title: '상벌점이 부여되었습니다' }),
    onError: (error: Error) =>
      toast({ variant: 'destructive', title: '상벌점 부여 오류', description: error.message }),
    onSettled: (_data, _error, variables) => invalidatePoints(queryClient, variables.studentId),
  })
}

export function useDeleteStudentPointMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pointId, studentId }: { pointId: string; studentId: string }) => {
      const result = await deleteStudentPoint(pointId, studentId)
      if (!result.success) throw new Error(result.error || '상벌점 삭제 실패')
    },
    onSuccess: () => toast({ title: '상벌점 기록이 삭제되었습니다' }),
    onError: (error: Error) =>
      toast({ variant: 'destructive', title: '상벌점 삭제 오류', description: error.message }),
    onSettled: (_data, _error, variables) => invalidatePoints(queryClient, variables.studentId),
  })
}
