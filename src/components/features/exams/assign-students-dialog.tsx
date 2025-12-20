'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs'
import { UserPlus, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { StudentSearch, type Student as StudentSearchStudent } from '@/components/features/students/student-search'

type SchoolLevel = 'all' | 'kindergarten' | 'elementary' | 'middle' | 'high'

// 학년 문자열에서 학교급 추출
function getSchoolLevel(grade: string | null | undefined): SchoolLevel {
  if (!grade) return 'all'
  const normalizedGrade = grade.toLowerCase().trim()

  // 유치원
  if (normalizedGrade.includes('유치') || normalizedGrade.includes('유아') || normalizedGrade.includes('7세') || normalizedGrade.includes('6세') || normalizedGrade.includes('5세')) {
    return 'kindergarten'
  }

  // 초등 (초1, 초2, 초등1, 초등학교 1학년 등)
  if (normalizedGrade.startsWith('초') || normalizedGrade.includes('초등')) {
    return 'elementary'
  }

  // 중등 (중1, 중2, 중학교 1학년 등)
  if (normalizedGrade.startsWith('중') || normalizedGrade.includes('중학')) {
    return 'middle'
  }

  // 고등 (고1, 고2, 고등학교 1학년 등)
  if (normalizedGrade.startsWith('고') || normalizedGrade.includes('고등')) {
    return 'high'
  }

  // 숫자로만 된 학년 (1~6: 초등, 7~9: 중등, 10~12: 고등)
  const gradeNum = parseInt(normalizedGrade.replace(/[^0-9]/g, ''))
  if (!isNaN(gradeNum)) {
    if (gradeNum >= 1 && gradeNum <= 6) return 'elementary'
    if (gradeNum >= 7 && gradeNum <= 9) return 'middle'
    if (gradeNum >= 10 && gradeNum <= 12) return 'high'
  }

  return 'all'
}

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
  const [schoolLevelFilter, setSchoolLevelFilter] = useState<SchoolLevel>('all')

  // Calculate currently assigned student IDs
  const currentlyAssignedIds = useMemo(
    () => students.filter(s => s.isAssigned).map(s => s.id),
    [students]
  )

  // Check if there are any changes from the initial state
  const hasChanges = useMemo(() => {
    const prev = new Set(currentlyAssignedIds)
    const next = new Set(selectedIds)

    // If sizes are different, there are changes
    if (prev.size !== next.size) return true

    // Check if all previous IDs are in the new set
    for (const id of prev) {
      if (!next.has(id)) return true
    }

    return false
  }, [currentlyAssignedIds, selectedIds])

  // 학교급별 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    if (schoolLevelFilter === 'all') return students
    return students.filter(s => getSchoolLevel(s.grade) === schoolLevelFilter)
  }, [students, schoolLevelFilter])

  // 각 학교급별 학생 수 계산
  const schoolLevelCounts = useMemo(() => {
    const counts = {
      all: students.length,
      kindergarten: 0,
      elementary: 0,
      middle: 0,
      high: 0,
    }
    students.forEach(s => {
      const level = getSchoolLevel(s.grade)
      if (level !== 'all') {
        counts[level]++
      }
    })
    return counts
  }, [students])

  useEffect(() => {
    if (open) {
      loadStudents()
    }
  }, [open, examId])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedIds([])
    }
  }, [open])

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

      // Add to selected and calculate how many were newly added
      setSelectedIds(prev => {
        const prevSet = new Set(prev)
        const newSet = new Set([...prev, ...classStudentIds])
        const addedCount = newSet.size - prevSet.size

        toast({
          title: '수업 학생 배정',
          description:
            addedCount === 0
              ? '이미 모든 수업 학생이 선택되어 있습니다.'
              : `${addedCount}명의 학생이 새로 선택되었습니다.`,
        })

        return Array.from(newSet)
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
      onOpenChange(false)
    } catch (error) {
      console.error('Error assigning students:', error)
      toast({
        title: '배정 오류',
        description: '학생을 배정하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
      // Error case: keep dialog open so user can retry
    } finally {
      setSaving(false)
    }
  }

  const totalCount = students.length
  const assignedCount = students.filter(s => s.isAssigned).length
  const selectedCount = selectedIds.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 space-y-3">
          <DialogTitle>학생 배정</DialogTitle>
          <DialogDescription>
            이 시험에 배정할 학생을 선택하세요. 배정된 학생만 성적 입력 시 표시됩니다.
          </DialogDescription>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">
              전체 {totalCount}명
            </Badge>
            <Badge variant="outline">
              기배정 {assignedCount}명
            </Badge>
            <Badge variant="secondary">
              현재 선택 {selectedCount}명
            </Badge>
          </div>

          {/* 학교급 필터 탭 */}
          <Tabs value={schoolLevelFilter} onValueChange={(v) => setSchoolLevelFilter(v as SchoolLevel)} className="mt-3">
            <TabsList className="grid w-full grid-cols-5 h-9">
              <TabsTrigger value="all" className="text-xs px-2">
                전체 ({schoolLevelCounts.all})
              </TabsTrigger>
              <TabsTrigger value="kindergarten" className="text-xs px-2" disabled={schoolLevelCounts.kindergarten === 0}>
                유치 ({schoolLevelCounts.kindergarten})
              </TabsTrigger>
              <TabsTrigger value="elementary" className="text-xs px-2" disabled={schoolLevelCounts.elementary === 0}>
                초등 ({schoolLevelCounts.elementary})
              </TabsTrigger>
              <TabsTrigger value="middle" className="text-xs px-2" disabled={schoolLevelCounts.middle === 0}>
                중등 ({schoolLevelCounts.middle})
              </TabsTrigger>
              <TabsTrigger value="high" className="text-xs px-2" disabled={schoolLevelCounts.high === 0}>
                고등 ({schoolLevelCounts.high})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <StudentSearch
            mode="multiple"
            variant="checkbox-list"
            students={filteredStudents}
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
                      label: '수업 배정 학생 모두 선택',
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
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            <UserPlus className="h-4 w-4 mr-2" />
            {saving ? '배정 중...' : `${selectedIds.length}명 배정`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
