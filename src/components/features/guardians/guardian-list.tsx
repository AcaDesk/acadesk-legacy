'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { GuardianTableImproved, type Guardian } from './guardian-table-improved'
import { getErrorMessage } from '@/lib/error-handlers'
import { getGuardiansWithDetails, deleteGuardian } from '@/app/actions/guardians'
import { ConfirmationDialog } from '@ui/confirmation-dialog'

export function GuardianList() {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [guardianToDelete, setGuardianToDelete] = useState<{ id: string; name: string } | null>(
    null
  )
  const [isDeleting, setIsDeleting] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    loadGuardians()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadGuardians() {
    try {
      setLoading(true)

      // Server Action을 통한 보호자 데이터 로드
      const result = await getGuardiansWithDetails()

      if (!result.success || !result.data) {
        throw new Error(result.error || '보호자 목록을 불러올 수 없습니다')
      }

      // GuardianWithDetails를 Guardian 형식으로 변환
      const formattedGuardians: Guardian[] = result.data.map((item) => ({
        id: item.guardian.id,
        relationship: item.guardian.relationship,
        users: item.userName
          ? {
              name: item.userName,
              email: item.userEmail,
              phone: item.userPhone,
            }
          : null,
        guardian_students: item.students.map((student) => ({
          relationship: student.relation || '',
          is_primary: student.isPrimary || false,
          students: {
            id: student.id,
            student_code: student.studentCode,
            users: {
              name: student.name,
            },
          },
        })),
      }))

      setGuardians(formattedGuardians)
    } catch (error) {
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleDeleteClick(id: string, name: string) {
    setGuardianToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!guardianToDelete) return

    setIsDeleting(true)
    try {
      // Server Action을 통한 보호자 삭제
      const result = await deleteGuardian(guardianToDelete.id)

      if (!result.success) {
        throw new Error(result.error || '보호자 삭제 실패')
      }

      toast({
        title: '삭제 완료',
        description: `${guardianToDelete.name} 보호자가 삭제되었습니다.`,
      })

      loadGuardians()
    } catch (error) {
      toast({
        title: '삭제 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setGuardianToDelete(null)
    }
  }

  return (
    <>
      <GuardianTableImproved
        data={guardians}
        loading={loading}
        onDelete={handleDeleteClick}
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="정말로 삭제하시겠습니까?"
        description={
          guardianToDelete
            ? `"${guardianToDelete.name}" 보호자의 모든 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
            : ''
        }
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
