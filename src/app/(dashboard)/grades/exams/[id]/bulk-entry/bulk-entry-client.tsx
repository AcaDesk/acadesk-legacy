'use client'

import { useState, useEffect, useRef, KeyboardEvent, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Checkbox } from '@ui/checkbox'
import { Label } from '@ui/label'
import { Progress } from '@ui/progress'
import { Textarea } from '@ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Save, AlertCircle, Copy, TrendingUp, BarChart, ChevronDown, ChevronUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Separator } from '@ui/separator'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { bulkUpsertExamScores } from '@/app/actions/grades'
import { PAGE_ANIMATIONS, getListItemAnimation } from '@/lib/animation-config'
import { LoadingState, EmptyState } from '@/components/ui/loading-state'
import { cn } from '@/lib/utils'

interface Exam {
  id: string
  name: string
  total_questions: number | null
  exam_date: string | null
}

interface Student {
  id: string
  student_code: string
  grade: string | null
  users: {
    name: string
  } | null
}

interface ScoreEntry {
  student_id: string
  correct: string
  total: string
  percentage: number
  feedback: string
}

type StatusFilter =
  | 'all'
  | 'not-entered'
  | 'entered'
  | 'passed'
  | 'failed'
  | 'excellent'

interface BulkGradeEntryClientProps {
  exam: Exam
}

// Safe number parsing utility
const safeParseInt = (value: string): number => {
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? 0 : n
}

// Percentage calculation helper
const computePercentage = (correct: number, total: number): number => {
  if (total <= 0) return 0
  return Math.round((correct / total) * 100)
}

// Score state helper
const getScoreState = (score?: ScoreEntry): 'empty' | 'no-total' | 'over' | 'ok' => {
  if (!score?.correct || !score?.total) return 'empty'

  const correctNumber = safeParseInt(score.correct)
  const totalNumber = safeParseInt(score.total)

  if (totalNumber === 0) return 'no-total'
  if (correctNumber > totalNumber) return 'over' // 맞은 개수가 문항 수보다 많음

  return 'ok'
}

