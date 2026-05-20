'use client'

import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { classifyReportSendError, type ReportSendErrorInfo } from '@/lib/report-send-errors'
import { deleteReport, deleteReports } from '@/app/actions/reports/queries'
import { useKakaoMessaging } from '@/hooks/use-kakao-messaging'
import type { KakaoTemplate } from '@/app/actions/messaging/kakao-templates'
import type { ReportWithStudent } from '@/core/types/report.types'
import type { ReportSendChannel } from '@/app/(dashboard)/reports/new/stepper/use-report-stepper'

interface BulkSendProgress {
  current: number
  total: number
  successCount: number
  failCount: number
}

export interface ReportToSend {
  id: string
  name: string
  reportType: 'weekly' | 'monthly' | 'quarterly' | string
}

export interface ReportActionsState {
  // Single send
  sendDialogOpen: boolean
  reportToSend: ReportToSend | null
  isSending: boolean
  // Single delete
  deleteDialogOpen: boolean
  reportToDelete: { id: string; name: string } | null
  isDeleting: boolean
  // Bulk delete
  bulkDeleteDialogOpen: boolean
  reportsToDelete: ReportWithStudent[]
  isBulkDeleting: boolean
  // Bulk send
  bulkSendDialogOpen: boolean
  reportsToSend: ReportWithStudent[]
  isBulkSending: boolean
  bulkSendProgress: BulkSendProgress
  // Channel / kakao templates (공유)
  sendChannel: ReportSendChannel
  hasKakaoChannel: boolean
  kakaoChannelChecked: boolean
  checkingKakaoChannel: boolean
  kakaoTemplates: KakaoTemplate[]
  loadingKakaoTemplates: boolean
  // Error dialogs
  errorDialogOpen: boolean
  errorInfo: ReportSendErrorInfo | null
  failedReportName: string
  bulkSendErrors: Array<{ name: string; error: ReportSendErrorInfo }>
  bulkErrorDialogOpen: boolean
}

export interface ReportActionsHandlers {
  handleSendClick: (reportId: string, studentName: string, reportType: string) => void
  handleConfirmSend: () => Promise<void>
  setSendDialogOpen: (open: boolean) => void
  handleDeleteClick: (reportId: string, studentName: string) => void
  handleConfirmDelete: () => Promise<void>
  setDeleteDialogOpen: (open: boolean) => void
  handleBulkDeleteClick: (selectedReports: ReportWithStudent[]) => void
  handleConfirmBulkDelete: () => Promise<void>
  setBulkDeleteDialogOpen: (open: boolean) => void
  handleBulkSendClick: (selectedReports: ReportWithStudent[]) => void
  handleConfirmBulkSend: () => Promise<void>
  setBulkSendDialogOpen: (open: boolean) => void
  setSendChannel: (channel: ReportSendChannel) => void
  setErrorDialogOpen: (open: boolean) => void
  setBulkErrorDialogOpen: (open: boolean) => void
  clearBulkSendErrors: () => void
}

// 리포트 종류 → 강제 매칭되는 알림톡 템플릿 event_type
function eventTypeForReport(reportType: string): string | null {
  if (reportType === 'monthly') return 'monthly_report_ready'
  if (reportType === 'weekly') return 'weekly_report_ready'
  return null
}

