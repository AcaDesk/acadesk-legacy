'use client'

import { useState, useEffect } from 'react'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog'
import { UserPlus, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { StudentSearch, type Student as StudentSearchStudent } from '@/components/features/students/student-search'

interface Student extends StudentSearchStudent {
  isAssigned: boolean
}

interface AssignStudentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  examId: string
  classId: string | null
  onSuccess: () => void
}

export function AssignStudentsDialog({
  open,
  onOpenChange,
  examId,
  classId,
  onSuccess,
}: AssignStudentsDialogProps) {
  const { toast } = useToast()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

  const [students, setStudents] = useState<Student[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      loadStudents()
    }
  }, [open, examId])

  async function loadStudents() {
    if (!currentUser || !currentUser.tenantId) return

    try {
      setLoading(true)

      // Get all students with proper foreign key hint
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, student_code, users!user_id(name), grade')
        .eq('tenant_id', currentUser.tenantId)
        .is('deleted_at', null)
        .order('student_code')

      if (studentsError) throw studentsError

      // Get already assigned students
      const { data: assignedScores, error: scoresError } = await supabase
        .from('exam_scores')
        .select('student_id')
        .eq('tenant_id', currentUser.tenantId)
        .eq('exam_id', examId)

      if (scoresError) throw scoresError

      const assignedIds = new Set(assignedScores?.map(s => s.student_id) || [])

      const studentList: Student[] = (allStudents || []).map((s: any) => ({
        id: s.id,
        student_code: s.student_code,
        name: s.users?.name || '이름 없음',
        grade: s.grade,
        isAssigned: assignedIds.has(s.id),
      }))

      setStudents(studentList)

      // Pre-select assigned students
      setSelectedIds(Array.from(assignedIds))
    } catch (error) {
      console.error('Error loading students:', error)
      toast({
        title: '로드 오류',
        description: '학생 목록을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleAssignFromClass() {
    if (!classId) {
      toast({
        title: '수업 없음',
        description: '이 시험에 연결된 수업이 없습니다.',
        variant: 'destructive',
      })
      return
    }

    if (!currentUser || !currentUser.tenantId) return

    try {
      // Get students enrolled in the class
      const { data: enrollments, error } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('tenant_id', currentUser.tenantId)
        .eq('class_id', classId)
        .eq('status', 'active')

      if (error) throw error

      const classStudentIds = enrollments?.map(e => e.student_id) || []

      // Add to selected
      setSelectedIds(prev => {
        const newSet = new Set([...prev, ...classStudentIds])
        return Array.from(newSet)
      })

      toast({
        title: '수업 학생 배정 완료',
        description: `${classStudentIds.length}명의 학생이 선택되었습니다.`,
      })
    } catch (error) {
      console.error('Error loading class students:', error)
      toast({
        title: '오류',
        description: '수업 학생을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  async function handleSave() {
    if (!currentUser?.tenantId) {
      toast({
        title: '인증 오류',
        description: '로그인 정보를 확인할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    try {
      setSaving(true)

      // Get currently assigned students
      const currentlyAssigned = new Set(students.filter(s => s.isAssigned).map(s => s.id))
      const selectedSet = new Set(selectedIds)

      // Students to add (selected but not currently assigned)
      const toAdd = selectedIds.filter(id => !currentlyAssigned.has(id))

      // Students to remove (currently assigned but not selected)
      const toRemove = Array.from(currentlyAssigned).filter(id => !selectedSet.has(id))

      // Add new students
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('exam_scores')
          .insert(
            toAdd.map(studentId => ({
              tenant_id: currentUser.tenantId,
              exam_id: examId,
              student_id: studentId,
              percentage: null,
              feedback: null,
            }))
          )

        if (insertError) throw insertError
      }

      // Remove students
      if (toRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('exam_scores')
          .delete()
          .eq('tenant_id', currentUser.tenantId)
          .eq('exam_id', examId)
          .in('student_id', toRemove)

        if (deleteError) throw deleteError
      }

      toast({
        title: '배정 완료',
        description: `${selectedIds.length}명의 학생이 배정되었습니다.`,
      })

      onSuccess()
    } catch (error) {
      console.error('Error assigning students:', error)
      toast({
        title: '배정 오류',
        description: '학생을 배정하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>학생 배정</DialogTitle>
          <DialogDescription>
            이 시험에 배정할 학생을 선택하세요. 배정된 학생만 성적 입력 시 표시됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <StudentSearch
            mode="multiple"
            variant="checkbox-list"
            students={students}
            value={selectedIds}
            onChange={setSelectedIds}
            loading={loading}
            searchable={true}
            showSelectAll={true}
            showSelectedCount={true}
            placeholder="학생 검색..."
            className="h-full"
            renderBadge={(student) =>
              (student as Student).isAssigned ? (
                <Badge variant="outline" className="text-xs">
                  기배정
                </Badge>
              ) : null
            }
            quickActions={
              classId
                ? [
                    {
                      label: '수업 학생 전체 선택',
                      icon: <Users className="h-4 w-4 mr-2" />,
                      onClick: handleAssignFromClass,
                    },
                  ]
                : undefined
            }
          />
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedIds.length === 0}>
            <UserPlus className="h-4 w-4 mr-2" />
            {saving ? '배정 중...' : `${selectedIds.length}명 배정`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
