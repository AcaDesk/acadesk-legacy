'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import {
  Edit,
  PenSquare,
  Users,
  Calendar,
  BookOpen,
  FileText,
  UserPlus,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AssignStudentsDialog } from '@/components/features/exams/assign-students-dialog'
import { createClient } from '@/lib/supabase/client'

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
  const supabase = createClient()

  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssignDialog, setShowAssignDialog] = useState(false)

  useEffect(() => {
    loadStudents()
  }, [exam.id])

  async function loadStudents() {
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

  async function handleRemoveStudent(studentId: string, studentName: string) {
    if (!confirm(`${studentName} 학생을 이 시험에서 제외하시겠습니까?\n\n해당 학생의 성적 데이터도 함께 삭제됩니다.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('exam_scores')
        .delete()
        .eq('exam_id', exam.id)
        .eq('student_id', studentId)

      if (error) throw error

      toast({
        title: '제외 완료',
        description: `${studentName} 학생이 시험에서 제외되었습니다.`,
      })

      loadStudents()
    } catch (error) {
      console.error('Error removing student:', error)
      toast({
        title: '제외 오류',
        description: '학생을 제외하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
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
      <div className="grid gap-4 md:grid-cols-4">
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
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              로딩 중...
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">아직 배정된 학생이 없습니다.</p>
              <Button onClick={() => setShowAssignDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                학생 배정하기
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
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
                    onClick={() => handleRemoveStudent(student.id, student.name)}
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
    </div>
  )
}
