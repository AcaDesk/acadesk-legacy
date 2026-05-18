'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ui/dialog'
import { PromotionWizard } from './promotion-wizard'

interface PromotionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
}

export function PromotionDialog({ open, onOpenChange, onCompleted }: PromotionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>진급 관리</DialogTitle>
          <DialogDescription>
            학년이 바뀔 때 학생 학년·학교 정보를 일괄 업데이트합니다.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <PromotionWizard
            onClose={() => onOpenChange(false)}
            onCompleted={onCompleted}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
