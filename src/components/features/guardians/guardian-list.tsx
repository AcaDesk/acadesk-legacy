'use client'

import { useState } from 'react'
import { GuardianTableImproved } from './guardian-table-improved'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import {
  useGuardiansQuery,
  useDeleteGuardianMutation,
  useBulkDeleteGuardiansMutation,
} from '@/hooks/queries/use-guardians-query'

export function GuardianList() {
  const { data: guardians = [], isLoading } = useGuardiansQuery()
  const deleteMutation = useDeleteGuardianMutation()
  const bulkDeleteMutation = useBulkDeleteGuardiansMutation()

  // Single delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [guardianToDelete, setGuardianToDelete] = useState<{ id: string; name: string } | null>(null)

  // Bulk delete state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [idsToDelete, setIdsToDelete] = useState<string[]>([])

  function handleDeleteClick(id: string, name: string) {
    setGuardianToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!guardianToDelete) return
    await deleteMutation.mutateAsync(guardianToDelete.id)
    setDeleteDialogOpen(false)
    setGuardianToDelete(null)
  }

  function handleBulkDeleteClick(ids: string[]) {
    setIdsToDelete(ids)
    setBulkDeleteDialogOpen(true)
  }

  async function handleConfirmBulkDelete() {
    if (idsToDelete.length === 0) return
    await bulkDeleteMutation.mutateAsync(idsToDelete)
    setBulkDeleteDialogOpen(false)
    setIdsToDelete([])
  }

  return (
    <>
      <GuardianTableImproved
        data={guardians}
        loading={isLoading}
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
        isLoading={deleteMutation.isPending}
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
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={handleConfirmBulkDelete}
      />
    </>
  )
}