export function BulkGradeEntryClient({ exam }: BulkGradeEntryClientProps) {
  // All Hooks must be called before any early returns
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser, isLoading: isUserLoading } = useCurrentUser()
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Map<string, ScoreEntry>>(new Map())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [gradeFilter, setGradeFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSave, setAutoSave] = useState(false)
  const [bulkFeedback, setBulkFeedback] = useState('')
  const [showBulkFeedback, setShowBulkFeedback] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showDistribution, setShowDistribution] = useState(true)
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null)

  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const loadData = useCallback(async () => {
    if (!currentUser || !currentUser.tenantId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const supabase = createClient()

      // Get students assigned to this exam (from exam_scores table)
      const { data: examScores, error: scoresError } = await supabase
        .from('exam_scores')
        .select(`
          student_id,
          score,
          total_points,
          percentage,
          feedback,
          students (
            id,
            student_code,
            grade,
            users!user_id(name)
          )
        `)
        .eq('tenant_id', currentUser.tenantId)
        .eq('exam_id', exam.id)

      if (scoresError) throw scoresError

      // Extract student data from exam_scores
      const studentsData: Student[] = (examScores || []).map((score: any) => ({
        id: score.students.id,
        student_code: score.students.student_code,
        grade: score.students.grade,
        users: score.students.users ? { name: score.students.users.name } : null,
      })).sort((a, b) => a.student_code.localeCompare(b.student_code))

      setStudents(studentsData)

      // Create scores map
      const scoresMap = new Map<string, ScoreEntry>()
      examScores?.forEach((existing: any) => {
        const defaultTotal = exam.total_questions?.toString() || ''

        scoresMap.set(existing.student_id, {
          student_id: existing.student_id,
          correct: existing.score?.toString() || '',
          total: existing.total_points?.toString() || defaultTotal,
          percentage: existing.percentage || 0,
          feedback: existing.feedback || '',
        })
      })
      setScores(scoresMap)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: '로드 오류',
        description: '데이터를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [exam.id, toast, currentUser])

  const handleSave = useCallback(async (navigateAfterSave = false, silent = false) => {
    setSaving(true)
    try {
      const scoresToSave = Array.from(scores.values())
        .filter(score => score.correct && score.total)
        .map(score => ({
          student_id: score.student_id,
          score: safeParseInt(score.correct),
          total_points: safeParseInt(score.total),
          percentage: score.percentage,
          feedback: score.feedback || null,
        }))

      if (scoresToSave.length === 0 && !silent) {
        toast({
          title: '입력 필요',
          description: '최소 1명 이상의 성적을 입력해주세요.',
          variant: 'destructive',
        })
        return
      }

      // Use Server Action
      const result = await bulkUpsertExamScores({
        exam_id: exam.id,
        scores: scoresToSave,
      })

      if (!result.success) {
        throw new Error(result.error || '성적 일괄 입력 실패')
      }

      setLastSaved(new Date())

      if (!silent) {
        toast({
          title: '저장 완료',
          description: `${scoresToSave.length}명의 성적이 저장되었습니다.`,
        })

        if (navigateAfterSave) {
          router.push(`/grades/exams`)
        }
      }
    } catch (error) {
      console.error('Error saving scores:', error)
      if (!silent) {
        toast({
          title: '저장 오류',
          description: error instanceof Error ? error.message : '성적을 저장하는 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    } finally {
      setSaving(false)
    }
  }, [exam.id, scores, toast, router])

  // useEffect must be called before any early returns
  useEffect(() => {
    if (!isUserLoading) {
      loadData()
    }
  }, [loadData, isUserLoading])

  // Auto-save effect
  useEffect(() => {
    if (!autoSave) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(false, true) // navigateAfterSave=false, silent=true
    }, 3000) // 3초 후 자동 저장

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [scores, autoSave, handleSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  // Keyboard shortcut: Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const saveKey = isMac ? e.metaKey : e.ctrlKey

      if (saveKey && e.key === 's') {
        e.preventDefault()
        // 자동저장 중이라도 수동 저장은 바로 실행
        handleSave(false, false)
      }
    }

    window.addEventListener('keydown', handleKeyDown as any)
    return () => window.removeEventListener('keydown', handleKeyDown as any)
  }, [handleSave])

  function handleCorrectChange(studentId: string, value: string) {
    setScores(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(studentId) || {
        student_id: studentId,
        correct: '',
        total: exam?.total_questions?.toString() || '',
        percentage: 0,
        feedback: '',
      }

      const correctNumber = Math.max(0, safeParseInt(value))
      const totalNumber = safeParseInt(current.total)
      const percentage = computePercentage(correctNumber, totalNumber)

      newMap.set(studentId, {
        ...current,
        correct: value, // 사용자가 입력한 raw 값 (문자열) 유지
        percentage,
      })

      return newMap
    })
  }

  function handleTotalChange(studentId: string, value: string) {
    setScores(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(studentId) || {
        student_id: studentId,
        correct: '',
        total: '',
        percentage: 0,
        feedback: '',
      }

      const totalNumber = Math.max(0, safeParseInt(value))
      const correctNumber = safeParseInt(current.correct)
      const percentage = computePercentage(correctNumber, totalNumber)

      newMap.set(studentId, {
        ...current,
        total: value,
        percentage,
      })

      return newMap
    })
  }

  function handleFeedbackChange(studentId: string, feedback: string) {
    setScores(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(studentId)
      if (current) {
        newMap.set(studentId, { ...current, feedback })
      }
      return newMap
    })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, studentId: string, field: 'correct' | 'total' | 'feedback') {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()

      const currentIndex = students.findIndex(s => s.id === studentId)

      if (field === 'correct') {
        // Move to total input of same student
        const totalInput = inputRefs.current.get(`total-${studentId}`)
        totalInput?.focus()
      } else if (field === 'total') {
        // Move to feedback input of same student
        const feedbackInput = inputRefs.current.get(`feedback-${studentId}`)
        feedbackInput?.focus()
      } else if (field === 'feedback') {
        // Move to next student's correct input
        const nextIndex = currentIndex + 1
        if (nextIndex < students.length) {
          const nextStudent = students[nextIndex]
          const nextInput = inputRefs.current.get(`correct-${nextStudent.id}`)
          nextInput?.focus()
        }
      }
    }
  }

  function applyBulkFeedback() {
    if (!bulkFeedback.trim()) return

    setScores(prev => {
      const newMap = new Map(prev)
      students.forEach(student => {
        const current = newMap.get(student.id)
        if (current) {
          newMap.set(student.id, { ...current, feedback: bulkFeedback })
        }
      })
      return newMap
    })

    toast({
      title: '코멘트 적용 완료',
      description: `${students.length}명의 학생에게 코멘트가 적용되었습니다.`,
    })

    setBulkFeedback('')
    setShowBulkFeedback(false)
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.gradesManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="성적 일괄 입력" description="한 시험의 모든 학생 성적을 한 화면에서 빠르게 입력하고 통계를 확인할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="성적 일괄 입력" reason="성적 입력 시스템 업데이트가 진행 중입니다." />;
  }

  if (isUserLoading || loading) {
    return (
      <PageWrapper>
        <LoadingState variant="card" message="로딩 중..." />
      </PageWrapper>
    )
  }

  if (!currentUser || !currentUser.tenantId) {
    return (
      <PageWrapper>
        <EmptyState
          icon={<AlertCircle className="h-12 w-12" />}
          title="사용자 정보를 불러올 수 없습니다"
          description="로그인이 필요하거나 권한이 없습니다."
          action={
            <Button onClick={() => router.push('/login')}>로그인 페이지로 이동</Button>
          }
        />
      </PageWrapper>
    )
  }

  // Get unique grades from students
  const availableGrades = Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort()

  // Score list to avoid repeated Array.from calls
  const scoreList = Array.from(scores.values())

  // Stats calculation
  const enteredList = scoreList.filter(s => s.correct && s.total)
  const enteredCount = enteredList.length

  const stats = {
    total: students.length,
    entered: enteredCount,
    passed: enteredList.filter(s => s.percentage >= 70).length,
    failed: enteredList.filter(s => s.percentage > 0 && s.percentage < 70).length,
    notEntered: students.length - enteredCount,
  }

  // Progress percentage
  const progressPercentage = stats.total > 0 ? Math.round((stats.entered / stats.total) * 100) : 0

  // Distribution calculation
  const distribution = {
    range90: scoreList.filter(s => s.percentage >= 90).length,
    range80: scoreList.filter(s => s.percentage >= 80 && s.percentage < 90).length,
    range70: scoreList.filter(s => s.percentage >= 70 && s.percentage < 80).length,
    range60: scoreList.filter(s => s.percentage >= 60 && s.percentage < 70).length,
    range0: scoreList.filter(s => s.percentage > 0 && s.percentage < 60).length,
  }

  // Average score
  const averageScore = stats.entered === 0
    ? 0
    : Math.round(
        scoreList
          .filter(s => s.percentage > 0)
          .reduce((acc, s) => acc + s.percentage, 0) / stats.entered
      )

  // Filter students based on grade, search, and status
  const filteredStudents = students.filter(student => {
    // Grade filter
    if (gradeFilter !== 'all' && student.grade !== gradeFilter) {
      return false
    }

    // Search filter
    if (searchTerm.trim()) {
      const keyword = searchTerm.trim().toLowerCase()
      const code = student.student_code.toLowerCase()
      const name = (student.users?.name || '').toLowerCase()

      if (!code.includes(keyword) && !name.includes(keyword)) {
        return false
      }
    }

    // Status filter
    const score = scores.get(student.id)
    const hasScore = score && score.correct && score.total

    switch (statusFilter) {
      case 'not-entered':
        // 미입력만 보기
        return !hasScore
      case 'entered':
        // 입력 완료만 보기
        return hasScore
      case 'passed':
        // 합격만 보기 (70점 이상)
        return hasScore && score.percentage >= 70
      case 'failed':
        // 미달만 보기 (70점 미만)
        return hasScore && score.percentage > 0 && score.percentage < 70
      case 'excellent':
        // 우수만 보기 (90점 이상)
        return hasScore && score.percentage >= 90
      default:
        // 전체 보기
        return true
    }
  })

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header - Sticky */}
        <section
          aria-label="페이지 헤더"
          className={`${PAGE_ANIMATIONS.header} flex items-start justify-between sticky top-0 z-20 py-4 px-6 -mx-6 bg-background/95 backdrop-blur-sm border-b shadow-sm transition-all duration-200`}
        >
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">성적 일괄 입력</h1>
            <p className="text-base text-muted-foreground">{exam.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="autoSaveHeader"
                checked={autoSave}
                onCheckedChange={(checked) => setAutoSave(checked as boolean)}
              />
              <Label htmlFor="autoSaveHeader" className="text-sm cursor-pointer">
                자동 저장
              </Label>
            </div>
            {autoSave && (
              <span className="text-xs text-muted-foreground hidden lg:block">
                (3초마다)
              </span>
            )}
            {lastSaved && (
              <span className="text-sm text-muted-foreground">
                마지막 저장: {lastSaved.toLocaleTimeString('ko-KR')}
              </span>
            )}
            <Separator orientation="vertical" className="h-6" />
            <Button
              variant="outline"
              onClick={() => handleSave(false, false)}
              disabled={saving}
              title="Ctrl+S 또는 Cmd+S"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? '저장 중...' : autoSave ? '지금 바로 저장' : '저장'}
              <span className="ml-1 text-xs text-muted-foreground hidden lg:inline">
                (Ctrl+S)
              </span>
            </Button>
            <Button onClick={() => handleSave(true, false)} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              저장하고 나가기
            </Button>
          </div>
        </section>

        {/* Progress Bar */}
        <section aria-label="진행 상황" {...PAGE_ANIMATIONS.getSection(0)}>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">입력 진행 상황</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">{stats.entered}</span>
                    <span className="text-sm text-muted-foreground">/{stats.total}명 </span>
                    <span className="text-base font-semibold text-primary ml-1">({progressPercentage}%)</span>
                  </div>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                {stats.notEntered > 0 && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-500">
                    <AlertCircle className="h-4 w-4" />
                    <span>{stats.notEntered}명의 학생이 미입력 상태입니다</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Stats Cards & Distribution */}
        <section
          aria-label="통계 카드"
          className={cn("grid gap-4 md:grid-cols-5", PAGE_ANIMATIONS.getSection(1).className)}
          style={PAGE_ANIMATIONS.getSection(1).style}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">전체 학생</CardDescription>
              <CardTitle className="text-2xl font-bold">{stats.total}명</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">반 평균</CardDescription>
              <CardTitle className="text-2xl font-bold text-blue-600 dark:text-blue-500">{averageScore}점</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">합격 (70점 이상)</CardDescription>
              <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-500">{stats.passed}명</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">미달 (70점 미만)</CardDescription>
              <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-500">{stats.failed}명</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">미입력</CardDescription>
              <CardTitle className="text-2xl font-bold text-orange-600 dark:text-orange-500">{stats.notEntered}명</CardTitle>
            </CardHeader>
          </Card>
        </section>

        {/* Score Distribution Chart */}
        {stats.entered > 0 && (
          <section aria-label="성적 분포" {...PAGE_ANIMATIONS.getSection(2)}>
            <Card>
              <CardHeader
                className="pb-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg"
                onClick={() => setShowDistribution(!showDistribution)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart className="h-4 w-4" />
                    <CardTitle className="text-base font-semibold">성적 분포</CardTitle>
                  </div>
                  {showDistribution ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {showDistribution && (
                  <CardDescription className="text-sm">점수 구간별 학생 수</CardDescription>
                )}
              </CardHeader>
              {showDistribution && (
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">90~100점</span>
                        <span className="text-sm text-muted-foreground">{distribution.range90}명</span>
                      </div>
                      <Progress value={(distribution.range90 / stats.entered) * 100} className="h-2" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">80~89점</span>
                        <span className="text-sm text-muted-foreground">{distribution.range80}명</span>
                      </div>
                      <Progress value={(distribution.range80 / stats.entered) * 100} className="h-2" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">70~79점</span>
                        <span className="text-sm text-muted-foreground">{distribution.range70}명</span>
                      </div>
                      <Progress value={(distribution.range70 / stats.entered) * 100} className="h-2" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">60~69점</span>
                        <span className="text-sm text-muted-foreground">{distribution.range60}명</span>
                      </div>
                      <Progress value={(distribution.range60 / stats.entered) * 100} className="h-2" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">0~59점</span>
                        <span className="text-sm text-muted-foreground">{distribution.range0}명</span>
                      </div>
                      <Progress value={(distribution.range0 / stats.entered) * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </section>
        )}

        {/* Filters & Options */}
        <section aria-label="필터 및 옵션" {...PAGE_ANIMATIONS.getSection(3)}>
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                {availableGrades.length > 0 && (
                  <>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="gradeFilter" className="text-sm">학년:</Label>
                      <Select value={gradeFilter} onValueChange={setGradeFilter}>
                        <SelectTrigger id="gradeFilter" className="w-32 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          {availableGrades.map((grade) => (
                            <SelectItem key={grade} value={grade as string}>
                              {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator orientation="vertical" className="h-6" />
                  </>
                )}

                <div className="flex items-center gap-2">
                  <Label htmlFor="statusFilter" className="text-sm">상태:</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="statusFilter" className="w-40 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 보기</SelectItem>
                      <SelectItem value="not-entered">미입력만 보기</SelectItem>
                      <SelectItem value="entered">입력 완료만 보기</SelectItem>
                      <SelectItem value="excellent">우수 (90점 이상)</SelectItem>
                      <SelectItem value="passed">합격 (70점 이상)</SelectItem>
                      <SelectItem value="failed">미달 (70점 미만)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-2">
                  <Label htmlFor="studentSearch" className="text-sm">
                    학생 검색:
                  </Label>
                  <Input
                    id="studentSearch"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="학번 또는 이름 입력"
                    className="h-9 w-48 text-sm"
                  />
                </div>

                <Separator orientation="vertical" className="h-6" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkFeedback(!showBulkFeedback)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  코멘트 일괄 적용
                </Button>

                <div className="hidden lg:flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Enter/Tab으로 다음 칸 이동 | 맞은 개수 → 전체 문항 → 피드백 순서
                  </span>
                </div>
              </div>

              {showBulkFeedback && (
                <div className="space-y-3 pt-2">
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="bulkFeedback" className="text-sm">모든 학생에게 적용할 코멘트</Label>
                    <Textarea
                      id="bulkFeedback"
                      value={bulkFeedback}
                      onChange={(e) => setBulkFeedback(e.target.value)}
                      placeholder="예: 이번 시험 잘 봤습니다. 꾸준히 노력하세요."
                      rows={3}
                      className="resize-none text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBulkFeedback('')
                          setShowBulkFeedback(false)
                        }}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        onClick={applyBulkFeedback}
                        disabled={!bulkFeedback.trim()}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        {students.length}명에게 적용
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Bulk Entry Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">성적 입력</CardTitle>
            <CardDescription className="text-sm">
              맞은 개수와 전체 문항을 입력하세요. Enter/Tab 키로 다음 칸으로 이동합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg max-h-[560px] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-background border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">학번</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">이름</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground w-20">학년</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground w-24">맞은 개수</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground w-24">전체 문항</th>
                    <th className="text-center p-3 text-xs font-medium text-muted-foreground w-24">득점률</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">피드백</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((student, index) => {
                    const score = scores.get(student.id)
                    const state = getScoreState(score)
                    const isNotEntered = state === 'empty'
                    const isOver = state === 'over'

                    return (
                      <tr
                        key={student.id}
                        {...getListItemAnimation(index, 20)}
                        className={cn(
                          'hover:bg-muted/30 transition-colors',
                          isNotEntered && !isOver && activeStudentId !== student.id && 'bg-orange-50/50 dark:bg-orange-950/10',
                          isOver && activeStudentId !== student.id && 'bg-red-50/60 dark:bg-red-950/20',
                          activeStudentId === student.id && 'bg-primary/10 border-l-4 border-primary shadow-sm'
                        )}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {isNotEntered && (
                              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-500" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {student.student_code}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isNotEntered ? 'text-orange-600 dark:text-orange-500' : ''}`}>
                              {student.users?.name || '이름 없음'}
                            </span>
                            {isNotEntered && (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-600 dark:text-orange-500 dark:border-orange-500">
                                미입력
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {student.grade ? (
                            <Badge variant="outline" className="text-xs">
                              {student.grade}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Input
                            ref={(el) => {
                              if (el) inputRefs.current.set(`correct-${student.id}`, el)
                            }}
                            type="number"
                            min="0"
                            value={score?.correct || ''}
                            onChange={(e) => handleCorrectChange(student.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, student.id, 'correct')}
                            onFocus={() => setActiveStudentId(student.id)}
                            placeholder="0"
                            className={cn(
                              'h-9 text-sm text-center',
                              isNotEntered && 'border-orange-300 focus:border-orange-500 dark:border-orange-800',
                              state === 'over' && 'border-red-500 focus-visible:ring-red-500'
                            )}
                            autoFocus={index === 0 && !searchTerm && gradeFilter === 'all' && statusFilter === 'all'}
                          />
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <Input
                              ref={(el) => {
                                if (el) inputRefs.current.set(`total-${student.id}`, el)
                              }}
                              type="number"
                              min="0"
                              value={score?.total || ''}
                              onChange={(e) => handleTotalChange(student.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, student.id, 'total')}
                              onFocus={() => setActiveStudentId(student.id)}
                              placeholder={exam?.total_questions?.toString() || '0'}
                              className={cn(
                                'h-9 text-sm text-center',
                                state === 'over' && 'border-red-500 focus-visible:ring-red-500'
                              )}
                            />
                            {state === 'over' && (
                              <p className="text-[11px] text-red-600 dark:text-red-500">
                                맞은 개수가 문항 수보다 많습니다
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {score && score.percentage > 0 ? (
                            <Badge
                              variant={
                                state === 'over'
                                  ? 'destructive' // 100% 초과 케이스는 무조건 빨간색
                                  : score.percentage >= 90
                                    ? 'default'
                                    : score.percentage >= 70
                                      ? 'secondary'
                                      : 'destructive'
                              }
                              className="text-sm font-semibold"
                            >
                              {score.percentage}%
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Input
                            ref={(el) => {
                              if (el) inputRefs.current.set(`feedback-${student.id}`, el)
                            }}
                            value={score?.feedback || ''}
                            onChange={(e) => handleFeedbackChange(student.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, student.id, 'feedback')}
                            onFocus={() => setActiveStudentId(student.id)}
                            placeholder="선택사항"
                            className="h-9 text-sm"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">
                  {students.length === 0
                    ? '등록된 학생이 없습니다'
                    : '현재 선택한 필터 조건에 해당하는 학생이 없습니다'}
                </p>
                {students.length > 0 && (searchTerm || gradeFilter !== 'all' || statusFilter !== 'all') && (
                  <p className="text-xs mt-2">
                    필터를 변경하거나 검색어를 수정해보세요
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
