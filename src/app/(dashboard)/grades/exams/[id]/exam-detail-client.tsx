'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Input } from '@ui/input'
import {
  Edit,
  PenSquare,
  Users,
  Calendar,
  BookOpen,
  FileText,
  UserPlus,
  Trash2,
  Tag,
  Repeat,
  Search,
  X,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { AssignStudentsDialog } from '@/components/features/exams/assign-students-dialog'
import { createClient } from '@/lib/supabase/client'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { EmptyState } from '@ui/empty-state'

interface Exam {
  id: string
  name: string
  category_code: string | null
  exam_type: string | null
  exam_date: string | null
  class_id: string | null
  total_questions: number | null
  passing_score: number | null
  description: string | null
  is_recurring: boolean | null
  recurring_schedule: string | null
  created_at: string
  classes?: {
    id: string
    name: string
  }[] | null
}

interface Student {
  id: string
  student_code: string
  name: string
  grade: string | null
}

interface ExamDetailClientProps {
  exam: Exam
}

export function ExamDetailClient({ exam }: ExamDetailClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser } = useCurrentUser()
  const supabase = createClient()

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [studentToRemove, setStudentToRemove] = useState<{ id: string; name: string } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students

    return students.filter((student) => {
      const name = student.name?.toLowerCase() || ''
      const code = student.student_code?.toLowerCase() || ''
      const search = searchTerm.toLowerCase()

      return name.includes(search) || code.includes(search)
    })
  }, [students, searchTerm])

  function getExamTypeLabel(type: string | null) {
    if (!type) return '미선택'
    const typeMap: Record<string, string> = {
      vocabulary: '단어시험',
      midterm: '중간고사',
      final: '기말고사',
      quiz: '퀴즈',
      mock: '모의고사',
      assignment: '과제',
    }
    return typeMap[type] || type
  }

  function getRecurringScheduleLabel(schedule: string | null) {
    if (!schedule) return '-'
    const scheduleMap: Record<string, string> = {
      daily: '매일',
      weekly_mon_wed_fri: '매주 월수금',
      weekly_tue_thu: '매주 화목',
      weekly: '매주 (같은 요일)',
      biweekly: '격주',
      monthly: '매월',
    }
    return scheduleMap[schedule] || schedule
  }

  useEffect(() => {
    if (currentUser && currentUser.tenantId) {
      loadStudents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id, currentUser])

  async function loadStudents() {
    if (!currentUser || !currentUser.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Get students who have scores for this exam
      const { data: scores, error } = await supabase
        .from('exam_scores')
        .select(`
          student_id,
          students (
            id,
            student_code,
            users!user_id (name),
            grade
          )
        `)
        .eq('tenant_id', currentUser.tenantId)
        .eq('exam_id', exam.id)

      if (error) throw error

      const studentList: Student[] = (scores || []).map((score: any) => ({
        id: score.students.id,
        student_code: score.students.student_code,
        name: score.students.users?.name || '이름 없음',
        grade: score.students.grade,
      }))

      setStudents(studentList)
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

  function handleRemoveClick(studentId: string, studentName: string) {
    setStudentToRemove({ id: studentId, name: studentName })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmRemove() {
    if (!currentUser || !currentUser.tenantId || !studentToRemove) return

    setIsRemoving(true)
    try {
      const { error } = await supabase
        .from('exam_scores')
        .delete()
        .eq('tenant_id', currentUser.tenantId)
        .eq('exam_id', exam.id)
        .eq('student_id', studentToRemove.id)

      if (error) throw error

      toast({
        title: '제외 완료',
        description: `${studentToRemove.name} 학생이 시험에서 제외되었습니다.`,
      })

      loadStudents()
    } catch (error) {
      console.error('Error removing student:', error)
      toast({
        title: '제외 오류',
        description: '학생을 제외하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsRemoving(false)
      setDeleteDialogOpen(false)
      setStudentToRemove(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{exam.name}</h1>
          <p className="text-muted-foreground mt-1">{exam.description || '시험 정보 및 학생 배정'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/grades/exams/${exam.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            시험 수정
          </Button>
          <Button
            onClick={() => router.push(`/grades/exams/${exam.id}/bulk-entry`)}
          >
            <PenSquare className="h-4 w-4 mr-2" />
            성적 입력
          </Button>
        </div>
      </div>

      {/* Exam Info Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              시험 유형
            </CardDescription>
            <CardTitle className="text-lg">
              {getExamTypeLabel(exam.exam_type)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              시험일
            </CardDescription>
            <CardTitle className="text-lg">
              {exam.exam_date
                ? new Date(exam.exam_date).toLocaleDateString('ko-KR')
                : '미정'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              수업
            </CardDescription>
            <CardTitle className="text-lg">
              {exam.classes?.[0]?.name || '미배정'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              문항 수
            </CardDescription>
            <CardTitle className="text-lg">
              {exam.total_questions || '-'}문항
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              배정 인원
            </CardDescription>
            <CardTitle className="text-lg text-primary">
              {students.length}명
            </CardTitle>
          </CardHeader>
        </Card>
        {exam.is_recurring && (
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                반복 주기
              </CardDescription>
              <CardTitle className="text-lg">
                {getRecurringScheduleLabel(exam.recurring_schedule)}
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>배정된 학생</CardTitle>
                <CardDescription>
                  이 시험에 배정된 학생들입니다. 성적 입력 시 이 학생들만 표시됩니다.
                </CardDescription>
              </div>
              <Button onClick={() => setShowAssignDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                학생 배정
              </Button>
            </div>
            {students.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="학생 이름, 학번으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Badge variant="secondary" className="h-10 px-4 flex items-center whitespace-nowrap">
                  {filteredStudents.length}명
                </Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              로딩 중...
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="배정된 학생이 없습니다"
              description="학생을 배정하면 성적을 입력할 수 있습니다"
              action={
                <Button onClick={() => setShowAssignDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  학생 배정하기
                </Button>
              }
            />
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{student.name}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{student.student_code}</span>
                        {student.grade && (
                          <>
                            <span>·</span>
                            <Badge variant="outline" className="text-xs">
                              {student.grade}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveClick(student.id, student.name)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {students.length > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">다음 단계</h3>
                <p className="text-sm text-muted-foreground">
                  {students.length}명의 학생이 배정되었습니다. 성적을 입력하세요.
                </p>
              </div>
              <Button size="lg" onClick={() => router.push(`/grades/exams/${exam.id}/bulk-entry`)}>
                <PenSquare className="h-5 w-5 mr-2" />
                성적 입력 시작
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign Students Dialog */}
      <AssignStudentsDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        examId={exam.id}
        classId={exam.class_id}
        onSuccess={() => {
          loadStudents()
          setShowAssignDialog(false)
        }}
      />

      {/* Remove Student Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="학생을 시험에서 제외하시겠습니까?"
        description={studentToRemove ? `"${studentToRemove.name}" 학생의 성적 데이터도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.` : ''}
        confirmText="제외"
        variant="destructive"
        isLoading={isRemoving}
        onConfirm={handleConfirmRemove}
      />
    </div>
  )
}
