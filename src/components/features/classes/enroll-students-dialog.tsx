'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { getClassEnrolledStudentIds, enrollStudentsInClass } from '@/app/actions/classes'
import { queryKeys } from '@/lib/query-keys'
import type { StudentMaster } from '@/app/actions/students/queries'

interface EnrollStudentsDialogProps {
  classId: string
  studentsMaster: StudentMaster[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EnrollStudentsDialog({
  classId,
  studentsMaster,
  open,
  onOpenChange,
  onSuccess,
}: EnrollStudentsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (open) {
      setSelectedIds([])
      setSearch('')
    }
  }, [open])

  const enrolledIdsQuery = useQuery({
    queryKey: queryKeys.classes.enrolledIds(classId),
    queryFn: async () => {
      const result = await getClassEnrolledStudentIds(classId)
      if (!result.success || !result.data) throw new Error(result.error || '불러오기 실패')
      return result.data
    },
    enabled: open,
  })
  const loading = open && enrolledIdsQuery.isPending

  const enrolledIds = useMemo(
    () => new Set(enrolledIdsQuery.data ?? []),
    [enrolledIdsQuery.data]
  )

  const unenrolledStudents = useMemo(
    () => studentsMaster.filter((s) => !enrolledIds.has(s.id)),
    [studentsMaster, enrolledIds]
  )

  const filteredStudents = unenrolledStudents.filter(s =>
    s.name.includes(search) ||
    s.student_code.includes(search) ||
    (s.grade?.includes(search) ?? false) ||
    (s.school?.includes(search) ?? false)
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

  const enrollMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      const result = await enrollStudentsInClass(classId, studentIds)
      if (!result.success) throw new Error(result.error || '배정 실패')
      return studentIds.length
    },
    onSuccess: (count) => {
      toast({ title: `${count}명 배정 완료` })
      onSuccess()
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast({ title: '배정 실패', description: getErrorMessage(error), variant: 'destructive' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classes.enrolledIds(classId) })
    },
  })
  const saving = enrollMutation.isPending

  function handleSave() {
    if (selectedIds.length === 0) return
    enrollMutation.mutate(selectedIds)
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
          ) : enrolledIdsQuery.isError ? (
            <div className="text-center py-10 text-sm text-destructive">
              배정 정보를 불러올 수 없습니다. 다시 시도해주세요.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {unenrolledStudents.length === 0
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
                    <div className="text-xs text-muted-foreground">{student.student_code}</div>
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
