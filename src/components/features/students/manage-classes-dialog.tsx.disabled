'use client'

import { useState, useEffect } from 'react'
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
import { createGetActiveClassesUseCase } from '@core/application/factories/classUseCaseFactory.client'
import { createUpdateStudentClassEnrollmentsUseCase } from '@core/application/factories/studentUseCaseFactory.client'

interface Class {
  id: string
  name: string
  subject: string | null
  active: boolean
}

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
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { user: currentUser } = useCurrentUser()

  useEffect(() => {
    if (open) {
      loadClasses()
      setSelectedClassIds(currentClassIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function loadClasses() {
    try {
      setLoading(true)

      // Use Case를 통한 활성 클래스 로드
      const useCase = createGetActiveClassesUseCase()
      const activeClasses = await useCase.execute()

      // Convert to Class format with subject field
      const classesWithSubject = activeClasses.map(cls => ({
        ...cls,
        subject: null, // Subject field not available in ActiveClassDTO
        active: true,
      }))

      setClasses(classesWithSubject)
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

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    )
  }

  const handleSave = async () => {
    if (!currentUser || !currentUser.tenantId) return

    setSaving(true)
    try {
      // Use Case를 통한 수업 등록 업데이트
      const useCase = createUpdateStudentClassEnrollmentsUseCase()
      const { success, error } = await useCase.execute({
        tenantId: currentUser.tenantId,
        studentId,
        classIds: selectedClassIds,
      })

      if (error) throw error

      toast({
        title: '수업 배정 완료',
        description: '수업 정보가 업데이트되었습니다.',
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      toast({
        title: '저장 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
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
