'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { GuardianTableImproved, type Guardian } from './guardian-table-improved'
import { getErrorMessage } from '@/lib/error-handlers'
import { getGuardiansWithDetails, deleteGuardian, bulkDeleteGuardians } from '@/app/actions/guardians'
import { ConfirmationDialog } from '@ui/confirmation-dialog'

interface GuardianDetailRow {
  guardian: {
    id: string
    relationship: string | null
  }
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
}

interface GuardianListProps {
  initialData?: GuardianDetailRow[]
}

export function GuardianList({ initialData }: GuardianListProps) {
  const [guardians, setGuardians] = useState<Guardian[]>(() =>
    initialData ? formatGuardians(initialData) : []
  )
  const [loading, setLoading] = useState(!initialData)

  // Single delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [guardianToDelete, setGuardianToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Bulk delete state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [idsToDelete, setIdsToDelete] = useState<string[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    if (!initialData) {
      void loadGuardians()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData])

  async function loadGuardians() {
    try {
      setLoading(true)

      const result = await getGuardiansWithDetails()

      if (!result.success || !result.data) {
        throw new Error(result.error || '보호자 목록을 불러올 수 없습니다')
      }

      setGuardians(formatGuardians(result.data))
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

  // Single delete handlers
  function handleDeleteClick(id: string, name: string) {
    setGuardianToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!guardianToDelete) return

    setIsDeleting(true)
    try {
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

  // Bulk delete handlers
  function handleBulkDeleteClick(ids: string[]) {
    setIdsToDelete(ids)
    setBulkDeleteDialogOpen(true)
  }

  async function handleConfirmBulkDelete() {
    if (idsToDelete.length === 0) return

    setIsBulkDeleting(true)
    try {
      const result = await bulkDeleteGuardians(idsToDelete)

      if (!result.success) {
        throw new Error(result.error || '일괄 삭제 실패')
      }

      toast({
        title: '일괄 삭제 완료',
        description: `${result.data?.deletedCount ?? idsToDelete.length}명의 보호자가 삭제되었습니다.`,
      })

      loadGuardians()
    } catch (error) {
      toast({
        title: '일괄 삭제 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsBulkDeleting(false)
      setBulkDeleteDialogOpen(false)
      setIdsToDelete([])
    }
  }

  return (
    <>
      <GuardianTableImproved
        data={guardians}
        loading={loading}
        onDelete={handleDeleteClick}
        onBulkDelete={handleBulkDeleteClick}
      />

      {/* Single Delete Confirmation */}
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

      {/* Bulk Delete Confirmation */}
      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="선택한 보호자를 모두 삭제하시겠습니까?"
        description={`${idsToDelete.length}명의 보호자가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmText="일괄 삭제"
        variant="destructive"
        isLoading={isBulkDeleting}
        onConfirm={handleConfirmBulkDelete}
      />
    </>
  )
}
