'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@ui/alert-dialog'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@ui/button'

export interface ConfirmationDialogProps {
  /**
   * 모달 열림/닫힌 상태
   */
  open: boolean

  /**
   * 모달 상태 변경 핸들러
   */
  onOpenChange: (open: boolean) => void

  /**
   * 모달 제목 (주요 질문)
   * @example "정말로 삭제하시겠습니까?"
   */
  title: string

  /**
   * 모달 설명 (부가 설명)
   * @example "이 작업은 되돌릴 수 없습니다."
   */
  description?: React.ReactNode

  /**
   * [확인] 버튼 클릭 시 실행될 함수
   */
  onConfirm: () => void | Promise<void>

  /**
   * [확인] 버튼 텍스트
   * @default "확인"
   */
  confirmText?: string

  /**
   * [취소] 버튼 텍스트
   * @default "취소"
   */
  cancelText?: string

  /**
   * [확인] 버튼 variant
   * @default "destructive"
   */
  variant?: 'default' | 'destructive'

  /**
   * 로딩 중 상태 (확인 버튼에 스피너 표시)
   */
  isLoading?: boolean

  /**
   * 확인 버튼 비활성화 여부
   */
  disabled?: boolean
}

/**
 * Confirmation Dialog Component
 *
 * 사용자에게 중요한 작업(삭제, 변경 등)을 확인받기 위한 모달입니다.
 * 네이티브 `confirm()` 함수를 대체하여 일관된 UI/UX를 제공합니다.
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false)
 * const [isLoading, setIsLoading] = useState(false)
 *
 * async function handleDelete() {
 *   setIsLoading(true)
 *   try {
 *     await deleteStudent(id)
 *     toast({ title: "삭제 완료" })
 *   } finally {
 *     setIsLoading(false)
 *     setIsOpen(false)
 *   }
 * }
 *
 * <ConfirmationDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="정말로 삭제하시겠습니까?"
 *   description="이 작업은 되돌릴 수 없습니다."
 *   confirmText="삭제"
 *   variant="destructive"
 *   isLoading={isLoading}
 *   onConfirm={handleDelete}
 * />
 * ```
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'destructive',
  isLoading = false,
  disabled = false,
}: ConfirmationDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={disabled || isLoading}
            className={cn(
              buttonVariants({ variant }),
              isLoading && 'cursor-not-allowed opacity-50'
            )}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * useConfirmationDialog Hook
 *
 * ConfirmationDialog를 더 쉽게 사용하기 위한 훅입니다.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isOpen, isLoading, openDialog, confirmDialog } = useConfirmationDialog()
 *
 *   async function handleDelete() {
 *     openDialog()
 *   }
 *
 *   async function performDelete() {
 *     await deleteStudent(id)
 *     toast({ title: "삭제 완료" })
 *   }
 *
 *   return (
 *     <>
 *       <Button onClick={handleDelete}>삭제</Button>
 *       <ConfirmationDialog
 *         open={isOpen}
 *         onOpenChange={(open) => !open && confirmDialog.close()}
 *         title="정말로 삭제하시겠습니까?"
 *         isLoading={isLoading}
 *         onConfirm={() => confirmDialog.confirm(performDelete)}
 *       />
 *     </>
 *   )
 * }
 * ```
 */
export function useConfirmationDialog() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const openDialog = () => setIsOpen(true)
  const closeDialog = () => setIsOpen(false)

  const confirmDialog = {
    open: openDialog,
    close: closeDialog,
    confirm: async (action: () => void | Promise<void>) => {
      setIsLoading(true)
      try {
        await action()
      } finally {
        setIsLoading(false)
        setIsOpen(false)
      }
    },
  }

  return {
    isOpen,
    isLoading,
    openDialog,
    closeDialog,
    confirmDialog,
  }
}
