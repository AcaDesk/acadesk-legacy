'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Label } from '@ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Textarea } from '@ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Repeat, Loader2 } from 'lucide-react'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { ClassSelector } from '@/components/features/common/class-selector'
import { getSubjects } from '@/app/actions/subjects'

interface ExamCategory {
  code: string
  label: string
}

interface Class {
  id: string
  name: string
  subject: string | null
  active: boolean
}

interface Subject {
  id: string
  name: string
  code: string | null
  color: string
  active: boolean
}

interface ExamTemplateData {
  tenant_id: string
  name: string
  subject_id: string | null
  category_code: string | null
  exam_type: string | null
  total_questions: number | null
  passing_score: number | null
  recurring_schedule: string
  is_recurring: boolean
  class_id: string | null
  description: string | null
}

export default function NewExamTemplatePage() {
  // All Hooks must be called before any early returns
  const [name, setName] = useState('')
  const [subjectId, setSubjectId] = useState('none')
  const [categoryCode, setCategoryCode] = useState('none')
  const [examType, setExamType] = useState('none')
  const [totalQuestions, setTotalQuestions] = useState('')
  const [passingScore, setPassingScore] = useState('')
  const [recurringSchedule, setRecurringSchedule] = useState('weekly')
  const [classId, setClassId] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState<ExamCategory[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { user: currentUser, loading: userLoading } = useCurrentUser()

  const loadCategories = useCallback(async () => {
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
  }, [supabase])

  const loadClasses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, subject, active')
        .eq('active', true)
        .is('deleted_at', null)
        .order('name')

      if (error) throw error
      setClasses(data)
    } catch (error) {
      console.error('Error loading classes:', error)
    }
  }, [supabase])

  const loadSubjects = useCallback(async () => {
    const result = await getSubjects()
    if (result.success && result.data) {
      setSubjects(result.data)
    }
  }, [])

  // useEffect must be called before any early returns
  useEffect(() => {
    loadCategories()
    loadClasses()
    loadSubjects()
  }, [loadCategories, loadClasses, loadSubjects])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!currentUser || !currentUser.tenantId) {
      toast({
        title: '인증 오류',
        description: '로그인 정보를 확인할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const templateData: ExamTemplateData = {
        tenant_id: currentUser.tenantId,
        name,
        subject_id: subjectId && subjectId !== 'none' ? subjectId : null,
        category_code: categoryCode && categoryCode !== 'none' ? categoryCode : null,
        exam_type: examType && examType !== 'none' ? examType : null,
        total_questions: totalQuestions ? parseInt(totalQuestions) : null,
        passing_score: passingScore ? parseFloat(passingScore) : null,
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
    } catch (error: unknown) {
      console.error('Error creating template:', error)
      const errorMessage = error instanceof Error ? error.message : '템플릿을 등록하는 중 오류가 발생했습니다.'
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
    return <ComingSoon featureName="시험 템플릿 등록" description="반복되는 시험을 템플릿으로 등록하여 자동으로 생성하고 관리할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="시험 템플릿 등록" reason="템플릿 시스템 업데이트가 진행 중입니다." />;
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">시험 템플릿 등록</h1>
            <p className="text-muted-foreground mt-1">반복적으로 생성할 시험 템플릿을 등록합니다</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              템플릿 등록
            </Button>
          </div>
        </div>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
            <CardDescription>템플릿의 기본 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="subject">과목</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="과목 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span>{subject.name}</span>
                        {subject.code && (
                          <span className="text-muted-foreground text-xs">({subject.code})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                시험이 속한 과목을 선택하세요 (Voca, Reading, Speaking 등)
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">시험 분류</Label>
                <Select
                  value={categoryCode}
                  onValueChange={setCategoryCode}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">미분류</SelectItem>
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
                <Select
                  value={examType}
                  onValueChange={setExamType}
                >
                  <SelectTrigger id="examType">
                    <SelectValue placeholder="유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">미선택</SelectItem>
                    <SelectItem value="vocabulary">단어시험</SelectItem>
                    <SelectItem value="midterm">중간고사</SelectItem>
                    <SelectItem value="final">기말고사</SelectItem>
                    <SelectItem value="quiz">퀴즈</SelectItem>
                    <SelectItem value="mock">모의고사</SelectItem>
                    <SelectItem value="assignment">과제</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">수업</Label>
              <ClassSelector
                value={classId}
                onChange={setClassId}
                placeholder="수업 선택 (선택사항)"
                classes={classes}
              />
              <p className="text-xs text-muted-foreground">
                수업과 연결하면 해당 수업의 학생들에게 시험을 배정할 수 있습니다
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Exam Details */}
        <Card>
          <CardHeader>
            <CardTitle>시험 상세</CardTitle>
            <CardDescription>시험의 상세 정보를 입력하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="totalQuestions">총 문항 수</Label>
                <Input
                  id="totalQuestions"
                  type="number"
                  min="1"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(e.target.value)}
                  placeholder="예: 20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passingScore">합격 점수 (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                  placeholder="예: 60"
                />
                <p className="text-xs text-muted-foreground">합격 기준 점수를 백분율로 입력하세요</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">템플릿 설명</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="템플릿에 대한 설명이나 특이사항을 입력하세요"
                className="min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recurring Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-info" />
              <CardTitle>반복 설정</CardTitle>
            </div>
            <CardDescription>
              템플릿을 기반으로 주기적으로 시험을 자동 생성할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recurrence">반복 주기 *</Label>
              <Select value={recurringSchedule} onValueChange={setRecurringSchedule}>
                <SelectTrigger id="recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">매일</SelectItem>
                  <SelectItem value="weekly_mon_wed_fri">매주 월수금</SelectItem>
                  <SelectItem value="weekly_tue_thu">매주 화목</SelectItem>
                  <SelectItem value="weekly">매주 (같은 요일)</SelectItem>
                  <SelectItem value="biweekly">격주</SelectItem>
                  <SelectItem value="monthly">매월</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                이 템플릿으로 시험을 생성할 주기입니다. 단어시험은 보통 매일 또는 월수금으로 설정합니다.
              </p>
            </div>

            {/* Examples */}
            <Card className="bg-muted/50 border-none">
              <CardContent className="pt-6">
                <h4 className="font-semibold text-sm mb-2">💡 사용 예시</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <strong>매일 단어 시험</strong>: 매일 자동 생성</li>
                  <li>• <strong>월수금 단어 시험</strong>: 월요일, 수요일, 금요일에 자동 생성</li>
                  <li>• <strong>매주 퀴즈</strong>: 매주 같은 요일에 자동 생성</li>
                  <li>• <strong>매월 종합 평가</strong>: 매월 말일에 자동 생성</li>
                </ul>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </form>
    </PageWrapper>
  )
}