export function useReportActions(
  loadReports: () => void
): ReportActionsState & ReportActionsHandlers {
  const { toast } = useToast()

  // Single send state
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [reportToSend, setReportToSend] = useState<ReportToSend | null>(null)
  const [isSending, setIsSending] = useState(false)

  // Single delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Bulk delete state
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [reportsToDelete, setReportsToDelete] = useState<ReportWithStudent[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Bulk send state
  const [bulkSendDialogOpen, setBulkSendDialogOpen] = useState(false)
  const [reportsToSend, setReportsToSend] = useState<ReportWithStudent[]>([])
  const [isBulkSending, setIsBulkSending] = useState(false)
  const [bulkSendProgress, setBulkSendProgress] = useState<BulkSendProgress>({
    current: 0,
    total: 0,
    successCount: 0,
    failCount: 0,
  })

  // Channel / Kakao templates (단건/일괄 공용)
  const [sendChannel, setSendChannel] = useState<ReportSendChannel>('sms')
  const {
    hasKakaoChannel,
    isChannelChecked: kakaoChannelChecked,
    isCheckingChannel: checkingKakaoChannel,
    templates: kakaoTemplates,
    isLoadingTemplates: loadingKakaoTemplates,
    checkChannel: checkKakaoChannel,
    loadTemplates: loadKakaoTemplates,
  } = useKakaoMessaging({ approvedOnly: true })

  // Error dialog state
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorInfo, setErrorInfo] = useState<ReportSendErrorInfo | null>(null)
  const [failedReportName, setFailedReportName] = useState('')
  const [bulkSendErrors, setBulkSendErrors] = useState<Array<{ name: string; error: ReportSendErrorInfo }>>([])
  const [bulkErrorDialogOpen, setBulkErrorDialogOpen] = useState(false)

  // 전송 다이얼로그가 열리면 카카오 채널 가용성 확인
  useEffect(() => {
    if ((sendDialogOpen || bulkSendDialogOpen) && !kakaoChannelChecked) {
      void checkKakaoChannel()
    }
  }, [sendDialogOpen, bulkSendDialogOpen, kakaoChannelChecked, checkKakaoChannel])

  // 카카오 채널 사용 가능하면 템플릿 미리 로드
  useEffect(() => {
    if (sendChannel === 'kakao' && hasKakaoChannel && kakaoTemplates.length === 0) {
      void loadKakaoTemplates()
    }
  }, [sendChannel, hasKakaoChannel, kakaoTemplates.length, loadKakaoTemplates])

  // 카카오 채널이 없는데 카카오 선택돼 있으면 SMS 로 폴백
  useEffect(() => {
    if (sendChannel === 'kakao' && kakaoChannelChecked && !hasKakaoChannel) {
      setSendChannel('sms')
    }
  }, [sendChannel, kakaoChannelChecked, hasKakaoChannel])

  /**
   * 리포트 종류 → 매칭되는 승인 템플릿 (없으면 null)
   */
  const findMatchedTemplate = useCallback(
    (reportType: string): KakaoTemplate | null => {
      const eventType = eventTypeForReport(reportType)
      if (!eventType) return null
      return kakaoTemplates.find((t) => t.eventType === eventType) ?? null
    },
    [kakaoTemplates]
  )

  // --- Single Send ---
  const handleSendClick = useCallback(
    (reportId: string, studentName: string, reportType: string) => {
      setReportToSend({ id: reportId, name: studentName, reportType })
      setSendDialogOpen(true)
    },
    []
  )

  const handleConfirmSend = useCallback(async () => {
    if (!reportToSend) return

    let kakaoTemplateId: string | undefined
    if (sendChannel === 'kakao') {
      const matched = findMatchedTemplate(reportToSend.reportType)
      if (!matched) {
        toast({
          title: '사용할 수 있는 알림톡 템플릿이 없습니다',
          description: '이 리포트 종류에 매칭된 승인 템플릿이 등록되어 있지 않습니다.',
          variant: 'destructive',
        })
        return
      }
      kakaoTemplateId = matched.id
    }

    setIsSending(true)
    try {
      const { sendReportToAllGuardians } = await import('@/app/actions/reports/send')
      const result = await sendReportToAllGuardians(reportToSend.id, {
        channel: sendChannel,
        ...(kakaoTemplateId && { kakaoTemplateId }),
      })

      if (!result.success) {
        setFailedReportName(reportToSend.name)
        setErrorInfo(
          result.errorInfo ?? classifyReportSendError(result.error || '리포트 전송에 실패했습니다')
        )
        setErrorDialogOpen(true)
        return
      }

      const { successCount, failCount } = result.data!
      toast({
        title: '전송 완료',
        description: `${reportToSend.name} 학생의 보호자 ${successCount}명에게 리포트가 전송되었습니다.${failCount > 0 ? ` (${failCount}명 실패)` : ''}`,
      })
      loadReports()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '리포트를 전송하는 중 오류가 발생했습니다.'
      setFailedReportName(reportToSend.name)
      setErrorInfo(classifyReportSendError(errorMessage))
      setErrorDialogOpen(true)
    } finally {
      setIsSending(false)
      setSendDialogOpen(false)
      setReportToSend(null)
    }
  }, [reportToSend, sendChannel, findMatchedTemplate, loadReports, toast])

  // --- Single Delete ---
  const handleDeleteClick = useCallback((reportId: string, studentName: string) => {
    setReportToDelete({ id: reportId, name: studentName })
    setDeleteDialogOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!reportToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteReport(reportToDelete.id)
      if (!result.success) {
        throw new Error(result.error || '리포트를 삭제하는 중 오류가 발생했습니다.')
      }
      toast({
        title: '삭제 완료',
        description: `${reportToDelete.name} 학생의 리포트가 삭제되었습니다.`,
      })
      loadReports()
    } catch (error) {
      toast({
        title: '삭제 오류',
        description: error instanceof Error ? error.message : '리포트를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setReportToDelete(null)
    }
  }, [reportToDelete, loadReports, toast])

  // --- Bulk Delete ---
  const handleBulkDeleteClick = useCallback((selectedReports: ReportWithStudent[]) => {
    setReportsToDelete(selectedReports)
    setBulkDeleteDialogOpen(true)
  }, [])

  const handleConfirmBulkDelete = useCallback(async () => {
    if (reportsToDelete.length === 0) return

    setIsBulkDeleting(true)
    try {
      const reportIds = reportsToDelete.map((r) => r.id)
      const result = await deleteReports(reportIds)
      if (!result.success) {
        throw new Error(result.error || '리포트를 삭제하는 중 오류가 발생했습니다.')
      }
      toast({
        title: '일괄 삭제 완료',
        description: `${reportsToDelete.length}개의 리포트가 삭제되었습니다.`,
      })
      loadReports()
    } catch (error) {
      toast({
        title: '삭제 오류',
        description: error instanceof Error ? error.message : '리포트를 삭제하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsBulkDeleting(false)
      setBulkDeleteDialogOpen(false)
      setReportsToDelete([])
    }
  }, [reportsToDelete, loadReports, toast])

  // --- Bulk Send ---
  const handleBulkSendClick = useCallback((selectedReports: ReportWithStudent[]) => {
    setReportsToSend(selectedReports)
    setBulkSendDialogOpen(true)
  }, [])

  const handleConfirmBulkSend = useCallback(async () => {
    if (reportsToSend.length === 0) return

    // 카카오인 경우, 선택된 리포트 중 매칭 템플릿이 없는 종류가 있으면 사전 차단
    if (sendChannel === 'kakao') {
      const missingTypes = new Set<string>()
      for (const r of reportsToSend) {
        const matched = findMatchedTemplate(r.report_type)
        if (!matched) missingTypes.add(r.report_type)
      }
      if (missingTypes.size > 0) {
        const labels = Array.from(missingTypes).map((t) =>
          t === 'monthly' ? '월간' : t === 'weekly' ? '주간' : t
        ).join(', ')
        toast({
          title: '알림톡 템플릿 누락',
          description: `${labels} 리포트에 매칭된 승인 템플릿이 없어 발송할 수 없습니다.`,
          variant: 'destructive',
        })
        return
      }
    }

    setIsBulkSending(true)
    setBulkSendProgress({ current: 0, total: reportsToSend.length, successCount: 0, failCount: 0 })

    try {
      const { sendReportToAllGuardians } = await import('@/app/actions/reports/send')

      let totalSuccess = 0
      let totalFail = 0
      const classifiedErrors: Array<{ name: string; error: ReportSendErrorInfo }> = []
      let processed = 0

      const CONCURRENCY = 3
      for (let i = 0; i < reportsToSend.length; i += CONCURRENCY) {
        const batch = reportsToSend.slice(i, i + CONCURRENCY)
        const results = await Promise.allSettled(
          batch.map(async (report) => {
            const studentName = report.students?.users?.name || '알 수 없음'
            try {
              const matched = sendChannel === 'kakao' ? findMatchedTemplate(report.report_type) : null
              const result = await sendReportToAllGuardians(report.id, {
                channel: sendChannel,
                ...(matched && { kakaoTemplateId: matched.id }),
              })
              if (result.success && result.data) {
                return { success: true as const, successCount: result.data.successCount, failCount: result.data.failCount }
              } else {
                const classified = result.errorInfo ?? classifyReportSendError(result.error || '전송 실패')
                return { success: false as const, name: studentName, error: classified }
              }
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : '전송 실패'
              return { success: false as const, name: studentName, error: classifyReportSendError(errorMessage) }
            }
          })
        )

        for (const result of results) {
          processed++
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              totalSuccess += result.value.successCount
              totalFail += result.value.failCount
            } else {
              classifiedErrors.push({ name: result.value.name, error: result.value.error })
            }
          }
          setBulkSendProgress({
            current: processed,
            total: reportsToSend.length,
            successCount: totalSuccess,
            failCount: totalFail + classifiedErrors.length,
          })
        }
      }

      if (classifiedErrors.length > 0) {
        setBulkSendErrors(classifiedErrors)
        setBulkErrorDialogOpen(true)
        if (totalSuccess > 0) {
          toast({
            title: '일부 전송 완료',
            description: `${totalSuccess}명의 보호자에게 전송되었습니다. ${classifiedErrors.length}개의 리포트에서 문제가 발생했습니다.`,
          })
        }
      } else {
        toast({
          title: '일괄 전송 완료',
          description: `${reportsToSend.length}개의 리포트가 총 ${totalSuccess}명의 보호자에게 전송되었습니다.${totalFail > 0 ? ` (${totalFail}명 실패)` : ''}`,
        })
      }

      loadReports()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '리포트를 전송하는 중 오류가 발생했습니다.'
      const classified = classifyReportSendError(errorMessage)
      setErrorInfo(classified)
      setFailedReportName('')
      setErrorDialogOpen(true)
    } finally {
      setIsBulkSending(false)
      setBulkSendDialogOpen(false)
      setReportsToSend([])
      setBulkSendProgress({ current: 0, total: 0, successCount: 0, failCount: 0 })
    }
  }, [reportsToSend, sendChannel, findMatchedTemplate, loadReports, toast])

  const clearBulkSendErrors = useCallback(() => {
    setBulkErrorDialogOpen(false)
    setBulkSendErrors([])
  }, [])

  return {
    // State
    sendDialogOpen,
    reportToSend,
    isSending,
    deleteDialogOpen,
    reportToDelete,
    isDeleting,
    bulkDeleteDialogOpen,
    reportsToDelete,
    isBulkDeleting,
    bulkSendDialogOpen,
    reportsToSend,
    isBulkSending,
    bulkSendProgress,
    sendChannel,
    hasKakaoChannel,
    kakaoChannelChecked,
    checkingKakaoChannel,
    kakaoTemplates,
    loadingKakaoTemplates,
    errorDialogOpen,
    errorInfo,
    failedReportName,
    bulkSendErrors,
    bulkErrorDialogOpen,
    // Handlers
    handleSendClick,
    handleConfirmSend,
    setSendDialogOpen,
    handleDeleteClick,
    handleConfirmDelete,
    setDeleteDialogOpen,
    handleBulkDeleteClick,
    handleConfirmBulkDelete,
    setBulkDeleteDialogOpen,
    handleBulkSendClick,
    handleConfirmBulkSend,
    setBulkSendDialogOpen,
    setSendChannel,
    setErrorDialogOpen,
    setBulkErrorDialogOpen,
    clearBulkSendErrors,
  }
}
