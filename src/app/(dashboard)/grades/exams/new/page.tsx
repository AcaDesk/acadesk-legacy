'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { ChevronRight } from 'lucide-react'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface ExamCategory {
  code: string
  label: string
}

interface Class {
  id: string
  name: string
  subject: string | null
}

interface ExamData {
  tenant_id: string
  name: string
  category_code: string | null
  exam_type: string | null
  exam_date: string | null
  total_questions: number | null
  class_id: string | null
  description: string | null
}

export default function NewExamPage() {
  // All Hooks must be called before any early returns
  const [name, setName] = useState('')
  const [categoryCode, setCategoryCode] = useState('')
  const [examType, setExamType] = useState('')
  const [examDate, setExamDate] = useState('')
  const [totalQuestions, setTotalQuestions] = useState('')
  const [classId, setClassId] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState<ExamCategory[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser, loading: userLoading } = useCurrentUser()

  // useEffect must be called before any early returns
  useEffect(() => {
    loadCategories()
    loadClasses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from('ref_exam_categories')
        .select('code, label')
        .eq('active', true)
        .order('sort_order')

      if (error) throw error
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  async function loadClasses() {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, subject')
        .eq('active', true)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setClasses(data)
    } catch (error) {
      console.error('Error loading classes:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!currentUser) {
      toast({
        title: '인증 오류',
        description: '로그인 정보를 확인할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const examData: ExamData = {
        tenant_id: currentUser.tenantId,
        name,
        category_code: categoryCode || null,
        exam_type: examType || null,
        exam_date: examDate || null,
        total_questions: totalQuestions ? parseInt(totalQuestions) : null,
        class_id: classId || null,
        description: description || null,
      }

      const { error } = await supabase.from('exams').insert(examData)

      if (error) throw error

      toast({
        title: '시험 등록 완료',
        description: `${name} 시험이 등록되었습니다.`,
      })

      router.push('/grades/exams')
    } catch (error: unknown) {
      console.error('Error creating exam:', error)
      const errorMessage = error instanceof Error ? error.message : '시험을 등록하는 중 오류가 발생했습니다.'
      toast({
        title: '등록 오류',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.gradesManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="시험 등록" description="새로운 시험을 등록하고 학생들의 성적을 체계적으로 관리할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="시험 등록" reason="시험 시스템 업데이트가 진행 중입니다." />;
  }

  if (userLoading) {
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
      <div className="space-y-6 max-w-2xl">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push('/grades')}
            className="hover:text-foreground transition-colors"
          >
            성적 관리
          </button>
          <ChevronRight className="h-4 w-4" />
          <button
            onClick={() => router.push('/grades/exams')}
            className="hover:text-foreground transition-colors"
          >
            시험 관리
          </button>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">새 시험</span>
        </nav>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">시험 등록</h1>
          <p className="text-muted-foreground">새로운 시험을 등록합니다</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>시험 정보</CardTitle>
            <CardDescription>
              시험의 기본 정보를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Exam Name */}
              <div className="space-y-2">
                <Label htmlFor="name">시험명 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 2024년 1학기 중간고사"
                  required
                />
              </div>

              {/* Category and Type */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">시험 분류</Label>
                  <Select value={categoryCode} onValueChange={setCategoryCode}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="분류 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">선택 안 함</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.code} value={cat.code}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="examType">시험 유형</Label>
                  <Select value={examType} onValueChange={setExamType}>
                    <SelectTrigger id="examType">
                      <SelectValue placeholder="유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">선택 안 함</SelectItem>
                      <SelectItem value="written">필기시험</SelectItem>
                      <SelectItem value="oral">구술시험</SelectItem>
                      <SelectItem value="practical">실기시험</SelectItem>
                      <SelectItem value="quiz">퀴즈</SelectItem>
                      <SelectItem value="project">프로젝트</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Date and Questions */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="examDate">시험일</Label>
                  <Input
                    id="examDate"
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalQuestions">전체 문항 수</Label>
                  <Input
                    id="totalQuestions"
                    type="number"
                    min="1"
                    value={totalQuestions}
                    onChange={(e) => setTotalQuestions(e.target.value)}
                    placeholder="예: 32"
                  />
                </div>
              </div>

              {/* Class */}
              <div className="space-y-2">
                <Label htmlFor="class">수업</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger id="class">
                    <SelectValue placeholder="수업 선택 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">선택 안 함</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.subject && `- ${cls.subject}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  특정 수업과 연결하려면 선택하세요
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">시험 설명</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="시험에 대한 추가 정보를 입력하세요..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push('/grades/exams')}
                  disabled={loading}
                >
                  취소
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? '등록 중...' : '시험 등록'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
