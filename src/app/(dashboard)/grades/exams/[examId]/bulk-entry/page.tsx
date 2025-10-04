'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, AlertCircle, Copy, TrendingUp, BarChart } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { Separator } from '@/components/ui/separator'

interface Exam {
  id: string
  name: string
  total_questions: number | null
  exam_date: string | null
}

interface Student {
  id: string
  student_code: string
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

export default function BulkGradeEntryPage() {
  const params = useParams()
  const examId = params.examId as string
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const { user: currentUser } = useCurrentUser()

  const [exam, setExam] = useState<Exam | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [scores, setScores] = useState<Map<string, ScoreEntry>>(new Map())
  const [showLowPerformers, setShowLowPerformers] = useState(false)
  const [lowPerformerThreshold, setLowPerformerThreshold] = useState(80)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [autoSave, setAutoSave] = useState(false)
  const [bulkFeedback, setBulkFeedback] = useState('')
  const [showBulkFeedback, setShowBulkFeedback] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadData()
  }, [examId])

  // Auto-save effect
  useEffect(() => {
    if (!autoSave) return

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(true) // silent save
    }, 3000) // 3초 후 자동 저장

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [scores, autoSave])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      // Load exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('id, name, total_questions, exam_date')
        .eq('id', examId)
        .single()

      if (examError) throw examError
      setExam(examData)

      // Get class_id from exam
      const { data: examWithClass, error: classError } = await supabase
        .from('exams')
        .select('class_id')
        .eq('id', examId)
        .single()

      if (classError) throw classError

      if (examWithClass.class_id) {
        // Get students enrolled in this class
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('class_enrollments')
          .select('student_id')
          .eq('class_id', examWithClass.class_id)
          .eq('status', 'active')

        if (enrollmentError) throw enrollmentError

        const studentIds = enrollments?.map(e => e.student_id) || []

        if (studentIds.length > 0) {
          const { data: studentsData, error: studentsError } = await supabase
            .from('students')
            .select('id, student_code, users(name)')
            .in('id', studentIds)
            .is('deleted_at', null)
            .order('student_code')

          if (studentsError) throw studentsError
          setStudents(studentsData as Student[])

          // Load existing scores
          const { data: existingScores } = await supabase
            .from('exam_scores')
            .select('student_id, score, total_points, percentage, feedback')
            .eq('exam_id', examId)

          const scoresMap = new Map<string, ScoreEntry>()
          studentsData.forEach((student: Student) => {
            const existing = existingScores?.find(s => s.student_id === student.id)
            const defaultTotal = examData.total_questions?.toString() || ''

            scoresMap.set(student.id, {
              student_id: student.id,
              correct: existing?.score?.toString() || '',
              total: existing?.total_points?.toString() || defaultTotal,
              percentage: existing?.percentage || 0,
              feedback: existing?.feedback || '',
            })
          })
          setScores(scoresMap)
        }
      }
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
  }

  function parseScore(input: string): { correct: number; total: number } | null {
    // Support formats: "30/32", "30", "30 / 32"
    const match = input.match(/^\s*(\d+)\s*(?:\/\s*(\d+))?\s*$/)
    if (!match) return null

    const correct = parseInt(match[1])
    const total = match[2] ? parseInt(match[2]) : (exam?.total_questions || 100)

    return { correct, total }
  }

  function handleScoreInput(studentId: string, value: string) {
    const parsed = parseScore(value)

    setScores(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(studentId) || {
        student_id: studentId,
        correct: '',
        total: exam?.total_questions?.toString() || '',
        percentage: 0,
        feedback: '',
      }

      if (parsed) {
        const percentage = Math.round((parsed.correct / parsed.total) * 100)
        newMap.set(studentId, {
          ...current,
          correct: parsed.correct.toString(),
          total: parsed.total.toString(),
          percentage,
        })
      } else {
        newMap.set(studentId, {
          ...current,
          correct: value,
          total: current.total,
          percentage: 0,
        })
      }

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

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, studentId: string, field: 'score' | 'feedback') {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()

      const currentIndex = students.findIndex(s => s.id === studentId)
      const nextIndex = currentIndex + 1

      if (field === 'score' && nextIndex < students.length) {
        // Move to next student's score input
        const nextStudent = students[nextIndex]
        const nextInput = inputRefs.current.get(`score-${nextStudent.id}`)
        nextInput?.focus()
      } else if (field === 'feedback' && nextIndex < students.length) {
        // Move to next student's score input
        const nextStudent = students[nextIndex]
        const nextInput = inputRefs.current.get(`score-${nextStudent.id}`)
        nextInput?.focus()
      }
    }
  }

  async function handleSave(silent = false) {
    if (!currentUser) return

    setSaving(true)
    try {
      const scoresToSave = Array.from(scores.values())
        .filter(score => score.correct && score.total)
        .map(score => ({
          tenant_id: currentUser.tenantId,
          exam_id: examId,
          student_id: score.student_id,
          score: parseInt(score.correct),
          total_points: parseInt(score.total),
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

      const { error } = await supabase
        .from('exam_scores')
        .upsert(scoresToSave, {
          onConflict: 'exam_id,student_id',
          ignoreDuplicates: false,
        })

      if (error) throw error

      setLastSaved(new Date())

      if (!silent) {
        toast({
          title: '저장 완료',
          description: `${scoresToSave.length}명의 성적이 저장되었습니다.`,
        })

        router.push(`/grades/exams`)
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

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      </PageWrapper>
    )
  }

  if (!exam) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">시험을 찾을 수 없습니다.</p>
          <Button onClick={() => router.push('/grades/exams')}>목록으로 돌아가기</Button>
        </div>
      </PageWrapper>
    )
  }

  const filteredStudents = showLowPerformers
    ? students.filter(student => {
        const score = scores.get(student.id)
        return score && score.percentage > 0 && score.percentage < lowPerformerThreshold
      })
    : students

  const stats = {
    total: students.length,
    entered: Array.from(scores.values()).filter(s => s.correct && s.total).length,
    passed: Array.from(scores.values()).filter(s => s.percentage >= 70).length,
    failed: Array.from(scores.values()).filter(s => s.percentage > 0 && s.percentage < 70).length,
    notEntered: students.length - Array.from(scores.values()).filter(s => s.correct && s.total).length,
  }

  const progressPercentage = stats.total > 0 ? Math.round((stats.entered / stats.total) * 100) : 0

  // 성적 분포 계산
  const distribution = {
    range90: Array.from(scores.values()).filter(s => s.percentage >= 90).length,
    range80: Array.from(scores.values()).filter(s => s.percentage >= 80 && s.percentage < 90).length,
    range70: Array.from(scores.values()).filter(s => s.percentage >= 70 && s.percentage < 80).length,
    range60: Array.from(scores.values()).filter(s => s.percentage >= 60 && s.percentage < 70).length,
    range0: Array.from(scores.values()).filter(s => s.percentage > 0 && s.percentage < 60).length,
  }

  const averageScore = stats.entered > 0
    ? Math.round(Array.from(scores.values())
        .filter(s => s.percentage > 0)
        .reduce((sum, s) => sum + s.percentage, 0) / stats.entered)
    : 0

  return (
    <PageWrapper>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/grades/exams')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">성적 일괄 입력</h1>
              <p className="text-muted-foreground">{exam.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-sm text-muted-foreground"
              >
                마지막 저장: {lastSaved.toLocaleTimeString('ko-KR')}
              </motion.span>
            )}
            <Button size="lg" onClick={() => handleSave(false)} disabled={saving}>
              <Save className="h-5 w-5 mr-2" />
              {saving ? '저장 중...' : '저장하고 나가기'}
            </Button>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="font-semibold">입력 진행 상황</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">{stats.entered}</span>
                    <span className="text-muted-foreground">/{stats.total}명 </span>
                    <span className="text-lg font-semibold text-primary">({progressPercentage}%)</span>
                  </div>
                </div>
                <Progress value={progressPercentage} className="h-3" />
                {stats.notEntered > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-sm text-orange-600"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>{stats.notEntered}명의 학생이 미입력 상태입니다</span>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards & Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-4 md:grid-cols-5"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>전체 학생</CardDescription>
              <CardTitle className="text-3xl">{stats.total}명</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>반 평균</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{averageScore}점</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>합격 (70점 이상)</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.passed}명</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>미달 (70점 미만)</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.failed}명</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>미입력</CardDescription>
              <CardTitle className="text-3xl text-orange-600">{stats.notEntered}명</CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Score Distribution Chart */}
        {stats.entered > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  성적 분포
                </CardTitle>
                <CardDescription>점수 구간별 학생 수</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">90~100점</span>
                      <span className="text-muted-foreground">{distribution.range90}명</span>
                    </div>
                    <Progress value={(distribution.range90 / stats.entered) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">80~89점</span>
                      <span className="text-muted-foreground">{distribution.range80}명</span>
                    </div>
                    <Progress value={(distribution.range80 / stats.entered) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">70~79점</span>
                      <span className="text-muted-foreground">{distribution.range70}명</span>
                    </div>
                    <Progress value={(distribution.range70 / stats.entered) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">60~69점</span>
                      <span className="text-muted-foreground">{distribution.range60}명</span>
                    </div>
                    <Progress value={(distribution.range60 / stats.entered) * 100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">0~59점</span>
                      <span className="text-muted-foreground">{distribution.range0}명</span>
                    </div>
                    <Progress value={(distribution.range0 / stats.entered) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filters & Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showLowPerformers"
                    checked={showLowPerformers}
                    onCheckedChange={(checked) => setShowLowPerformers(checked as boolean)}
                  />
                  <Label htmlFor="showLowPerformers" className="cursor-pointer">
                    미달 학생만 보기
                  </Label>
                </div>
                {showLowPerformers && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="threshold">기준:</Label>
                    <Input
                      id="threshold"
                      type="number"
                      min="0"
                      max="100"
                      value={lowPerformerThreshold}
                      onChange={(e) => setLowPerformerThreshold(parseInt(e.target.value) || 80)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">점 미만</span>
                  </div>
                )}

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="autoSave"
                    checked={autoSave}
                    onCheckedChange={(checked) => setAutoSave(checked as boolean)}
                  />
                  <Label htmlFor="autoSave" className="cursor-pointer">
                    자동 저장 (3초마다)
                  </Label>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkFeedback(!showBulkFeedback)}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  코멘트 일괄 적용
                </Button>

                <div className="ml-auto flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Enter/Tab으로 다음 칸 이동 | 형식: &quot;30/32&quot; 또는 &quot;30&quot;
                  </span>
                </div>
              </div>

              <AnimatePresence>
                {showBulkFeedback && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="bulkFeedback">모든 학생에게 적용할 코멘트</Label>
                      <Textarea
                        id="bulkFeedback"
                        value={bulkFeedback}
                        onChange={(e) => setBulkFeedback(e.target.value)}
                        placeholder="예: 이번 시험 잘 봤습니다. 꾸준히 노력하세요."
                        rows={3}
                        className="resize-none"
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
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bulk Entry Table */}
        <Card>
          <CardHeader>
            <CardTitle>성적 입력</CardTitle>
            <CardDescription>
              맞은 개수/전체 문항 형식으로 입력하세요 (예: 30/32). 전체 문항 수가 동일하면 숫자만 입력해도 됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-medium">학번</th>
                    <th className="text-left p-4 font-medium">이름</th>
                    <th className="text-left p-4 font-medium w-40">점수 (맞은개수/전체)</th>
                    <th className="text-center p-4 font-medium w-24">득점률</th>
                    <th className="text-left p-4 font-medium">피드백</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((student, index) => {
                    const score = scores.get(student.id)
                    const scoreInput = score?.correct && score?.total
                      ? `${score.correct}/${score.total}`
                      : score?.correct || ''
                    const isNotEntered = !score?.correct || !score?.total

                    return (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`hover:bg-muted/50 transition-colors ${
                          isNotEntered ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {isNotEntered && (
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {student.student_code}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${isNotEntered ? 'text-orange-600' : ''}`}>
                              {student.users?.name || '이름 없음'}
                            </span>
                            {isNotEntered && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                미입력
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Input
                            ref={(el) => {
                              if (el) inputRefs.current.set(`score-${student.id}`, el)
                            }}
                            value={scoreInput}
                            onChange={(e) => handleScoreInput(student.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, student.id, 'score')}
                            placeholder="30/32"
                            className={`font-mono ${
                              isNotEntered ? 'border-orange-300 focus:border-orange-500 dark:border-orange-800' : ''
                            }`}
                            autoFocus={index === 0}
                          />
                        </td>
                        <td className="p-4 text-center">
                          {score && score.percentage > 0 ? (
                            <Badge
                              variant={
                                score.percentage >= 90 ? 'default' :
                                score.percentage >= 70 ? 'secondary' :
                                'destructive'
                              }
                              className="text-base font-bold"
                            >
                              {score.percentage}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Input
                            ref={(el) => {
                              if (el) inputRefs.current.set(`feedback-${student.id}`, el)
                            }}
                            value={score?.feedback || ''}
                            onChange={(e) => handleFeedbackChange(student.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, student.id, 'feedback')}
                            placeholder="선택사항"
                            className="text-sm"
                          />
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>표시할 학생이 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
