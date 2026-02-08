'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Plus, Users, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import type { ReportWithStudent, StudentForFilter } from '@/core/types/report.types'
import { AlertTriangle } from 'lucide-react'
import { classifyReportSendError, type ReportSendErrorInfo } from '@/lib/report-send-errors'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { ReportTableImproved } from '@/components/features/reports/report-table-improved'
import { ReportErrorDialog, ReportBulkErrorDialog } from '@/components/features/reports/report-error-dialog'
import { ReportStatCards } from '@/components/features/reports/report-stat-cards'
import { getReports, deleteReport, deleteReports } from '@/app/actions/reports'

interface ReportsContentProps {
  initialReports: ReportWithStudent[]
  initialStudents: StudentForFilter[]
}

export function ReportsContent({ initialReports, initialStudents }: ReportsContentProps) {
  const [reports, setReports] = useState<ReportWithStudent[]>(initialReports)
  const [filteredReports, setFilteredReports] = useState<ReportWithStudent[]>(initialReports)
  const [allReports, setAllReports] = useState<ReportWithStudent[]>(initialReports)
  const [students] = useState<StudentForFilter[]>(initialStudents)
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<string>('all')
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [reportToSend, setReportToSend] = useState<{ id: string; name: string } | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [reportsToDelete, setReportsToDelete] = useState<ReportWithStudent[]>([])
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [bulkSendDialogOpen, setBulkSendDialogOpen] = useState(false)
  const [reportsToSend, setReportsToSend] = useState<ReportWithStudent[]>([])
  const [isBulkSending, setIsBulkSending] = useState(false)
  const [bulkSendProgress, setBulkSendProgress] = useState({ current: 0, total: 0 })
  const [errorDialogOpen, setErrorDialogOpen] = useState(false)
  const [errorInfo, setErrorInfo] = useState<ReportSendErrorInfo | null>(null)
  const [failedReportName, setFailedReportName] = useState<string>('')
  const [bulkSendErrors, setBulkSendErrors] = useState<Array<{ name: string; error: ReportSendErrorInfo }>>([])
  const [bulkErrorDialogOpen, setBulkErrorDialogOpen] = useState(false)

  const { toast } = useToast()
  const router = useRouter()

  // Helper function to determine school level from grade
  function getSchoolLevel(grade: string): 'elementary' | 'middle' | 'high' | 'unknown' {
    if (!grade) return 'unknown'
    const normalizedGrade = grade.toLowerCase().trim()

    if (normalizedGrade.startsWith('초') || normalizedGrade.includes('초등')) return 'elementary'
    if (normalizedGrade.startsWith('중') || normalizedGrade.includes('중학')) return 'middle'
    if (normalizedGrade.startsWith('고') || normalizedGrade.includes('고등')) return 'high'

    const gradeNum = parseInt(normalizedGrade.replace(/[^0-9]/g, ''))
    if (!isNaN(gradeNum)) {
      if (gradeNum >= 1 && gradeNum <= 6) return 'elementary'
      if (gradeNum >= 7 && gradeNum <= 9) return 'middle'
      if (gradeNum >= 10 && gradeNum <= 12) return 'high'
    }

    return 'unknown'
  }

  const loadReports = useCallback(async (currentStudent: string, currentType: string) => {
    try {
      setLoading(true)

      const result = await getReports({
        studentId: currentStudent !== 'all' ? currentStudent : undefined,
        reportType: currentType !== 'all' ? currentType : undefined,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || '리포트를 불러오는 중 오류가 발생했습니다.')
      }

      const fetchedReports = result.data
      setReports(fetchedReports)

      if (currentStudent === 'all' && currentType === 'all') {
        setAllReports(fetchedReports)
      }
    } catch (error) {
      console.error('Error loading reports:', error)
      toast({
        title: '데이터 로드 오류',
        description: '리포트를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Load reports when server-side filters change
  useEffect(() => {
    loadReports(selectedStudent, selectedType)
  }, [loadReports, selectedStudent, selectedType])

  // Apply client-side filters (school level, stat card filter)
  useEffect(() => {
    let filtered = reports

    if (selectedSchoolLevel !== 'all') {
      filtered = filtered.filter((report) => {
        const grade = report.students?.grade || ''
        const schoolLevel = getSchoolLevel(grade)
        return schoolLevel === selectedSchoolLevel
      })
    }

    if (activeStatFilter) {
      const now = new Date()
      switch (activeStatFilter) {
        case 'thisMonth':
          filtered = filtered.filter((r) => {
            const genDate = new Date(r.generated_at)
            return genDate.getMonth() === now.getMonth() && genDate.getFullYear() === now.getFullYear()
          })
          break
        case 'sent':
          filtered = filtered.filter((r) => r.sent_at !== null)
          break
        case 'notSent':
          filtered = filtered.filter((r) => r.sent_at === null)
          break
      }
    }

    setFilteredReports(filtered)
  }, [reports, selectedSchoolLevel, activeStatFilter])

  function handleSendClick(reportId: string, studentName: string) {
    setReportToSend({ id: reportId, name: studentName })
    setSendDialogOpen(true)
  }

  async function handleConfirmSend() {
    if (!reportToSend) return

    setIsSending(true)

    try {
      const { sendReportToAllGuardians } = await import('@/app/actions/reports-send')

      const result = await sendReportToAllGuardians(reportToSend.id)

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

      loadReports(selectedStudent, selectedType)
    } catch (error) {
      console.error('Error sending report:', error)
      const errorMessage = error instanceof Error ? error.message : '리포트를 전송하는 중 오류가 발생했습니다.'

      setFailedReportName(reportToSend.name)
      setErrorInfo(classifyReportSendError(errorMessage))
      setErrorDialogOpen(true)
    } finally {
      setIsSending(false)
      setSendDialogOpen(false)
      setReportToSend(null)
    }
  }

  function handleDeleteClick(reportId: string, studentName: string) {
    setReportToDelete({ id: reportId, name: studentName })
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
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

      loadReports(selectedStudent, selectedType)
    } catch (error) {
      console.error('Error deleting report:', error)
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
  }

  function handleBulkDeleteClick(selectedReports: ReportWithStudent[]) {
    setReportsToDelete(selectedReports)
    setBulkDeleteDialogOpen(true)
  }

  async function handleConfirmBulkDelete() {
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

      loadReports(selectedStudent, selectedType)
    } catch (error) {
      console.error('Error bulk deleting reports:', error)
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
  }

  function handleBulkSendClick(selectedReports: ReportWithStudent[]) {
    setReportsToSend(selectedReports)
    setBulkSendDialogOpen(true)
  }

  async function handleConfirmBulkSend() {
    if (reportsToSend.length === 0) return

    setIsBulkSending(true)
    setBulkSendProgress({ current: 0, total: reportsToSend.length })

    try {
      const { sendReportToAllGuardians } = await import('@/app/actions/reports-send')

      let totalSuccess = 0
      let totalFail = 0
      const classifiedErrors: Array<{ name: string; error: ReportSendErrorInfo }> = []
      let processed = 0

      // 동시성 제한 (최대 3개씩 병렬 처리)
      const CONCURRENCY = 3
      for (let i = 0; i < reportsToSend.length; i += CONCURRENCY) {
        const batch = reportsToSend.slice(i, i + CONCURRENCY)
        const results = await Promise.allSettled(
          batch.map(async (report) => {
            const studentName = report.students?.users?.name || '알 수 없음'
            try {
              const result = await sendReportToAllGuardians(report.id)
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
          setBulkSendProgress({ current: processed, total: reportsToSend.length })

          if (result.status === 'fulfilled') {
            if (result.value.success) {
              totalSuccess += result.value.successCount
              totalFail += result.value.failCount
            } else {
              classifiedErrors.push({ name: result.value.name, error: result.value.error })
            }
          }
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

      loadReports(selectedStudent, selectedType)
    } catch (error) {
      console.error('Error bulk sending reports:', error)
      const errorMessage = error instanceof Error ? error.message : '리포트를 전송하는 중 오류가 발생했습니다.'
      const classified = classifyReportSendError(errorMessage)
      setErrorInfo(classified)
      setFailedReportName('')
      setErrorDialogOpen(true)
    } finally {
      setIsBulkSending(false)
      setBulkSendDialogOpen(false)
      setReportsToSend([])
      setBulkSendProgress({ current: 0, total: 0 })
    }
  }

  return (
    <PageWrapper
      title="리포트 관리"
      subtitle="생성된 모든 리포트를 조회하고 관리합니다"
      actions={
        <div className="flex gap-2">
          <Button onClick={() => router.push('/reports/new')}>
            <Plus className="h-4 w-4 mr-2" />
            개별 생성
          </Button>
          <Button onClick={() => router.push('/reports/bulk')} variant="outline">
            <Users className="h-4 w-4 mr-2" />
            일괄 생성
          </Button>
        </div>
      }
    >
      <div className="space-y-6">

        {/* Statistics - Clickable Cards */}
        <ReportStatCards
          allReports={allReports}
          activeStatFilter={activeStatFilter}
          onStatFilterChange={setActiveStatFilter}
        />

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
          <Select value={selectedSchoolLevel} onValueChange={setSelectedSchoolLevel}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="학교급" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 학교급</SelectItem>
              <SelectItem value="elementary">초등</SelectItem>
              <SelectItem value="middle">중등</SelectItem>
              <SelectItem value="high">고등</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="학생 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 학생</SelectItem>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.student_code} - {student.user_id?.name || '이름 없음'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="유형 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              <SelectItem value="weekly">주간</SelectItem>
              <SelectItem value="monthly">월간</SelectItem>
              <SelectItem value="quarterly" disabled>분기 (준비 중)</SelectItem>
            </SelectContent>
          </Select>

          {/* Active filters display */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeStatFilter && (
              <Badge
                variant="outline"
                className="h-8 px-3 cursor-pointer hover:bg-destructive/10"
                onClick={() => setActiveStatFilter(null)}
              >
                {activeStatFilter === 'thisMonth' && '이번 달'}
                {activeStatFilter === 'sent' && '전송 완료'}
                {activeStatFilter === 'notSent' && '미전송'}
                <span className="ml-1 text-muted-foreground">x</span>
              </Badge>
            )}
            {(selectedSchoolLevel !== 'all' || selectedStudent !== 'all' || selectedType !== 'all' || activeStatFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSchoolLevel('all')
                  setSelectedStudent('all')
                  setSelectedType('all')
                  setActiveStatFilter(null)
                }}
                className="h-8 text-muted-foreground hover:text-foreground"
              >
                필터 초기화
              </Button>
            )}
          </div>

          <Badge variant="secondary" className="h-10 px-4 flex items-center whitespace-nowrap ml-auto">
            {filteredReports.length}개 리포트
          </Badge>
        </div>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>리포트 목록</CardTitle>
            <CardDescription>
              생성된 모든 리포트를 확인하고 보호자에게 전송할 수 있습니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportTableImproved
              data={filteredReports}
              loading={loading}
              onSendClick={handleSendClick}
              onDeleteClick={handleDeleteClick}
              onBulkDeleteClick={handleBulkDeleteClick}
              onBulkSendClick={handleBulkSendClick}
            />
          </CardContent>
        </Card>

        {/* Send Confirmation Dialog */}
        <ConfirmationDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          title="리포트를 전송하시겠습니까?"
          description={reportToSend ? `"${reportToSend.name}" 학생의 리포트가 모든 보호자에게 전송됩니다.` : ''}
          confirmText="전송"
          variant="default"
          isLoading={isSending}
          onConfirm={handleConfirmSend}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="리포트를 삭제하시겠습니까?"
          description={reportToDelete ? `"${reportToDelete.name}" 학생의 리포트가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.` : ''}
          confirmText="삭제"
          variant="destructive"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
        />

        {/* Bulk Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          title={`${reportsToDelete.length}개의 리포트를 삭제하시겠습니까?`}
          description={
            <div className="space-y-2">
              <p>선택한 리포트가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.</p>
              {reportsToDelete.length > 0 && (
                <div className="mt-3 p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto">
                  <p className="font-medium mb-1 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    삭제될 리포트:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    {reportsToDelete.slice(0, 5).map((report) => (
                      <li key={report.id}>
                        {report.students?.users?.name || '이름 없음'} - {report.report_type === 'weekly' ? '주간' : report.report_type === 'monthly' ? '월간' : '분기'}
                      </li>
                    ))}
                    {reportsToDelete.length > 5 && (
                      <li>외 {reportsToDelete.length - 5}개...</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          }
          confirmText={`${reportsToDelete.length}개 삭제`}
          variant="destructive"
          isLoading={isBulkDeleting}
          onConfirm={handleConfirmBulkDelete}
        />

        {/* Bulk Send Confirmation Dialog */}
        <ConfirmationDialog
          open={bulkSendDialogOpen}
          onOpenChange={setBulkSendDialogOpen}
          title={`${reportsToSend.length}개의 리포트를 전송하시겠습니까?`}
          description={
            <div className="space-y-2">
              <p>선택한 리포트가 각 학생의 모든 보호자에게 전송됩니다.</p>
              {reportsToSend.length > 0 && (
                <div className="mt-3 p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto">
                  <p className="font-medium mb-1 flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    전송될 리포트:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    {reportsToSend.slice(0, 5).map((report) => (
                      <li key={report.id}>
                        {report.students?.users?.name || '이름 없음'} - {report.report_type === 'weekly' ? '주간' : report.report_type === 'monthly' ? '월간' : '분기'}
                      </li>
                    ))}
                    {reportsToSend.length > 5 && (
                      <li>외 {reportsToSend.length - 5}개...</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          }
          confirmText={
            isBulkSending && bulkSendProgress.total > 0
              ? `전송 중... (${bulkSendProgress.current}/${bulkSendProgress.total})`
              : `${reportsToSend.length}개 전송`
          }
          variant="default"
          isLoading={isBulkSending}
          onConfirm={handleConfirmBulkSend}
        />

        {/* Error Information Dialog */}
        <ReportErrorDialog
          open={errorDialogOpen}
          onOpenChange={setErrorDialogOpen}
          errorInfo={errorInfo}
          failedReportName={failedReportName}
        />

        {/* Bulk Send Errors Dialog */}
        <ReportBulkErrorDialog
          open={bulkErrorDialogOpen}
          onOpenChange={setBulkErrorDialogOpen}
          errors={bulkSendErrors}
          onClose={() => {
            setBulkErrorDialogOpen(false)
            setBulkSendErrors([])
          }}
        />
      </div>
    </PageWrapper>
  )
}
