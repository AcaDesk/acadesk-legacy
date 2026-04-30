'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { generateMonthlyReport, generateWeeklyReport, saveReport } from '@/app/actions/reports/report-generation'
import { sendReportToAllGuardians } from '@/app/actions/reports/send'
import { useReportStore } from '@/lib/stores/report.store'
import { queryKeys } from '@/lib/query-keys'
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

export type ReportSendChannel = 'sms' | 'lms' | 'kakao'

export const REPORT_SEND_CHANNEL_LABELS: Record<ReportSendChannel, string> = {
  sms: '문자',
  lms: 'LMS',
  kakao: '알림톡',
}

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
  sendChannel: ReportSendChannel
  kakaoTemplateId: string
  generating: boolean
  sending: boolean
}

// ============================================================================
// Hook
// ============================================================================

export function useReportStepper() {
  const router = useRouter()
  const { toast } = useToast()
  const { skipComment, skipAttendanceRate, skipAttendanceCalendar } = useReportStore()

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

  // Step 2: Data (TanStack Query)
  const {
    data: reportData = null,
    isFetching: dataLoading,
    isSuccess: dataLoaded,
    error: reportQueryError,
    refetch: refetchReportData,
  } = useQuery({
    queryKey: queryKeys.reports.preview(student?.id ?? '', period),
    queryFn: async (): Promise<ReportData> => {
      if (!student) throw new Error('학생을 선택해주세요.')
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
      return result.data
    },
    enabled: false,
    staleTime: Infinity,
    retry: false,
  })

  const dataError = reportQueryError instanceof Error ? reportQueryError.message : reportQueryError ? String(reportQueryError) : null

  const warnings = useMemo<DataWarning[]>(() => {
    if (!reportData) return []
    const result: DataWarning[] = []
    if (reportData.attendance.total === 0) {
      result.push({ type: 'no_attendance', message: '해당 기간 출석 데이터가 없습니다.', severity: 'warning', quickFixUrl: '/attendance' })
    }
    if (!reportData.scores || reportData.scores.length === 0) {
      result.push({ type: 'no_scores', message: '해당 기간 시험 데이터가 없습니다.', severity: 'warning', quickFixUrl: '/grades' })
    }
    if (reportData.homework.total === 0) {
      result.push({ type: 'no_homework', message: '해당 기간 과제 데이터가 없습니다.', severity: 'warning', quickFixUrl: '/todos' })
    }
    return result
  }, [reportData])

  // 데이터 로드 성공 시 completedSteps에 'data' 추가
  useEffect(() => {
    if (dataLoaded && reportData) {
      setCompletedSteps((prev) => new Set([...prev, 'data']))
    }
  }, [dataLoaded, reportData])

  // Step 3: Comment
  const [comment, setComment] = useState<CommentDraft>({
    summary: '',
    strengths: '',
    improvements: '',
    nextGoals: '',
  })

  // instructorComment로 summary 자동 채우기
  useEffect(() => {
    if (reportData?.instructorComment) {
      setComment((prev) => ({
        ...prev,
        summary: prev.summary || reportData.instructorComment || '',
      }))
    }
  }, [reportData])

  // Step 4: Confirm
  const [sendAfterSave, setSendAfterSave] = useState(false)
  const [sendChannel, setSendChannel] = useState<ReportSendChannel>('sms')
  const [kakaoTemplateId, setKakaoTemplateId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)

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
    // TanStack Query 캐시는 queryKey(studentId) 변경으로 자동 초기화됨
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.delete('setup')
      next.delete('data')
      next.delete('comment')
      next.delete('confirm')
      return next
    })
    setComment({ summary: '', strengths: '', improvements: '', nextGoals: '' })
    setSendChannel('sms')
    setKakaoTemplateId('')
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
    setComment({ summary: '', strengths: '', improvements: '', nextGoals: '' })
    setSendAfterSave(false)
    setSendChannel('sms')
    setKakaoTemplateId('')
    setCurrentStep('setup')
  }, [])

  // ============================================================================
  // Step 1: Setup — Period
  // ============================================================================

  const setPeriod = useCallback((nextPeriod: PeriodConfig) => {
    setPeriodState(nextPeriod)
    // Period change invalidates setup confirmation + downstream
    // TanStack Query 캐시는 queryKey(period) 변경으로 자동 초기화됨
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.delete('setup')
      next.delete('data')
      next.delete('comment')
      next.delete('confirm')
      return next
    })
    setComment({ summary: '', strengths: '', improvements: '', nextGoals: '' })
    setSendAfterSave(false)
    setSendChannel('sms')
    setKakaoTemplateId('')
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
    setComment({ summary: '', strengths: '', improvements: '', nextGoals: '' })
    setCurrentStep('data')
  }, [student, isPeriodValid, period.type, toast])

  // ============================================================================
  // Step 2: Data Fetch
  // ============================================================================

  const fetchReportData = useCallback(() => {
    refetchReportData()
  }, [refetchReportData])

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
    return {
      ...reportData,
      ...(skipComment
        ? { comment: undefined, instructorComment: undefined, overallComment: undefined }
        : {
            comment: {
              summary: comment.summary,
              strengths: comment.strengths,
              improvements: comment.improvements,
              nextGoals: comment.nextGoals,
            },
          }),
      hideAttendanceRate: skipAttendanceRate || undefined,
      hideAttendanceCalendar: skipAttendanceCalendar || undefined,
    }
  }, [reportData, comment, skipComment, skipAttendanceRate, skipAttendanceCalendar])

  // ============================================================================
  // Step 4: Confirm — Submit
  // ============================================================================

  const handleSubmit = useCallback(async () => {
    if (!reportData || !student) return
    if (sendAfterSave && sendChannel === 'kakao' && !kakaoTemplateId) {
      toast({
        title: '알림톡 템플릿을 선택해주세요',
        description: '리포트를 알림톡으로 전송하려면 승인된 템플릿이 필요합니다.',
        variant: 'destructive',
      })
      return
    }

    setGenerating(true)
    try {
      const mergedData: ReportData = {
        ...reportData,
        ...(skipComment
          ? { comment: undefined, instructorComment: undefined, overallComment: undefined }
          : {
              comment: {
                summary: comment.summary,
                strengths: comment.strengths,
                improvements: comment.improvements,
                nextGoals: comment.nextGoals,
              },
              instructorComment: comment.summary,
              overallComment: comment.summary,
            }),
        hideAttendanceRate: skipAttendanceRate || undefined,
        hideAttendanceCalendar: skipAttendanceCalendar || undefined,
      }

      const saveResult = await saveReport(mergedData, period.type)

      if (!saveResult.success || !saveResult.data) {
        throw new Error(saveResult.error || '리포트 저장에 실패했습니다.')
      }

      const reportId = saveResult.data.id

      if (sendAfterSave) {
        setSending(true)
        const sendResult = await sendReportToAllGuardians(reportId, {
          channel: sendChannel,
          ...(sendChannel === 'kakao' && { kakaoTemplateId }),
        })
        setSending(false)

        if (sendResult.success && sendResult.data) {
          toast({
            title: '리포트 저장 및 전송 완료',
            description: `${sendResult.data.successCount}명의 보호자에게 ${REPORT_SEND_CHANNEL_LABELS[sendChannel]}로 전송되었습니다.`,
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
  }, [
    reportData,
    student,
    comment,
    skipComment,
    skipAttendanceRate,
    skipAttendanceCalendar,
    period.type,
    sendAfterSave,
    sendChannel,
    kakaoTemplateId,
    router,
    toast,
  ])

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
    sendChannel,
    kakaoTemplateId,
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
    setSendChannel,
    setKakaoTemplateId,
    handleSubmit,

    // Computed
    isAllRequiredComplete,
    periodLabel,
    commentProgress,
  }
}
