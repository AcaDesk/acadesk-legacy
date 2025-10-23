'use client'

import { useState, useEffect } from 'react'
import { Download, Trash2, GraduationCap, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Button } from '@ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Label } from '@ui/label'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-handlers'
import { GRADES } from '@/lib/constants'
import type { Student } from './student-table-improved'
import {
  bulkUpdateStudents,
  bulkDeleteStudents,
  bulkEnrollClass,
} from '@/app/actions/students'

type BulkAction = 'delete' | 'grade' | 'class' | 'export'

interface BulkActionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedStudents: Student[]
  onComplete: () => void
}

export function BulkActionsDialog({
  open,
  onOpenChange,
  selectedStudents,
  onComplete,
}: BulkActionsDialogProps) {
  const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null)
  const [selectedGrade, setSelectedGrade] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()

  // Load classes when dialog opens
  useEffect(() => {
    if (open && selectedAction === 'class') {
      loadClasses()
    }
  }, [open, selectedAction])

  async function loadClasses() {
    try {
      // TODO: 클래스 조회 Server Action 추가 필요 (읽기 전용이므로 낮은 우선순위)
      // 임시로 직접 조회
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      toast({
        title: '수업 목록 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`${selectedStudents.length}명의 학생을 삭제하시겠습니까?`)) {
      return
    }

    setLoading(true)
    try {
      const studentIds = selectedStudents.map(s => s.id)

      // Server Action을 통한 일괄 삭제
      const result = await bulkDeleteStudents(studentIds)

      if (!result.success) {
        throw new Error(result.error || '일괄 삭제에 실패했습니다.')
      }

      toast({
        title: '일괄 삭제 완료',
        description: `${selectedStudents.length}명의 학생이 삭제되었습니다.`,
      })

      onComplete()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: '일괄 삭제 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkGradeChange() {
    if (!selectedGrade) {
      toast({
        title: '학년을 선택해주세요',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Prepare updates
      const updates = selectedStudents.map(student => ({
        id: student.id,
        grade: selectedGrade,
      }))

      // Server Action을 통한 일괄 업데이트
      const result = await bulkUpdateStudents(updates)

      if (!result.success) {
        throw new Error(result.error || '일괄 학년 변경에 실패했습니다.')
      }

      toast({
        title: '일괄 학년 변경 완료',
        description: `${selectedStudents.length}명의 학생 학년이 ${selectedGrade}(으)로 변경되었습니다.`,
      })

      onComplete()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: '일괄 학년 변경 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleBulkClassAssignment() {
    if (!selectedClass) {
      toast({
        title: '수업을 선택해주세요',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Server Action을 통한 일괄 수업 배정
      const studentIds = selectedStudents.map(s => s.id)
      const result = await bulkEnrollClass(studentIds, selectedClass)

      if (!result.success) {
        throw new Error(result.error || '일괄 수업 배정에 실패했습니다.')
      }

      toast({
        title: '일괄 수업 배정 완료',
        description: `${selectedStudents.length}명의 학생이 수업에 배정되었습니다.`,
      })

      onComplete()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: '일괄 수업 배정 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleExportCSV() {
    try {
      // CSV 헤더
      const headers = ['학번', '이름', '학년', '학교', '연락처', '이메일', '입회일']

      // CSV 데이터
      const rows = selectedStudents.map(student => [
        student.student_code,
        student.users?.name || '',
        student.grade || '',
        student.school || '',
        student.users?.phone || '',
        student.users?.email || '',
        student.enrollment_date,
      ])

      // CSV 문자열 생성
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      // BOM 추가 (한글 깨짐 방지)
      const bom = '\uFEFF'
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `학생목록_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'CSV 내보내기 완료',
        description: `${selectedStudents.length}명의 학생 정보가 내보내졌습니다.`,
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'CSV 내보내기 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  function renderActionForm() {
    switch (selectedAction) {
      case 'delete':
        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                ⚠️ 이 작업은 되돌릴 수 없습니다.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedStudents.length}명의 학생이 영구적으로 삭제됩니다.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAction(null)}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={loading}>
                {loading ? '삭제 중...' : '삭제'}
              </Button>
            </DialogFooter>
          </div>
        )

      case 'grade':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="grade">변경할 학년</Label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger id="grade">
                  <SelectValue placeholder="학년 선택" />
                </SelectTrigger>
                <SelectContent>
                  {GRADES.map((grade) => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAction(null)}>
                취소
              </Button>
              <Button onClick={handleBulkGradeChange} disabled={loading || !selectedGrade}>
                {loading ? '변경 중...' : '변경'}
              </Button>
            </DialogFooter>
          </div>
        )

      case 'class':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class">배정할 수업</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger id="class">
                  <SelectValue placeholder="수업 선택" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAction(null)}>
                취소
              </Button>
              <Button onClick={handleBulkClassAssignment} disabled={loading || !selectedClass}>
                {loading ? '배정 중...' : '배정'}
              </Button>
            </DialogFooter>
          </div>
        )

      case 'export':
        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                {selectedStudents.length}명의 학생 정보를 CSV 파일로 내보냅니다.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAction(null)}>
                취소
              </Button>
              <Button onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                내보내기
              </Button>
            </DialogFooter>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>일괄 작업</DialogTitle>
          <DialogDescription>
            {selectedStudents.length}명의 학생에게 적용할 작업을 선택하세요
          </DialogDescription>
        </DialogHeader>

        {!selectedAction ? (
          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => setSelectedAction('grade')}
            >
              <GraduationCap className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">학년 일괄 변경</div>
                <div className="text-xs text-muted-foreground">선택한 학생들의 학년을 일괄 변경합니다</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => setSelectedAction('class')}
            >
              <Users className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">수업 일괄 배정</div>
                <div className="text-xs text-muted-foreground">선택한 학생들을 수업에 일괄 배정합니다</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => setSelectedAction('export')}
            >
              <Download className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">CSV 내보내기</div>
                <div className="text-xs text-muted-foreground">학생 정보를 CSV 파일로 내보냅니다</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setSelectedAction('delete')}
            >
              <Trash2 className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">일괄 삭제</div>
                <div className="text-xs text-muted-foreground">선택한 학생들을 일괄 삭제합니다 (되돌릴 수 없음)</div>
              </div>
            </Button>
          </div>
        ) : (
          <div className="py-4">
            {renderActionForm()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
