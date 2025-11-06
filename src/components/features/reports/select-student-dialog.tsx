'use client'

import { useState, useEffect } from 'react'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog'
import { UserCheck } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { StudentSearch, type Student as StudentSearchStudent } from '@/components/features/students/student-search'

interface Student extends StudentSearchStudent {
  school?: string | null
  classes?: string[]
}

interface SelectStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: string
  onSelect: (studentId: string, studentName: string) => void
  title?: string
  description?: string
  students?: Student[]
  loading?: boolean
}

export function SelectStudentDialog({
  open,
  onOpenChange,
  value,
  onSelect,
  title = '학생 선택',
  description = '리포트를 생성할 학생을 선택하세요.',
  students: externalStudents,
  loading: externalLoading,
}: SelectStudentDialogProps) {
  const { toast } = useToast()

  const [selectedId, setSelectedId] = useState<string | undefined>(value)

  useEffect(() => {
    if (open) {
      setSelectedId(value)
    }
  }, [open, value])

  function handleConfirm() {
    if (!selectedId) {
      toast({
        title: '학생 선택 필요',
        description: '학생을 먼저 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    const selectedStudent = externalStudents?.find(s => s.id === selectedId)
    const studentName = selectedStudent?.name || '학생'

    onSelect(selectedId, studentName)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <StudentSearch
            mode="multiple"
            variant="checkbox-list"
            students={externalStudents}
            value={selectedId ? [selectedId] : []}
            onChange={(ids) => setSelectedId(ids[0])}
            loading={externalLoading}
            searchable={true}
            showSelectAll={false}
            showSelectedCount={false}
            placeholder="학생 검색..."
            className="h-full"
            renderBadge={(student) => {
              const s = student as Student
              return (
                <div className="flex flex-wrap items-center gap-1.5">
                  {s.school && (
                    <Badge variant="outline" className="text-xs">
                      {s.school}
                    </Badge>
                  )}
                  {s.classes && s.classes.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {s.classes.join(', ')}
                    </Badge>
                  )}
                </div>
              )
            }}
          />
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedId}>
            <UserCheck className="h-4 w-4 mr-2" />
            선택 완료
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
