'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Plus, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import type { ReportWithStudent, StudentForFilter } from '@/core/types/report.types'
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
  const [loading, setLoading] = useState(true)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [reportToSend, setReportToSend] = useState<{ id: string; name: string } | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reportToDelete, setReportToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  // Load students once on mount
  useEffect(() => {
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load reports when filters change
  useEffect(() => {
    loadReports(selectedStudent, selectedType)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent, selectedType])

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

      const filtered = reportsData as unknown as ReportWithStudent[]

      setReports(filtered)
      setFilteredReports(filtered)

      // Load all reports for statistics (only when no filters applied)
      if (currentStudent === 'all' && currentType === 'all') {
        setAllReports(filtered)
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

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 리포트 수</CardDescription>
              <CardTitle className="text-3xl">{allReports.length}개</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>이번 달 생성</CardDescription>
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
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>전송 완료</CardDescription>
              <CardTitle className="text-3xl">
                {allReports.filter((r) => r.sent_at !== null).length}개
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>미전송</CardDescription>
              <CardTitle className="text-3xl">
                {allReports.filter((r) => r.sent_at === null).length}개
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
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
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="유형 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 유형</SelectItem>
              <SelectItem value="weekly">주간</SelectItem>
              <SelectItem value="monthly">월간</SelectItem>
              <SelectItem value="quarterly">분기</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="h-10 px-4 flex items-center whitespace-nowrap">
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
      </div>
    </PageWrapper>
  )
}
