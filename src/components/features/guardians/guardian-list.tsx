'use client'

import { useState } from 'react'
import { GuardianTableImproved } from './guardian-table-improved'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import {
  useGuardiansQuery,
  useDeleteGuardianMutation,
  useBulkDeleteGuardiansMutation,
} from '@/hooks/queries/use-guardians-query'

// 삭제 다이얼로그 통합 상태 (discriminated union)
type ActiveDialog =
  | { type: 'delete'; guardian: { id: string; name: string } }
  | { type: 'bulkDelete'; ids: string[] }

export function GuardianList() {
  const { data: guardians = [], isLoading } = useGuardiansQuery()
  const deleteMutation = useDeleteGuardianMutation()
  const bulkDeleteMutation = useBulkDeleteGuardiansMutation()

  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null)
  const closeDialog = () => setActiveDialog(null)

  function handleDeleteClick(id: string, name: string) {
    setActiveDialog({ type: 'delete', guardian: { id, name } })
  }

  async function handleConfirmDelete() {
    if (activeDialog?.type !== 'delete') return
    await deleteMutation.mutateAsync(activeDialog.guardian.id)
    closeDialog()
  }

  function handleBulkDeleteClick(ids: string[]) {
    setActiveDialog({ type: 'bulkDelete', ids })
  }

  async function handleConfirmBulkDelete() {
    if (activeDialog?.type !== 'bulkDelete' || activeDialog.ids.length === 0) return
    await bulkDeleteMutation.mutateAsync(activeDialog.ids)
    closeDialog()
  }

  const bulkCount = activeDialog?.type === 'bulkDelete' ? activeDialog.ids.length : 0

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
        open={activeDialog?.type === 'delete'}
        onOpenChange={(open) => !open && closeDialog()}
        title="정말로 삭제하시겠습니까?"
        description={
          activeDialog?.type === 'delete'
            ? `"${activeDialog.guardian.name}" 보호자의 모든 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`
            : ''
        }
        confirmText="삭제"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmationDialog
        open={activeDialog?.type === 'bulkDelete'}
        onOpenChange={(open) => !open && closeDialog()}
        title="선택한 보호자를 모두 삭제하시겠습니까?"
        description={`${bulkCount}명의 보호자가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmText="일괄 삭제"
        variant="destructive"
        isLoading={bulkDeleteMutation.isPending}
        onConfirm={handleConfirmBulkDelete}
      />
    </>
  )
}
