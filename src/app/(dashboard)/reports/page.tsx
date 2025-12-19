'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Plus, Users, FileText, Calendar, Send, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import type { ReportWithStudent, StudentForFilter } from '@/core/types/report.types'
import { AlertTriangle } from 'lucide-react'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { ReportTableImproved } from '@/components/features/reports/report-table-improved'

export default function ReportsPage() {
  // All Hooks must be called before any early returns
  const [reports, setReports] = useState<ReportWithStudent[]>([])
  const [filteredReports, setFilteredReports] = useState<ReportWithStudent[]>([])
  const [allReports, setAllReports] = useState<ReportWithStudent[]>([]) // For statistics
  const [students, setStudents] = useState<StudentForFilter[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<string>('all')
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
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

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  // Load students once on mount
  useEffect(() => {
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load reports when server-side filters change
  useEffect(() => {
    loadReports(selectedStudent, selectedType)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent, selectedType])

  // Apply client-side filters (school level, stat card filter)
  useEffect(() => {
    let filtered = reports

    // Filter by school level
    if (selectedSchoolLevel !== 'all') {
      filtered = filtered.filter((report) => {
        const grade = report.students?.grade || ''
        const schoolLevel = getSchoolLevel(grade)
        return schoolLevel === selectedSchoolLevel
      })
    }

    // Filter by stat card selection
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

  // Helper function to determine school level from grade
  function getSchoolLevel(grade: string): 'elementary' | 'middle' | 'high' | 'unknown' {
    if (!grade) return 'unknown'
    const normalizedGrade = grade.toLowerCase().trim()

    // Check for Korean format (초1, 초2, 중1, 중2, 고1, 고2)
    if (normalizedGrade.startsWith('초') || normalizedGrade.includes('초등')) return 'elementary'
    if (normalizedGrade.startsWith('중') || normalizedGrade.includes('중학')) return 'middle'
    if (normalizedGrade.startsWith('고') || normalizedGrade.includes('고등')) return 'high'

    // Check for number format (1-6: elementary, 7-9: middle, 10-12: high)
    const gradeNum = parseInt(normalizedGrade.replace(/[^0-9]/g, ''))
    if (!isNaN(gradeNum)) {
      if (gradeNum >= 1 && gradeNum <= 6) return 'elementary'
      if (gradeNum >= 7 && gradeNum <= 9) return 'middle'
      if (gradeNum >= 10 && gradeNum <= 12) return 'high'
    }

    return 'unknown'
  }

  async function loadStudents() {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, student_code, user_id!inner(name)')
        .is('deleted_at', null)
        .order('student_code')

      if (studentsError) throw studentsError
      setStudents(studentsData as unknown as StudentForFilter[])
    } catch (error) {
      console.error('Error loading students:', error)
    }
  }

  async function loadReports(
    currentStudent: string,
    currentType: string
  ) {
    try {
      setLoading(true)

      // Build query with filters
      let query = supabase
        .from('reports')
        .select(`
          id,
          report_type,
          period_start,
          period_end,
          content,
          generated_at,
          sent_at,
          students!inner (
            id,
            student_code,
            grade,
            users:user_id!inner (
              name,
              email
            )
          )
        `)
        .order('generated_at', { ascending: false })

      // Apply student filter (server-side)
      if (currentStudent !== 'all') {
        query = query.eq('student_id', currentStudent)
      }

      // Apply type filter (server-side)
      if (currentType !== 'all') {
        query = query.eq('report_type', currentType)
      }

      const { data: reportsData, error: reportsError } = await query

      if (reportsError) throw reportsError

      const fetchedReports = reportsData as unknown as ReportWithStudent[]

      setReports(fetchedReports)
      // Note: filteredReports will be set by the useEffect that handles client-side filtering

      // Load all reports for statistics (only when no filters applied)
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
  }

  function handleSendClick(reportId: string, studentName: string) {
    setReportToSend({ id: reportId, name: studentName })
    setSendDialogOpen(true)
  }

  async function handleConfirmSend() {
    if (!reportToSend) return

    setIsSending(true)

    try {
      // Dynamic import to avoid bundling server action in client
      const { sendReportToAllGuardians } = await import('@/app/actions/reports')

      const result = await sendReportToAllGuardians(reportToSend.id)

      if (!result.success) {
        throw new Error(result.error || '리포트 전송에 실패했습니다')
      }

      const { successCount, failCount } = result.data!

      toast({
        title: '전송 완료',
        description: `${reportToSend.name} 학생의 보호자 ${successCount}명에게 리포트가 전송되었습니다.${failCount > 0 ? ` (${failCount}명 실패)` : ''}`,
      })

      loadReports(selectedStudent, selectedType)
    } catch (error) {
      console.error('Error sending report:', error)
      toast({
        title: '전송 오류',
        description: error instanceof Error ? error.message : '리포트를 전송하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
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
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportToDelete.id)

      if (error) throw error

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
      const { error } = await supabase
        .from('reports')
        .delete()
        .in('id', reportIds)

      if (error) throw error

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

    try {
      // Dynamic import to avoid bundling server action in client
      const { sendReportToAllGuardians } = await import('@/app/actions/reports')

      let totalSuccess = 0
      let totalFail = 0
      const errors: string[] = []

      // 순차적으로 전송 (병렬 처리 시 서버 부하 고려)
      for (const report of reportsToSend) {
        try {
          const result = await sendReportToAllGuardians(report.id)
          if (result.success && result.data) {
            totalSuccess += result.data.successCount
            totalFail += result.data.failCount
          } else {
            errors.push(`${report.students?.users?.name || '알 수 없음'}: ${result.error}`)
          }
        } catch (err) {
          errors.push(`${report.students?.users?.name || '알 수 없음'}: 전송 실패`)
        }
      }

      if (errors.length > 0) {
        toast({
          title: '일부 전송 실패',
          description: `${reportsToSend.length}개 중 ${errors.length}개 리포트 전송에 문제가 있었습니다. 성공: ${totalSuccess}명, 실패: ${totalFail}명`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: '일괄 전송 완료',
          description: `${reportsToSend.length}개의 리포트가 총 ${totalSuccess}명의 보호자에게 전송되었습니다.${totalFail > 0 ? ` (${totalFail}명 실패)` : ''}`,
        })
      }

      loadReports(selectedStudent, selectedType)
    } catch (error) {
      console.error('Error bulk sending reports:', error)
      toast({
        title: '전송 오류',
        description: error instanceof Error ? error.message : '리포트를 전송하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsBulkSending(false)
      setBulkSendDialogOpen(false)
      setReportsToSend([])
    }
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.reportManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="리포트 관리" description="생성된 모든 리포트를 조회하고 보호자에게 전송할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="리포트 관리" reason="리포트 시스템 업데이트가 진행 중입니다." />;
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
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              activeStatFilter === null ? 'ring-2 ring-primary' : 'hover:border-primary/50'
            }`}
            onClick={() => setActiveStatFilter(null)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>총 리포트 수</CardDescription>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl">{allReports.length}개</CardTitle>
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              activeStatFilter === 'thisMonth' ? 'ring-2 ring-primary' : 'hover:border-primary/50'
            }`}
            onClick={() => setActiveStatFilter(activeStatFilter === 'thisMonth' ? null : 'thisMonth')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>이번 달 생성</CardDescription>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl">
                {allReports.filter((r) => {
                  const genDate = new Date(r.generated_at)
                  const now = new Date()
                  return (
                    genDate.getMonth() === now.getMonth() &&
                    genDate.getFullYear() === now.getFullYear()
                  )
                }).length}개
              </CardTitle>
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              activeStatFilter === 'sent' ? 'ring-2 ring-primary' : 'hover:border-primary/50'
            }`}
            onClick={() => setActiveStatFilter(activeStatFilter === 'sent' ? null : 'sent')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>전송 완료</CardDescription>
                <Send className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl text-green-600">
                {allReports.filter((r) => r.sent_at !== null).length}개
              </CardTitle>
            </CardHeader>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              activeStatFilter === 'notSent' ? 'ring-2 ring-primary' : 'hover:border-primary/50'
            }`}
            onClick={() => setActiveStatFilter(activeStatFilter === 'notSent' ? null : 'notSent')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription>미전송</CardDescription>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-3xl text-amber-600">
                {allReports.filter((r) => r.sent_at === null).length}개
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

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
              <SelectItem value="quarterly">분기</SelectItem>
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
                <span className="ml-1 text-muted-foreground">×</span>
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
          confirmText={`${reportsToSend.length}개 전송`}
          variant="default"
          isLoading={isBulkSending}
          onConfirm={handleConfirmBulkSend}
        />
      </div>
    </PageWrapper>
  )
}
