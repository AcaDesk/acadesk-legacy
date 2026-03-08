'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { getGuardiansWithDetails, deleteGuardian, bulkDeleteGuardians } from '@/app/actions/guardians'
import { queryKeys } from '@/lib/query-keys'
import type { Guardian } from '@/components/features/guardians/guardian-table-improved'

interface GuardianDetailRow {
  guardian: { id: string; relationship: string | null }
  userName: string | null
  userEmail: string | null
  userPhone: string | null
  students: Array<{
    id: string
    studentCode: string
    name: string
    relation: string
    isPrimary: boolean
  }>
}

function formatGuardians(data: GuardianDetailRow[]): Guardian[] {
  return data.map((item) => ({
    id: item.guardian.id,
    relationship: item.guardian.relationship,
    users: item.userName
      ? { name: item.userName, email: item.userEmail, phone: item.userPhone }
      : null,
    guardian_students: item.students.map((student) => ({
      relationship: student.relation || '',
      is_primary: student.isPrimary || false,
      students: {
        id: student.id,
        student_code: student.studentCode,
        users: { name: student.name },
      },
    })),
  }))
}

export function useGuardiansQuery() {
  return useQuery({
    queryKey: queryKeys.guardians.list(),
    queryFn: async () => {
      const result = await getGuardiansWithDetails()
      if (!result.success || !result.data) {
        throw new Error(result.error || '보호자 목록을 불러올 수 없습니다')
      }
      return formatGuardians(result.data)
    },
    staleTime: 60_000, // 1분
  })
}

export function useDeleteGuardianMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteGuardian(id)
      if (!result.success) throw new Error(result.error || '보호자 삭제 실패')
    },
    onMutate: async (id) => {
      // 낙관적 업데이트: 즉시 목록에서 제거
      await queryClient.cancelQueries({ queryKey: queryKeys.guardians.list() })
      const previous = queryClient.getQueryData<Guardian[]>(queryKeys.guardians.list())
      queryClient.setQueryData<Guardian[]>(queryKeys.guardians.list(), (old) =>
        old?.filter((g) => g.id !== id) ?? []
      )
      return { previous }
    },
    onError: (error: Error, _id, context) => {
      // 실패 시 롤백
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.guardians.list(), context.previous)
      }
      toast({ title: '삭제 오류', description: error.message, variant: 'destructive' })
    },
    onSuccess: (_data, _id, _context) => {
      toast({ title: '삭제 완료', description: '보호자가 삭제되었습니다.' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians.all() })
    },
  })
}

export function useBulkDeleteGuardiansMutation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const result = await bulkDeleteGuardians(ids)
      if (!result.success) throw new Error(result.error || '일괄 삭제 실패')
      return result.data
    },
    onMutate: async (ids) => {
      // 낙관적 업데이트: 즉시 목록에서 제거
      await queryClient.cancelQueries({ queryKey: queryKeys.guardians.list() })
      const previous = queryClient.getQueryData<Guardian[]>(queryKeys.guardians.list())
      const idSet = new Set(ids)
      queryClient.setQueryData<Guardian[]>(queryKeys.guardians.list(), (old) =>
        old?.filter((g) => !idSet.has(g.id)) ?? []
      )
      return { previous }
    },
    onError: (error: Error, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.guardians.list(), context.previous)
      }
      toast({ title: '일괄 삭제 오류', description: error.message, variant: 'destructive' })
    },
    onSuccess: (data, ids) => {
      toast({
        title: '일괄 삭제 완료',
        description: `${data?.deletedCount ?? ids.length}명의 보호자가 삭제되었습니다.`,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians.all() })
    },
  })
}
