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
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-handlers'
import { Loader2, Search, UserPlus } from 'lucide-react'
import { getUnenrolledStudents, enrollStudentsInClass } from '@/app/actions/classes'

interface Student {
  id: string
  studentCode: string
  name: string
  grade: string
  school: string
}

interface EnrollStudentsDialogProps {
  classId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EnrollStudentsDialog({
  classId,
  open,
  onOpenChange,
  onSuccess,
}: EnrollStudentsDialogProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadStudents()
      setSelectedIds([])
      setSearch('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function loadStudents() {
    setLoading(true)
    try {
      const result = await getUnenrolledStudents(classId)
      if (!result.success || !result.data) throw new Error(result.error || '불러오기 실패')
      setStudents(result.data)
    } catch (error) {
      toast({ title: '오류', description: getErrorMessage(error), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(s =>
    s.name.includes(search) ||
    s.studentCode.includes(search) ||
    s.grade.includes(search) ||
    s.school.includes(search)
  )

  const toggleStudent = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredStudents.map(s => s.id))
    }
  }

  async function handleSave() {
    if (selectedIds.length === 0) return
    setSaving(true)
    try {
      const result = await enrollStudentsInClass(classId, selectedIds)
      if (!result.success) throw new Error(result.error || '배정 실패')
      toast({ title: `${selectedIds.length}명 배정 완료` })
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast({ title: '배정 실패', description: getErrorMessage(error), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const allFilteredSelected =
    filteredStudents.length > 0 && selectedIds.length === filteredStudents.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>학생 배정</DialogTitle>
          <DialogDescription>수업에 추가할 학생을 선택하세요.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름, 학번, 학년, 학교 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="border rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {students.length === 0
                ? '배정 가능한 학생이 없습니다.'
                : '검색 결과가 없습니다.'}
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <div
                className="flex items-center gap-3 px-4 py-2.5 border-b bg-muted/50 cursor-pointer"
                onClick={toggleAll}
              >
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm text-muted-foreground">
                  전체 선택 ({filteredStudents.length}명)
                </span>
              </div>
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                  onClick={() => toggleStudent(student.id)}
                >
                  <Checkbox
                    checked={selectedIds.includes(student.id)}
                    onCheckedChange={() => toggleStudent(student.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{student.name}</div>
                    <div className="text-xs text-muted-foreground">{student.studentCode}</div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {student.grade && (
                      <Badge variant="outline" className="text-xs">{student.grade}</Badge>
                    )}
                    {student.school && (
                      <Badge variant="outline" className="text-xs">{student.school}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedIds.length > 0 && (
          <p className="text-sm text-muted-foreground">{selectedIds.length}명 선택됨</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedIds.length === 0}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                배정 중...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                {selectedIds.length > 0 ? `${selectedIds.length}명 배정` : '배정'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
