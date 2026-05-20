'use client'

import { useState } from 'react'
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
import { DatePicker } from '@ui/date-picker'
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers'
import type { StudentMaster } from '@/app/actions/students/queries'
import { assignTextbookToStudent } from '@/app/actions/textbooks'
import { formatDate, getTodayKST } from '@/lib/utils'

export function AssignTextbookDialog({
  textbookId,
  students,
  onSuccess,
}: {
  textbookId: string
  students: StudentMaster[]
  onSuccess: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [issueDate, setIssueDate] = useState(getTodayKST())
  const [paid, setPaid] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      s.student_code.toLowerCase().includes(q) ||
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
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center h-full py-8 text-sm text-muted-foreground">
                  {students.length === 0 ? '등록된 학생이 없습니다' : '검색 결과가 없습니다'}
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
                      <span
                        className={`ml-auto text-xs font-mono ${selectedStudentId === student.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}
                      >
                        {student.student_code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* 배부일 */}
          <div className="space-y-2">
            <Label htmlFor="issue-date">배부일</Label>
            <DatePicker
              id="issue-date"
              value={new Date(`${issueDate}T00:00:00+09:00`)}
              onChange={(date) => setIssueDate(date ? formatDate(date) : getTodayKST())}
              placeholder="배부일 선택"
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
