'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Eye, Download, Send, Plus, FileText, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from "@/components/layout/page-wrapper"
import type { ReportData } from '@/services/report.service'
import Link from 'next/link'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface Report {
  id: string
  report_type: string
  period_start: string
  period_end: string
  content: ReportData
  generated_at: string
  sent_at: string | null
  students: {
    id: string
    student_code: string
    users: {
      name: string
    }[] | null
  }[] | null
}

interface Student {
  id: string
  student_code: string
  users: {
    name: string
  }[] | null
}

export default function ReportsListPage() {
  // All Hooks must be called before any early returns
  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    filterReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedStudent, selectedType, reports])

  async function loadData() {
    try {
      setLoading(true)

      // Load students for filter
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, student_code, users(name)')
        .is('deleted_at', null)
        .order('student_code')

      if (studentsError) throw studentsError
      setStudents(studentsData as unknown as Student[])

      // Load reports with student data
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select(`
          id,
          report_type,
          period_start,
          period_end,
          content,
          generated_at,
          sent_at,
          students (
            id,
            student_code,
            users (
              name
            )
          )
        `)
        .order('generated_at', { ascending: false })

      if (reportsError) throw reportsError
      setReports(reportsData as unknown as Report[])
      setFilteredReports(reportsData as unknown as Report[])
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: '데이터 로드 오류',
        description: '리포트를 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function filterReports() {
    let filtered = reports

    // Student filter
    if (selectedStudent !== 'all') {
      filtered = filtered.filter((report) => report.students?.[0]?.id === selectedStudent)
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter((report) => report.report_type === selectedType)
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((report) => {
        const studentName = report.students?.[0]?.users?.[0]?.name?.toLowerCase() || ''
        const studentCode = report.students?.[0]?.student_code?.toLowerCase() || ''
        const search = searchTerm.toLowerCase()

        return studentName.includes(search) || studentCode.includes(search)
      })
    }

    setFilteredReports(filtered)
  }

  function getReportTypeBadge(type: string) {
    const types: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      weekly: { label: '주간', variant: 'secondary' },
      monthly: { label: '월간', variant: 'default' },
      quarterly: { label: '분기', variant: 'outline' },
    }

    const config = types[type] || { label: type, variant: 'outline' }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  function formatPeriod(start: string, end: string) {
    const startDate = new Date(start)
    const endDate = new Date(end)

    return `${startDate.getFullYear()}.${String(startDate.getMonth() + 1).padStart(2, '0')}.${String(startDate.getDate()).padStart(2, '0')} ~ ${endDate.getFullYear()}.${String(endDate.getMonth() + 1).padStart(2, '0')}.${String(endDate.getDate()).padStart(2, '0')}`
  }

  async function handleSendToGuardian(reportId: string, studentName: string) {
    if (!confirm(`"${studentName}" 학생의 리포트를 보호자에게 전송하시겠습니까?`)) {
      return
    }

    try {
      // Update sent_at timestamp
      const { error } = await supabase
        .from('reports')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', reportId)

      if (error) throw error

      toast({
        title: '전송 완료',
        description: `${studentName} 학생의 보호자에게 리포트가 전송되었습니다.`,
      })

      loadData()
    } catch (error) {
      console.error('Error sending report:', error)
      toast({
        title: '전송 오류',
        description: '리포트를 전송하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.reportManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="리포트 목록" description="생성된 모든 리포트를 조회하고 보호자에게 전송할 수 있는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="리포트 목록" reason="리포트 시스템 업데이트가 진행 중입니다." />;
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
    <PageWrapper>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/reports" className="hover:text-foreground transition-colors">
              리포트 관리
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">리포트 목록</span>
          </nav>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">리포트 목록</h1>
              <p className="text-muted-foreground">생성된 모든 리포트를 조회하고 관리합니다</p>
            </div>
            <Button onClick={() => router.push('/reports')}>
              <Plus className="h-4 w-4 mr-2" />
              리포트 생성
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="학생 이름, 학번으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="학생 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 학생</SelectItem>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.student_code} - {student.users?.[0]?.name || '이름 없음'}
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
            {filteredReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>생성된 리포트가 없습니다.</p>
                {searchTerm && <p className="text-sm mt-2">검색 결과가 없습니다.</p>}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학생</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>기간</TableHead>
                      <TableHead className="text-center">출석률</TableHead>
                      <TableHead className="text-center">평균 점수</TableHead>
                      <TableHead>생성일</TableHead>
                      <TableHead>전송일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => {
                      const avgScore = report.content.scores.length > 0
                        ? Math.round(
                            report.content.scores.reduce((sum, s) => sum + s.current, 0) /
                            report.content.scores.length
                          )
                        : 0

                      return (
                        <TableRow key={report.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {report.students?.[0]?.users?.[0]?.name || '이름 없음'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {report.students?.[0]?.student_code}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getReportTypeBadge(report.report_type)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatPeriod(report.period_start, report.period_end)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                report.content.attendance.rate >= 90
                                  ? 'default'
                                  : report.content.attendance.rate >= 80
                                  ? 'secondary'
                                  : 'destructive'
                              }
                            >
                              {report.content.attendance.rate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={
                                avgScore >= 90
                                  ? 'default'
                                  : avgScore >= 80
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {avgScore}점
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(report.generated_at).toLocaleDateString('ko-KR')}
                          </TableCell>
                          <TableCell className="text-sm">
                            {report.sent_at ? (
                              <Badge variant="outline" className="text-xs">
                                {new Date(report.sent_at).toLocaleDateString('ko-KR')}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">미전송</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push(`/reports/${report.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Download className="h-4 w-4" />
                              </Button>
                              {!report.sent_at && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleSendToGuardian(
                                      report.id,
                                      report.students?.[0]?.users?.[0]?.name || '학생'
                                    )
                                  }
                                >
                                  <Send className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 리포트 수</CardDescription>
              <CardTitle className="text-3xl">{reports.length}개</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>이번 달 생성</CardDescription>
              <CardTitle className="text-3xl">
                {reports.filter((r) => {
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
                {reports.filter((r) => r.sent_at !== null).length}개
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>미전송</CardDescription>
              <CardTitle className="text-3xl">
                {reports.filter((r) => r.sent_at === null).length}개
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
