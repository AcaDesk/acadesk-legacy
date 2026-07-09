'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import {
  deleteConsultation,
  createConsultationNote,
  updateConsultationNote,
  deleteConsultationNote,
  addConsultationParticipant,
  removeConsultationParticipant,
  bulkDeleteConsultations,
  bulkUpdateConductor,
} from '@/app/actions/consultations'
import { queryKeys } from '@/lib/query-keys'

export function useDeleteConsultationMutation() {
  const { toast } = useToast()
  const router = useRouter()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteConsultation(id)
      if (!result.success) throw new Error(result.error || '상담 삭제 실패')
    },
    onSuccess: () => {
      toast({ title: '삭제 완료', description: '상담 기록이 삭제되었습니다.' })
      router.push('/consultations')
    },
    onError: (error: Error) => {
      toast({
        title: '삭제 오류',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useSaveNoteMutation(callbacks: {
  onSuccess: (noteId: string, content: string, category: string) => void
}) {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      noteId,
      content,
      category,
    }: {
      noteId: string
      content: string
      category: string
    }) => {
      const result = await updateConsultationNote({
        id: noteId,
        content,
        category: category || null,
      })
      if (!result.success || !result.data) throw new Error(result.error || '노트 수정 실패')
      return result.data
    },
    onSuccess: (_, { noteId, content, category }) => {
      toast({ title: '수정 완료', description: '노트가 수정되었습니다.' })
      callbacks.onSuccess(noteId, content, category)
    },
    onError: (error: Error) => {
      toast({ title: '저장 오류', description: error.message, variant: 'destructive' })
    },
  })
}

export function useAddNoteMutation(callbacks: {
  onSuccess: (note: {
    id: string
    note_order: number
    category: string | null
    content: string
    created_at: string
  }) => void
}) {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      consultationId,
      content,
      category,
      noteOrder,
    }: {
      consultationId: string
      content: string
      category: string
      noteOrder: number
    }) => {
      const result = await createConsultationNote({
        consultationId,
        content,
        category: category || undefined,
        noteOrder,
      })
      if (!result.success || !result.data) throw new Error(result.error || '노트 생성 실패')
      return result.data
    },
    onSuccess: (data) => {
      toast({ title: '저장 완료', description: '노트가 추가되었습니다.' })
      callbacks.onSuccess({
        id: data.id,
        note_order: data.note_order,
        category: data.category,
        content: data.content,
        created_at: data.created_at,
      })
    },
    onError: (error: Error) => {
      toast({ title: '저장 오류', description: error.message, variant: 'destructive' })
    },
  })
}

export function useDeleteNoteMutation(callbacks: {
  onSuccess: (noteId: string) => void
}) {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (noteId: string) => {
      const result = await deleteConsultationNote(noteId)
      if (!result.success) throw new Error(result.error || '노트 삭제 실패')
    },
    onSuccess: (_, noteId) => {
      toast({ title: '삭제 완료', description: '노트가 삭제되었습니다.' })
      callbacks.onSuccess(noteId)
    },
    onError: (error: Error) => {
      toast({ title: '삭제 오류', description: error.message, variant: 'destructive' })
    },
  })
}

export function useAddParticipantMutation(callbacks: {
  onSuccess: (participant: {
    id: string
    participant_type: string
    user_id: string | null
    guardian_id: string | null
    name: string | null
    role: string | null
  }) => void
}) {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      consultationId,
      participantType,
      name,
      role,
    }: {
      consultationId: string
      participantType: 'instructor' | 'guardian' | 'student' | 'other'
      name: string
      role?: string
    }) => {
      const result = await addConsultationParticipant({ consultationId, participantType, name, role })
      if (!result.success || !result.data) throw new Error(result.error || '참석자 추가 실패')
      return result.data
    },
    onSuccess: (data) => {
      toast({ title: '추가 완료', description: '참석자가 추가되었습니다.' })
      callbacks.onSuccess({
        id: data.id,
        participant_type: data.participant_type,
        user_id: data.user_id,
        guardian_id: data.guardian_id,
        name: data.name,
        role: data.role,
      })
    },
    onError: (error: Error) => {
      toast({ title: '추가 오류', description: error.message, variant: 'destructive' })
    },
  })
}

export function useBulkDeleteConsultationsMutation(callbacks?: { onSuccess?: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const result = await bulkDeleteConsultations(ids)
      if (!result.success) throw new Error(result.error || '삭제 실패')
      return ids.length
    },
    onSuccess: (count) => {
      toast({ title: `${count}건 삭제 완료` })
      callbacks?.onSuccess?.()
    },
    onError: (error: Error) => {
      toast({ title: '삭제 실패', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all() })
    },
  })
}

export function useBulkUpdateConductorMutation(callbacks?: { onSuccess?: () => void }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, conductorId }: { ids: string[]; conductorId: string }) => {
      const result = await bulkUpdateConductor(ids, conductorId)
      if (!result.success) throw new Error(result.error || '변경 실패')
      return ids.length
    },
    onSuccess: (count) => {
      toast({ title: `${count}건 진행자 변경 완료` })
      callbacks?.onSuccess?.()
    },
    onError: (error: Error) => {
      toast({ title: '변경 실패', description: error.message, variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all() })
    },
  })
}

export function useRemoveParticipantMutation(callbacks: {
  onSuccess: (participantId: string) => void
}) {
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (participantId: string) => {
      const result = await removeConsultationParticipant(participantId)
      if (!result.success) throw new Error(result.error || '참석자 제거 실패')
    },
    onSuccess: (_, participantId) => {
      toast({ title: '제거 완료', description: '참석자가 제거되었습니다.' })
      callbacks.onSuccess(participantId)
    },
    onError: (error: Error) => {
      toast({ title: '제거 오류', description: error.message, variant: 'destructive' })
    },
  })
}
