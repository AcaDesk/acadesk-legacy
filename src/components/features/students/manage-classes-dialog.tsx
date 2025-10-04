'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Loader2 } from 'lucide-react'

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
  const supabase = createClient()
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
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, subject, active')
        .eq('active', true)
        .order('name')

      if (error) throw error
      setClasses(data as Class[])
    } catch (error) {
      console.error('Error loading classes:', error)
      toast({
        title: '데이터 로드 오류',
        description: '수업 목록을 불러오는 중 오류가 발생했습니다.',
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
    if (!currentUser) return

    setSaving(true)
    try {
      // Delete all existing enrollments for this student
      const { error: deleteError } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('student_id', studentId)

      if (deleteError && deleteError.code !== 'PGRST116') {
        throw deleteError
      }

      // Insert new enrollments
      if (selectedClassIds.length > 0) {
        const records = selectedClassIds.map((classId) => ({
          tenant_id: currentUser.tenantId,
          student_id: studentId,
          class_id: classId,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        }))

        const { error: insertError } = await supabase
          .from('class_enrollments')
          .insert(records)

        if (insertError) throw insertError
      }

      toast({
        title: '수업 배정 완료',
        description: '수업 정보가 업데이트되었습니다.',
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving classes:', error)
      toast({
        title: '저장 실패',
        description: error.message || '수업을 배정하는 중 오류가 발생했습니다.',
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
