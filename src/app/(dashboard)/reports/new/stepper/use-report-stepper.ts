'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { generateMonthlyReport, generateWeeklyReport, saveReport } from '@/app/actions/reports/report-generation'
import { sendReportToAllGuardians } from '@/app/actions/reports/send'
import { useReportStore } from '@/lib/stores/report.store'
import type { ReportData } from '@/core/types/report.types'
import {
  type ReportStepKey,
  type SelectedStudent,
  type PeriodConfig,
  type DataWarning,
  type CommentDraft,
  REPORT_STEPS,
  getStepIndex,
  addRecentStudent,
} from './report-stepper-types'

// ============================================================================
// State Interface
// ============================================================================

export interface ReportStepperState {
  // Navigation
  currentStep: ReportStepKey
  completedSteps: Set<ReportStepKey>

  // Step 1: Setup (student + period)
  student: SelectedStudent | null
  period: PeriodConfig

  // Step 2: Data Review
  dataLoading: boolean
  dataLoaded: boolean
  dataError: string | null
  reportData: ReportData | null
  warnings: DataWarning[]

  // Step 3: Comment
  comment: CommentDraft

  // Step 4: Confirm
  sendAfterSave: boolean
  generating: boolean
  sending: boolean
}

// ============================================================================
// Hook
// ============================================================================

