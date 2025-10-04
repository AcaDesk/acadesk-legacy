'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2, FileText, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"

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
}

interface ExamCategory {
  code: string
  label: string
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [filteredExams, setFilteredExams] = useState<Exam[]>([])
  const [categories, setCategories] = useState<ExamCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterExams()
  }, [searchTerm, exams])

  async function loadData() {
    try {
      setLoading(true)

      // Load exam categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('ref_exam_categories')
        .select('code, label')
        .eq('active', true)
        .order('sort_order')

      if (categoriesError) throw categoriesError
      setCategories(categoriesData)

      // Load exams
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('id, name, category_code, exam_type, exam_date, total_questions, description, created_at')
        .is('deleted_at', null)
        .order('exam_date', { ascending: false })

      if (examsError) throw examsError

      // Get score counts for each exam
      const examsWithCounts = await Promise.all(
        (examsData || []).map(async (exam) => {
          const { count } = await supabase
            .from('exam_scores')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', exam.id)

          return {
            ...exam,
            _count: { exam_scores: count || 0 }
          }
        })
      )

      setExams(examsWithCounts)
      setFilteredExams(examsWithCounts)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: '데이터 로드 오류',
        description: '시험 정보를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function filterExams() {
    let filtered = exams

    if (searchTerm) {
      filtered = filtered.filter((exam) => {
        const name = exam.name?.toLowerCase() || ''
        const description = exam.description?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()

        return name.includes(search) || description.includes(search)
      })
    }

    setFilteredExams(filtered)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 시험을 삭제하시겠습니까?\n\n이 시험과 연결된 모든 성적 데이터도 함께 삭제됩니다.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('exams')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      toast({
        title: '삭제 완료',
        description: `${name} 시험이 삭제되었습니다.`,
      })

      loadData()
    } catch (error) {
      console.error('Error deleting exam:', error)
      toast({
        title: '삭제 오류',
        description: '시험을 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  function getCategoryLabel(code: string | null) {
    if (!code) return '-'
    const category = categories.find((c) => c.code === code)
    return category?.label || code
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
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
                        <TableCell className="font-medium">{exam.name}</TableCell>
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
                              variant="ghost"
                              size="icon"
                              onClick={() => router.push(`/grades/exams/${exam.id}/edit`)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(exam.id, exam.name)}
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
              <CardTitle className="text-3xl">{exams.length}개</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>이번 달 시험</CardDescription>
              <CardTitle className="text-3xl">
                {exams.filter((e) => {
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
                {exams.reduce((sum, exam) => sum + (exam._count?.exam_scores || 0), 0)}명
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
