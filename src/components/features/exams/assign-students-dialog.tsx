'use client'

import { useState, useEffect } from 'react'
import { Button } from '@ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog'
import { Checkbox } from '@ui/checkbox'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Search, UserPlus, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { ScrollArea } from '@ui/scroll-area'
import { useCurrentUser } from '@/hooks/use-current-user'

interface Student {
  id: string
  student_code: string
  name: string
  grade: string | null
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      loadStudents()
    }
  }, [open, examId])

  async function loadStudents() {
    try {
      setLoading(true)

      // Get all students with proper foreign key hint
      const { data: allStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, student_code, users!user_id(name), grade')
        .is('deleted_at', null)
        .order('student_code')

      if (studentsError) throw studentsError

      // Get already assigned students
      const { data: assignedScores, error: scoresError } = await supabase
        .from('exam_scores')
        .select('student_id')
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
      setSelectedIds(assignedIds)
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

    try {
      // Get students enrolled in the class
      const { data: enrollments, error } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('status', 'active')

      if (error) throw error

      const classStudentIds = new Set(enrollments?.map(e => e.student_id) || [])

      // Add to selected
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        classStudentIds.forEach(id => newSet.add(id))
        return newSet
      })

      toast({
        title: '수업 학생 배정 완료',
        description: `${classStudentIds.size}명의 학생이 선택되었습니다.`,
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

  function toggleStudent(studentId: string) {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }

  function toggleAll() {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)))
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

      // Students to add (selected but not currently assigned)
      const toAdd = Array.from(selectedIds).filter(id => !currentlyAssigned.has(id))

      // Students to remove (currently assigned but not selected)
      const toRemove = Array.from(currentlyAssigned).filter(id => !selectedIds.has(id))

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
          .eq('exam_id', examId)
          .in('student_id', toRemove)

        if (deleteError) throw deleteError
      }

      toast({
        title: '배정 완료',
        description: `${selectedIds.size}명의 학생이 배정되었습니다.`,
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

  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      student.name.toLowerCase().includes(search) ||
      student.student_code.toLowerCase().includes(search)
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>학생 배정</DialogTitle>
          <DialogDescription>
            이 시험에 배정할 학생을 선택하세요. 배정된 학생만 성적 입력 시 표시됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {classId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAssignFromClass}
              >
                <Users className="h-4 w-4 mr-2" />
                수업 학생 전체 선택
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAll}
            >
              {selectedIds.size === filteredStudents.length ? '전체 해제' : '전체 선택'}
            </Button>
            <div className="ml-auto">
              <Badge variant="secondary">
                {selectedIds.size}명 선택됨
              </Badge>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="학생 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Students List */}
          <ScrollArea className="h-[400px] border rounded-lg p-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                로딩 중...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                검색 결과가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => toggleStudent(student.id)}
                  >
                    <Checkbox
                      checked={selectedIds.has(student.id)}
                      onCheckedChange={() => toggleStudent(student.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>{student.student_code}</span>
                        {student.grade && (
                          <>
                            <span>·</span>
                            <span>{student.grade}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {student.isAssigned && (
                      <Badge variant="outline" className="text-xs">
                        기배정
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saving || selectedIds.size === 0}>
            <UserPlus className="h-4 w-4 mr-2" />
            {saving ? '배정 중...' : `${selectedIds.size}명 배정`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
