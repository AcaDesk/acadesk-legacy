'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Plus, Edit, Trash2, FileText, Search, PenSquare, UserPlus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { deleteExam } from '@/app/actions/exams'
import { ConfirmationDialog } from '@ui/confirmation-dialog'

interface Exam {
  id: string
  name: string
  category_code: string | null
  exam_type: string | null
  exam_date: string | null
  total_questions: number | null
  description: string | null
  created_at: string
  _count?: {
    exam_scores: number
  }
  classes?: {
    id: string
    name: string
  } | {
    id: string
    name: string
  }[] | null
}

interface ExamCategory {
  code: string
  label: string
}

interface ExamsClientProps {
  initialExams: Exam[]
  categories: ExamCategory[]
}

export function ExamsClient({ initialExams, categories }: ExamsClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [examToDelete, setExamToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter exams based on search
  const filteredExams = useMemo(() => {
    if (!searchTerm) return initialExams

    return initialExams.filter((exam) => {
      const name = exam.name?.toLowerCase() || ''
      const description = exam.description?.toLowerCase() || ''
      const search = searchTerm.toLowerCase()

      return name.includes(search) || description.includes(search)
    })
  }, [initialExams, searchTerm])

  function handleDeleteClick(id: string, name: string) {
    setExamToDelete({ id, name })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!examToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteExam(examToDelete.id)

      if (!result.success) {
        throw new Error(result.error || '시험 삭제에 실패했습니다')
      }

      toast({
        title: '삭제 완료',
        description: `${examToDelete.name} 시험이 삭제되었습니다.`,
      })

      router.refresh()
    } catch (error) {
      console.error('Error deleting exam:', error)
      toast({
        title: '삭제 오류',
        description: error instanceof Error ? error.message : '시험을 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setExamToDelete(null)
    }
  }

  function getCategoryLabel(code: string | null) {
    if (!code) return '-'
    const category = categories.find((c) => c.code === code)
    return category?.label || code
  }

  function getExamTypeLabel(type: string | null) {
    if (!type) return '-'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">시험 관리</h1>
          <p className="text-muted-foreground">시험을 등록하고 관리합니다</p>
        </div>
        <Button onClick={() => router.push('/grades/exams/new')}>
          <Plus className="h-4 w-4 mr-2" />
          시험 등록
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="시험명, 설명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary" className="h-10 px-4 flex items-center">
          {filteredExams.length}개 시험
        </Badge>
      </div>

      {/* Exams Table */}
      <Card>
        <CardHeader>
          <CardTitle>시험 목록</CardTitle>
          <CardDescription>
            등록된 모든 시험을 확인하고 관리할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredExams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>등록된 시험이 없습니다.</p>
              {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>시험명</TableHead>
                    <TableHead>시험 유형</TableHead>
                    <TableHead>분류</TableHead>
                    <TableHead>시험일</TableHead>
                    <TableHead className="text-center">문항 수</TableHead>
                    <TableHead className="text-center">응시 인원</TableHead>
                    <TableHead>설명</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => router.push(`/grades/exams/${exam.id}`)}
                          className="hover:text-primary hover:underline text-left"
                        >
                          {exam.name}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getExamTypeLabel(exam.exam_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(exam.category_code)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {exam.exam_date
                          ? new Date(exam.exam_date).toLocaleDateString('ko-KR')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {exam.total_questions || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {exam._count?.exam_scores || 0}명
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {exam.description ? (
                          <div className="text-sm text-muted-foreground truncate">
                            {exam.description}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/grades/exams/${exam.id}`)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            학생 배정
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/grades/exams/${exam.id}/bulk-entry`)}
                          >
                            <PenSquare className="h-4 w-4 mr-2" />
                            성적 입력
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/grades/exams/${exam.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(exam.id, exam.name)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>총 시험 수</CardDescription>
            <CardTitle className="text-3xl">{initialExams.length}개</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>이번 달 시험</CardDescription>
            <CardTitle className="text-3xl">
              {initialExams.filter((e) => {
                if (!e.exam_date) return false
                const examDate = new Date(e.exam_date)
                const now = new Date()
                return (
                  examDate.getMonth() === now.getMonth() &&
                  examDate.getFullYear() === now.getFullYear()
                )
              }).length}개
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>총 응시 인원</CardDescription>
            <CardTitle className="text-3xl">
              {initialExams.reduce((sum, exam) => sum + (exam._count?.exam_scores || 0), 0)}명
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="시험을 삭제하시겠습니까?"
        description={examToDelete ? `"${examToDelete.name}" 시험과 연결된 모든 성적 데이터가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.` : ''}
        confirmText="삭제"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
