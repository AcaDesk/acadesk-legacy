'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateMonthlyReport, generateWeeklyReport, saveReport, getStudentsForReport } from '@/app/actions/reports'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Separator } from '@ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs'
import { Input } from '@ui/input'
import { Badge } from '@ui/badge'
import { useToast } from '@/hooks/use-toast'
import { FileText, UserPlus, X } from 'lucide-react'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { SelectStudentDialog } from '@/components/features/reports/select-student-dialog'

interface Student {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  users: {
    name: string
  } | null
  class_enrollments?: Array<{
    classes: {
      name: string
    } | null
  }>
}

export default function ReportsPage() {
  // All Hooks must be called before any early returns
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedStudentName, setSelectedStudentName] = useState<string>('')
  const [showSelectDialog, setShowSelectDialog] = useState(false)
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('monthly')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)

  const { toast } = useToast()
  const router = useRouter()

  const years = [2024, 2025, 2026]
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  useEffect(() => {
    loadStudents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadStudents() {
    try {
      setLoadingStudents(true)
      const result = await getStudentsForReport()

      if (!result.success || !result.data) {
        throw new Error(result.error || '학생 목록 조회 실패')
      }

      setStudents(result.data as unknown as Student[])
    } catch (error) {
      console.error('Error loading students:', error)
      toast({
        title: '데이터 로드 오류',
        description: '학생 목록을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoadingStudents(false)
    }
  }

  function handleStudentSelect(studentId: string, studentName: string) {
    setSelectedStudent(studentId)
    setSelectedStudentName(studentName)
  }

  function handleClearStudent() {
    setSelectedStudent('')
    setSelectedStudentName('')
  }

  async function generateReport() {
    if (!selectedStudent) {
      toast({
        title: '학생 선택 필요',
        description: '리포트를 생성할 학생을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (reportType === 'weekly' && (!startDate || !endDate)) {
      toast({
        title: '기간 선택 필요',
        description: '주간 리포트 생성을 위해 시작일과 종료일을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    setGenerating(true)
    try {
      // Generate report
      let result
      let periodDescription = ''

      if (reportType === 'weekly') {
        result = await generateWeeklyReport(selectedStudent, startDate, endDate)
        periodDescription = `${startDate} ~ ${endDate}`
      } else {
        result = await generateMonthlyReport(selectedStudent, selectedYear, selectedMonth)
        periodDescription = `${selectedYear}년 ${selectedMonth}월`
      }

      if (!result.success || !result.data) {
        throw new Error(result.error || '리포트 생성 실패')
      }

      // Save report to database
      const saveResult = await saveReport(result.data, reportType)

      if (!saveResult.success || !saveResult.data) {
        console.warn('리포트 저장 실패:', saveResult.error)
        throw new Error(saveResult.error || '리포트 저장 실패')
      }

      toast({
        title: '리포트 생성 완료',
        description: `${result.data.studentName || result.data.student?.name || '학생'}의 ${periodDescription} 리포트가 생성되었습니다.`,
      })

      // Redirect to report detail page
      router.push(`/reports/${saveResult.data.id}`)
    } catch (error: unknown) {
      console.error('Error generating report:', error)
      toast({
        title: '리포트 생성 오류',
        description: error instanceof Error ? error.message : '리포트를 생성하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  // Feature flag checks after all Hooks
  const featureStatus = FEATURES.reportManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="월간 리포트" description="학생별 월간 성적, 출석, 과제 완료율을 자동으로 분석하여 리포트를 생성하는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="월간 리포트" reason="리포트 생성 시스템 업그레이드가 진행 중입니다." />;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <section aria-label="페이지 헤더" className="animate-in fade-in-50 slide-in-from-top-2 duration-500">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">리포트 생성</h1>
            <p className="text-muted-foreground mt-1">
              학생별 주간/월간 성적 리포트를 자동 생성합니다
            </p>
          </div>
          <Button onClick={() => router.push('/reports')} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            리포트 목록
          </Button>
        </div>
      </section>

      {/* Main Content */}
      <section aria-label="리포트 생성 폼" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500" style={{ animationDelay: '100ms' }}>
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>생성 설정</CardTitle>
              <CardDescription>
                학생과 기간을 선택하면 자동으로 리포트가 생성됩니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">학생 선택</label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20">
                    <div className="flex items-center gap-3">
                      <Badge variant="default" className="text-xs">
                        선택됨
                      </Badge>
                      <div>
                        <div className="font-medium">{selectedStudentName}</div>
                        <div className="text-sm text-muted-foreground">
                          {students.find(s => s.id === selectedStudent)?.student_code}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSelectDialog(true)}
                      >
                        변경
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClearStudent}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-auto py-6 justify-start"
                    onClick={() => setShowSelectDialog(true)}
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">학생 선택하기</div>
                      <div className="text-sm text-muted-foreground">
                        리포트를 생성할 학생을 선택하세요
                      </div>
                    </div>
                  </Button>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">리포트 유형</label>
                <Tabs value={reportType} onValueChange={(v) => setReportType(v as 'weekly' | 'monthly')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="weekly">주간</TabsTrigger>
                    <TabsTrigger value="monthly">월간</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {reportType === 'weekly' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">시작일</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">종료일</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">연도</label>
                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(v) => setSelectedYear(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}년
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">월</label>
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(v) => setSelectedMonth(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month} value={month.toString()}>
                            {month}월
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={generateReport}
                disabled={generating || !selectedStudent}
                className="flex-1"
                size="lg"
              >
                {generating ? '생성 중...' : '리포트 생성'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Message */}
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="flex-shrink-0">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">리포트 생성 후 자동 저장</h3>
              <p className="text-sm text-muted-foreground">
                리포트가 생성되면 자동으로 저장되어 상세 페이지로 이동합니다.
                저장된 리포트는 <span className="font-medium">'리포트 목록'</span>에서 언제든지 확인하고 보호자에게 전송할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      </section>

      {/* Select Student Dialog */}
      <SelectStudentDialog
        open={showSelectDialog}
        onOpenChange={setShowSelectDialog}
        value={selectedStudent}
        onSelect={handleStudentSelect}
        students={students.map(s => ({
          id: s.id,
          student_code: s.student_code,
          name: s.users?.name || '이름 없음',
          grade: s.grade,
          school: s.school,
          classes: s.class_enrollments
            ?.map(e => e.classes?.name)
            .filter((name): name is string => Boolean(name)) || [],
        }))}
        loading={loadingStudents}
      />
    </div>
  )
}