export function useReportStepper() {
  const router = useRouter()
  const { toast } = useToast()
  const { skipComment } = useReportStore()

  // Core state
  const [currentStep, setCurrentStep] = useState<ReportStepKey>('setup')
  const [completedSteps, setCompletedSteps] = useState<Set<ReportStepKey>>(new Set())

  // Step 1: Setup
  const [student, setStudentState] = useState<SelectedStudent | null>(null)
  const now = new Date()
  const [period, setPeriodState] = useState<PeriodConfig>({
    type: 'monthly',
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  })

  // Step 2: Data
  const [dataLoading, setDataLoading] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [warnings, setWarnings] = useState<DataWarning[]>([])

  // Step 3: Comment
  const [comment, setComment] = useState<CommentDraft>({
    summary: '',
    strengths: '',
    improvements: '',
    nextGoals: '',
  })

  // Step 4: Confirm
  const [sendAfterSave, setSendAfterSave] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)

  // Prevent double-fetch
  const fetchKeyRef = useRef<string>('')

  // ============================================================================
  // Period Validation (declared early for use in navigation)
  // ============================================================================

  const isPeriodValid = useCallback((): boolean => {
    if (period.type === 'monthly') {
      return !!period.year && !!period.month
    }
    if (period.type === 'weekly') {
      if (!period.startDate || !period.endDate) return false
      return period.startDate <= period.endDate
    }
    return false
  }, [period])

  // ============================================================================
  // Navigation
  // ============================================================================

  const canGoToStep = useCallback(
    (step: ReportStepKey): boolean => {
      const idx = getStepIndex(step)
      if (idx === 0) return true
      const requiredBefore: ReportStepKey[] = REPORT_STEPS.slice(0, idx).map((s) => s.key)
      for (const req of requiredBefore) {
        if (req === 'setup' && (!student || !isPeriodValid() || !completedSteps.has('setup'))) return false
        if (req === 'data' && (!dataLoaded || !completedSteps.has('data'))) return false
        if (req === 'comment' && !completedSteps.has('comment')) return false
      }
      return true
    },
    [student, isPeriodValid, dataLoaded, completedSteps]
  )

  const goToStep = useCallback(
    (step: ReportStepKey) => {
      if (canGoToStep(step)) {
        setCurrentStep(step)
      }
    },
    [canGoToStep]
  )

  const goNext = useCallback(() => {
    const idx = getStepIndex(currentStep)
    if (idx < REPORT_STEPS.length - 1) {
      const nextKey = REPORT_STEPS[idx + 1].key
      setCurrentStep(nextKey)
    }
  }, [currentStep])

  const goPrev = useCallback(() => {
    const idx = getStepIndex(currentStep)
    if (idx > 0) {
      setCurrentStep(REPORT_STEPS[idx - 1].key)
    }
  }, [currentStep])

  // ============================================================================
  // Step 1: Setup — Student
  // ============================================================================

  const setStudent = useCallback((s: SelectedStudent) => {
    setStudentState(s)
    addRecentStudent(s)
    // Clear setup completion + all downstream steps
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.delete('setup')
      next.delete('data')
      next.delete('comment')
      next.delete('confirm')
      return next
    })
    setDataLoading(false)
    setDataLoaded(false)
    setReportData(null)
    setWarnings([])
    setDataError(null)
    fetchKeyRef.current = ''
    setComment({ summary: '', strengths: '', improvements: '', nextGoals: '' })
    // Stay on 'setup' step — period section will appear
  }, [])

  const clearStudent = useCallback(() => {
    setStudentState(null)
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.delete('setup')
      next.delete('data')
      next.delete('comment')
      next.delete('confirm')
      return next
    })
    setDataLoading(false)
    setDataLoaded(false)
    setReportData(null)
    setWarnings([])
    setDataError(null)
    fetchKeyRef.current = ''
    setComment({ summary: '', strengths: '', improvements: '', nextGoals: '' })
    setSendAfterSave(false)
    setCurrentStep('setup')
  }, [])

  // ============================================================================
  // Step 1: Setup — Period
  // ============================================================================

  const setPeriod = useCallback((nextPeriod: PeriodConfig) => {
    setPeriodState(nextPeriod)
    // Period change invalidates setup confirmation + downstream
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.delete('setup')
      next.delete('data')
      next.delete('comment')
      next.delete('confirm')
      return next
    })
    setDataLoading(false)
    setDataLoaded(false)
    setReportData(null)
    setWarnings([])
    setDataError(null)
    fetchKeyRef.current = ''
    setComment({ summary: '', strengths: '', improvements: '', nextGoals: '' })
    setSendAfterSave(false)
  }, [])

  // ============================================================================
  // Step 1: Setup — Confirm
  // ============================================================================

  const confirmSetup = useCallback(() => {
    if (!student) {
      toast({ title: '학생을 선택해주세요', variant: 'destructive' })
      return
    }
    if (!isPeriodValid()) {
      toast({
        title: '기간 설정 오류',
        description: period.type === 'weekly' ? '시작일과 종료일을 올바르게 설정해주세요.' : '연도와 월을 설정해주세요.',
        variant: 'destructive',
      })
      return
    }
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.add('setup')
      next.delete('data')
      next.delete('comment')
      next.delete('confirm')
      return next
    })
    setDataLoading(false)
    setDataLoaded(false)
    setReportData(null)
    setWarnings([])
    setDataError(null)
    fetchKeyRef.current = ''
    setComment({ summary: '', strengths: '', improvements: '', nextGoals: '' })
    setCurrentStep('data')
  }, [student, isPeriodValid, period.type, toast])

  // ============================================================================
  // Step 2: Data Fetch
  // ============================================================================

  const fetchReportData = useCallback(async () => {
    if (!student || !isPeriodValid()) return

    // Deduplicate
    const key = `${student.id}-${period.type}-${period.year}-${period.month}-${period.startDate}-${period.endDate}`
    if (key === fetchKeyRef.current && dataLoaded && !dataError) return
    fetchKeyRef.current = key

    setDataLoading(true)
    setDataError(null)
    setWarnings([])

    try {
      let result: { success: boolean; data: ReportData | null; error: string | null }

      if (period.type === 'weekly' && period.startDate && period.endDate) {
        result = await generateWeeklyReport(student.id, period.startDate, period.endDate)
      } else if (period.type === 'monthly' && period.year && period.month) {
        result = await generateMonthlyReport(student.id, period.year, period.month)
      } else {
        throw new Error('기간 설정이 올바르지 않습니다.')
      }

      if (!result.success || !result.data) {
        throw new Error(result.error || '데이터 수집에 실패했습니다.')
      }

      const data = result.data
      setReportData(data)

      // Analyze warnings
      const newWarnings: DataWarning[] = []
      if (data.attendance.total === 0) {
        newWarnings.push({
          type: 'no_attendance',
          message: '해당 기간 출석 데이터가 없습니다.',
          severity: 'warning',
          quickFixUrl: '/attendance',
        })
      }
      if (!data.scores || data.scores.length === 0) {
        newWarnings.push({
          type: 'no_scores',
          message: '해당 기간 시험 데이터가 없습니다.',
          severity: 'warning',
          quickFixUrl: '/grades',
        })
      }
      if (data.homework.total === 0) {
        newWarnings.push({
          type: 'no_homework',
          message: '해당 기간 과제 데이터가 없습니다.',
          severity: 'warning',
          quickFixUrl: '/todos',
        })
      }
      setWarnings(newWarnings)

      // Auto-fill comment summary from instructorComment
      if (data.instructorComment) {
        setComment((prev) => ({
          ...prev,
          summary: prev.summary || data.instructorComment || '',
        }))
      }

      setDataLoaded(true)
      setCompletedSteps((prev) => new Set([...prev, 'data']))
    } catch (error) {
      console.error('[fetchReportData] Error:', error)
      setDataError(error instanceof Error ? error.message : '데이터 수집 중 오류가 발생했습니다.')
    } finally {
      setDataLoading(false)
    }
  }, [student, isPeriodValid, period, dataLoaded, dataError])

  // ============================================================================
  // Step 3: Comment
  // ============================================================================

  const updateComment = useCallback((patch: Partial<CommentDraft>) => {
    setComment((prev) => ({ ...prev, ...patch }))
    // Comment edits require confirm reconfirmation
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.delete('confirm')
      return next
    })
  }, [])

  const confirmComment = useCallback(() => {
    if (!skipComment && !comment.summary.trim()) {
      toast({
        title: '총평을 입력해주세요',
        description: '총평은 필수 항목입니다.',
        variant: 'destructive',
      })
      return
    }
    setCompletedSteps((prev) => new Set([...prev, 'comment']))
    setCurrentStep('confirm')
  }, [comment.summary, skipComment, toast])

  // ============================================================================
  // Step 4: Confirm — Preview Data
  // ============================================================================

  const getPreviewData = useCallback((): ReportData | null => {
    if (!reportData) return null
    if (skipComment) return { ...reportData, comment: undefined, instructorComment: undefined, overallComment: undefined }
    return {
      ...reportData,
      comment: {
        summary: comment.summary,
        strengths: comment.strengths,
        improvements: comment.improvements,
        nextGoals: comment.nextGoals,
      },
    }
  }, [reportData, comment, skipComment])

  // ============================================================================
  // Step 4: Confirm — Submit
  // ============================================================================

  const handleSubmit = useCallback(async () => {
    if (!reportData || !student) return

    setGenerating(true)
    try {
      const mergedData: ReportData = skipComment
        ? { ...reportData, comment: undefined, instructorComment: undefined, overallComment: undefined }
        : {
            ...reportData,
            comment: {
              summary: comment.summary,
              strengths: comment.strengths,
              improvements: comment.improvements,
              nextGoals: comment.nextGoals,
            },
            instructorComment: comment.summary,
            overallComment: comment.summary,
          }

      const saveResult = await saveReport(mergedData, period.type)

      if (!saveResult.success || !saveResult.data) {
        throw new Error(saveResult.error || '리포트 저장에 실패했습니다.')
      }

      const reportId = saveResult.data.id

      if (sendAfterSave) {
        setSending(true)
        const sendResult = await sendReportToAllGuardians(reportId)
        setSending(false)

        if (sendResult.success && sendResult.data) {
          toast({
            title: '리포트 저장 및 전송 완료',
            description: `${sendResult.data.successCount}명의 보호자에게 전송되었습니다.`,
          })
        } else {
          toast({
            title: '리포트 저장 완료 (전송 실패)',
            description: sendResult.error || '보호자 전송 중 오류가 발생했습니다.',
            variant: 'destructive',
          })
        }
      } else {
        toast({
          title: '리포트 저장 완료',
          description: '리포트 상세 페이지로 이동합니다.',
        })
      }

      setCompletedSteps((prev) => new Set([...prev, 'confirm']))
      router.push(`/reports/${reportId}`)
    } catch (error) {
      console.error('[handleSubmit] Error:', error)
      toast({
        title: '리포트 생성 오류',
        description: error instanceof Error ? error.message : '리포트를 생성하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
      setSending(false)
    }
  }, [reportData, student, comment, period.type, sendAfterSave, router, toast])

  // ============================================================================
  // Computed
  // ============================================================================

  const isAllRequiredComplete =
    !!student && isPeriodValid() && dataLoaded && !dataError && (skipComment || !!comment.summary.trim())

  const periodLabel = (() => {
    if (period.type === 'monthly' && period.year && period.month) {
      return `${period.year}년 ${period.month}월 월간`
    }
    if (period.type === 'weekly' && period.startDate && period.endDate) {
      return `${period.startDate} ~ ${period.endDate} 주간`
    }
    return null
  })()

  const commentProgress = [comment.summary, comment.strengths, comment.improvements, comment.nextGoals].filter(
    (v) => v.trim().length > 0
  ).length

  return {
    // State
    currentStep,
    completedSteps,
    student,
    period,
    dataLoading,
    dataLoaded,
    dataError,
    reportData,
    warnings,
    comment,
    sendAfterSave,
    generating,
    sending,

    // Navigation
    canGoToStep,
    goToStep,
    goNext,
    goPrev,

    // Actions
    setStudent,
    clearStudent,
    setPeriod,
    confirmSetup,
    isPeriodValid,
    fetchReportData,
    updateComment,
    confirmComment,
    getPreviewData,
    setSendAfterSave,
    handleSubmit,

    // Computed
    isAllRequiredComplete,
    periodLabel,
    commentProgress,
  }
}
