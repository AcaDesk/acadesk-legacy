'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateMonthlyReport, saveReport, getStudentsForReport } from '@/app/actions/reports'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Separator } from '@ui/separator'
import { useToast } from '@/hooks/use-toast'
import { FileText } from 'lucide-react'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

interface Student {
  id: string
  student_code: string
  users: {
    name: string
  } | null
}

export default function ReportsPage() {
  // All Hooks must be called before any early returns
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [generating, setGenerating] = useState(false)

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
    }
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

    setGenerating(true)
    try {
      // Generate report
      const result = await generateMonthlyReport(
        selectedStudent,
        selectedYear,
        selectedMonth
      )

      if (!result.success || !result.data) {
        throw new Error(result.error || '리포트 생성 실패')
      }

      // Save report to database
      const saveResult = await saveReport(result.data, 'monthly')

      if (!saveResult.success || !saveResult.data) {
        console.warn('리포트 저장 실패:', saveResult.error)
        throw new Error(saveResult.error || '리포트 저장 실패')
      }

      toast({
        title: '리포트 생성 완료',
        description: `${result.data.student.name}의 ${selectedYear}년 ${selectedMonth}월 리포트가 생성되었습니다.`,
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
    <PageWrapper
      title="월간 리포트 생성"
      subtitle="학생별 월간 성적 리포트를 자동 생성합니다"
      actions={
        <Button onClick={() => router.push('/reports/list')} variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          리포트 목록
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>리포트 생성</CardTitle>
            <CardDescription>
              학생과 기간을 선택하면 자동으로 월간 리포트가 생성됩니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">학생 선택</label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="학생을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.student_code} - {student.users?.name || 'Unknown'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={generateReport}
                disabled={generating || !selectedStudent}
                className="flex-1"
              >
                {generating ? '생성 중...' : '리포트 생성'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Message */}
        <Card className="mt-6">
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
    </PageWrapper>
  )
}
