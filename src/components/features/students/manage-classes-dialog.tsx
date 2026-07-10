'use client'

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Button } from '@ui/button'
import { Checkbox } from '@ui/checkbox'
import { Badge } from '@ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { getErrorMessage } from '@/lib/error-handlers'
import { Loader2 } from 'lucide-react'
import { updateStudentClassEnrollments } from '@/app/actions/students'
import { useActiveClassesQuery } from '@/hooks/queries/use-active-classes-query'

interface ManageClassesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  currentClassIds: string[]
  onSuccess: () => void
}

export function ManageClassesDialog({
  open,
  onOpenChange,
  studentId,
  currentClassIds,
  onSuccess,
}: ManageClassesDialogProps) {
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const { toast } = useToast()
  const { user: currentUser } = useCurrentUser()

  const classesQuery = useActiveClassesQuery(open)
  const classes = classesQuery.data ?? []
  const loading = classesQuery.isPending

  useEffect(() => {
    if (open) {
      setSelectedClassIds(currentClassIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (classesQuery.error) {
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(classesQuery.error),
        variant: 'destructive',
      })
    }
  }, [classesQuery.error, toast])

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    )
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const result = await updateStudentClassEnrollments(studentId, selectedClassIds)
      if (!result.success) throw new Error(result.error || '수업 배정 실패')
    },
    onSuccess: () => {
      toast({ title: '수업 배정 완료', description: '수업 정보가 업데이트되었습니다.' })
      onSuccess()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast({ title: '저장 실패', description: error.message, variant: 'destructive' })
    },
  })

  const saving = saveMutation.isPending

  const handleSave = () => {
    if (!currentUser?.tenantId) return
    saveMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>수업 관리</DialogTitle>
          <DialogDescription>
            학생에게 배정할 수업을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : classes.length > 0 ? (
            <div className="space-y-3">
              {classes.map((cls) => (
                <div key={cls.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={`class-${cls.id}`}
                    checked={selectedClassIds.includes(cls.id)}
                    onCheckedChange={() => handleToggleClass(cls.id)}
                  />
                  <label
                    htmlFor={`class-${cls.id}`}
                    className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span>{cls.name}</span>
                      {cls.subject && (
                        <Badge variant="outline" className="text-xs">
                          {cls.subject}
                        </Badge>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              등록된 수업이 없습니다.
            </p>
          )}
        </div>

        {selectedClassIds.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedClassIds.length}개의 수업이 선택되었습니다.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              '저장'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
