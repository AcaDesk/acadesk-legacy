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
import { ArrowLeft, Repeat } from 'lucide-react'

interface ExamCategory {
  code: string
  label: string
}

interface Class {
  id: string
  name: string
  subject: string | null
}

export default function NewExamTemplatePage() {
  const [name, setName] = useState('')
  const [categoryCode, setCategoryCode] = useState('')
  const [examType, setExamType] = useState('')
  const [totalQuestions, setTotalQuestions] = useState('')
  const [recurringSchedule, setRecurringSchedule] = useState('weekly')
  const [classId, setClassId] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState<ExamCategory[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser, loading: userLoading } = useCurrentUser()

  useEffect(() => {
    loadCategories()
    loadClasses()
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
      const templateData: any = {
        tenant_id: currentUser.tenantId,
        name,
        category_code: categoryCode || null,
        exam_type: examType || null,
        total_questions: totalQuestions ? parseInt(totalQuestions) : null,
        recurring_schedule: recurringSchedule,
        is_recurring: true,
        class_id: classId || null,
        description: description || null,
      }

      const { error } = await supabase.from('exams').insert(templateData)

      if (error) throw error

      toast({
        title: '템플릿 등록 완료',
        description: `${name} 템플릿이 등록되었습니다.`,
      })

      router.push('/grades/exam-templates')
    } catch (error: any) {
      console.error('Error creating template:', error)
      toast({
        title: '등록 오류',
        description: error.message || '템플릿을 등록하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push('/grades/exam-templates')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">시험 템플릿 등록</h1>
            <p className="text-muted-foreground">반복적으로 생성할 시험 템플릿을 등록합니다</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-blue-600" />
              <CardTitle>템플릿 정보</CardTitle>
            </div>
            <CardDescription>
              템플릿을 기반으로 주기적으로 시험을 자동 생성할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Template Name */}
              <div className="space-y-2">
                <Label htmlFor="name">템플릿명 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 주간 단어 시험"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  시험 생성 시 날짜가 자동으로 추가됩니다
                </p>
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

              {/* Recurrence and Questions */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="recurrence">반복 주기 *</Label>
                  <Select value={recurringSchedule} onValueChange={setRecurringSchedule}>
                    <SelectTrigger id="recurrence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">주간 (매주)</SelectItem>
                      <SelectItem value="monthly">월간 (매달)</SelectItem>
                      <SelectItem value="quarterly">분기별 (3개월마다)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    이 템플릿으로 시험을 생성할 주기입니다
                  </p>
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
                <Label htmlFor="description">템플릿 설명</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="이 템플릿에 대한 설명을 입력하세요..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Examples */}
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-sm mb-2">💡 사용 예시</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• <strong>주간 단어 시험</strong>: 매주 월요일에 자동 생성</li>
                    <li>• <strong>월간 종합 평가</strong>: 매월 말일에 자동 생성</li>
                    <li>• <strong>분기별 레벨 테스트</strong>: 3개월마다 자동 생성</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push('/grades/exam-templates')}
                  disabled={loading}
                >
                  취소
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? '등록 중...' : '템플릿 등록'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
