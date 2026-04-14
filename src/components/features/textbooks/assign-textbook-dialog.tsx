'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers'
import { getStudents } from '@/app/actions/students/queries'
import { assignTextbookToStudent } from '@/app/actions/textbooks'
import { getTodayKST } from '@/lib/utils'

type StudentOption = {
  id: string
  name: string
  grade: string | null
  studentCode: string | null
}

export function AssignTextbookDialog({
  textbookId,
  onSuccess,
}: {
  textbookId: string
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [students, setStudents] = useState<StudentOption[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [issueDate, setIssueDate] = useState(getTodayKST())
  const [paid, setPaid] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setStudentsLoading(true)
    getStudents()
      .then((result) => {
        if (!result.success) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = (result.data || []).map((s: any) => ({
          id: s.id as string,
          name: (s.users?.name ?? '') as string,
          grade: (s.grade ?? null) as string | null,
          studentCode: (s.student_code ?? null) as string | null,
        }))
        setStudents(mapped)
      })
      .finally(() => setStudentsLoading(false))
  }, [open])

  function handleOpenChange(next: boolean) {
    if (!next) {
      // 닫힐 때 상태 초기화
      setSelectedStudentId(null)
      setSearch('')
      setPaid(false)
      setNotes('')
      setIssueDate(getTodayKST())
    }
    setOpen(next)
  }

  const filtered = students.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      (s.studentCode?.toLowerCase().includes(q) ?? false) ||
      (s.grade?.toLowerCase().includes(q) ?? false)
    )
  })

  async function handleSubmit() {
    if (!selectedStudentId) return
    setSubmitting(true)

    const result = await assignTextbookToStudent({
      textbookId,
      studentId: selectedStudentId,
      issueDate,
      paid,
      notes: notes || undefined,
    })

    setSubmitting(false)

    if (!result.success) {
      showErrorToast(
        '배부 실패',
        new Error(result.error || '배부에 실패했습니다'),
        'AssignTextbookDialog.handleSubmit'
      )
      return
    }

    const studentName = students.find((s) => s.id === selectedStudentId)?.name ?? '학생'
    showSuccessToast('배부 완료', `${studentName}에게 교재가 배부되었습니다`)
    setOpen(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          학생에게 배부
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>학생에게 교재 배부</DialogTitle>
          <DialogDescription>
            배부할 학생을 선택하고 배부 정보를 입력하세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 학생 검색 */}
          <div className="space-y-2">
            <Label>학생 선택</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 학번, 학년으로 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <ScrollArea className="h-48 rounded-md border">
              {studentsLoading ? (
                <div className="flex items-center justify-center h-full py-8 text-sm text-muted-foreground">
                  학생 목록 불러오는 중...
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center h-full py-8 text-sm text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              ) : (
                <div className="p-1">
                  {filtered.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                        selectedStudentId === student.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <span className="font-medium">{student.name}</span>
                      {student.grade && (
                        <span
                          className={`text-xs ${selectedStudentId === student.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                        >
                          {student.grade}
                        </span>
                      )}
                      {student.studentCode && (
                        <span
                          className={`ml-auto text-xs font-mono ${selectedStudentId === student.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                        >
                          {student.studentCode}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* 배부일 */}
          <div className="space-y-2">
            <Label htmlFor="issue-date">배부일</Label>
            <Input
              id="issue-date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>

          {/* 결제 여부 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="paid"
              checked={paid}
              onCheckedChange={(checked) => setPaid(checked === true)}
            />
            <Label htmlFor="paid" className="cursor-pointer">
              결제 완료
            </Label>
          </div>

          {/* 비고 */}
          <div className="space-y-2">
            <Label htmlFor="notes">비고 (선택)</Label>
            <Input
              id="notes"
              placeholder="메모를 입력하세요"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedStudentId || submitting}>
            {submitting ? '배부 중...' : '배부'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
