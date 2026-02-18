'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateBulkMonthlyReports } from '@/app/actions/reports'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Badge } from '@ui/badge'
import { Checkbox } from '@ui/checkbox'
import { Label } from '@ui/label'
import { Progress } from '@ui/progress'
import { useToast } from '@/hooks/use-toast'
import { FileText, Send, CheckCircle, XCircle } from 'lucide-react'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { ConfirmationDialog } from '@ui/confirmation-dialog'

interface Student {
  id: string
  student_code: string
  users: {
    name: string
    email: string | null
  } | null
}

interface Class {
  id: string
  name: string
}

interface GenerationResult {
  studentId: string
  studentName: string
  success: boolean
  error?: string
}

interface BulkReportsContentProps {
  initialStudents: Student[]
  initialClasses: Class[]
}

export function BulkReportsContent({ initialStudents, initialClasses }: BulkReportsContentProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [classes] = useState<Class[]>(initialClasses)
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<GenerationResult[]>([])
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const filterStudents = useCallback(async () => {
    if (selectedClass === 'all') {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, student_code, user_id!inner(name, email)')
          .is('deleted_at', null)
          .order('student_code')

        if (error) throw error
        const mappedData = data?.map(student => ({
          ...student,
          users: student.user_id
        }))
        setStudents(mappedData as unknown as Student[])
      } catch (error) {
        console.error('Error loading students:', error)
      }
      return
    }

    try {
      const { data: enrollments, error } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', selectedClass)
        .eq('status', 'active')

      if (error) throw error

      const studentIds = enrollments.map((e) => e.student_id)

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, student_code, user_id!inner(name, email)')
        .in('id', studentIds)
        .is('deleted_at', null)
        .order('student_code')

      if (studentsError) throw studentsError
      const mappedData = studentsData?.map(student => ({
        ...student,
        users: student.user_id
      }))
      setStudents(mappedData as unknown as Student[])
    } catch (error) {
      console.error('Error filtering students:', error)
    }
  }, [selectedClass, supabase])

  useEffect(() => {
    filterStudents()
  }, [filterStudents])

  function toggleStudent(studentId: string) {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  function toggleAll() {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map((s) => s.id)))
    }
  }

  function handleGenerateClick() {
    if (selectedStudents.size === 0) {
      toast({
        title: '학생 선택 필요',
        description: '리포트를 생성할 학생을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    setGenerateDialogOpen(true)
  }

  async function handleConfirmGenerate() {
    setGenerateDialogOpen(false)
    setGenerating(true)
    setProgress(0)
    setResults([])

    const studentIds = students
      .filter((s) => selectedStudents.has(s.id))
      .map((s) => s.id)

    try {
      // 5명씩 배치로 나눠서 서버 액션 호출 (배치마다 progress 갱신)
      const BATCH_SIZE = 5
      const allResults: GenerationResult[] = []

      for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
        const batchIds = studentIds.slice(i, i + BATCH_SIZE)
        const result = await generateBulkMonthlyReports(batchIds, selectedYear, selectedMonth)

        const batchResults: GenerationResult[] = result.results.map((r) => ({
          studentId: r.studentId,
          studentName: students.find((s) => s.id === r.studentId)?.users?.name || '이름 없음',
          success: r.success,
          error: r.skipped ? '이미 생성된 리포트 (스킵)' : r.error,
        }))

        allResults.push(...batchResults)
        setResults([...allResults])
        setProgress(Math.round(Math.min(i + BATCH_SIZE, studentIds.length) / studentIds.length * 100))
      }

      const successCount = allResults.filter((r) => r.success).length
      const failCount = allResults.filter((r) => !r.success).length

      toast({
        title: '일괄 생성 완료',
        description: `성공: ${successCount}건, 실패: ${failCount}건`,
      })
    } catch (error: unknown) {
      console.error('Error in bulk generation:', error)
      toast({
        title: '일괄 생성 오류',
        description: error instanceof Error ? error.message : '리포트를 생성하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <PageWrapper
      title="리포트 일괄 생성"
      subtitle="반 또는 전체 학생의 리포트를 한 번에 생성하세요"
    >
      <div className="space-y-6">

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>생성 설정</CardTitle>
            <CardDescription>리포트 유형과 기간을 선택하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>리포트 유형</Label>
                <div className="flex items-center h-10 px-3 rounded-md border bg-muted text-sm">
                  월간 리포트
                </div>
              </div>

              <div className="space-y-2">
                <Label>연도</Label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
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

              <div className="space-y-2">
                <Label>월</Label>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
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

            <p className="text-sm text-muted-foreground">
              생성된 리포트는 리포트 목록에서 보호자에게 전송할 수 있습니다.
            </p>
          </CardContent>
        </Card>

        {/* Student Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>학생 선택</CardTitle>
                <CardDescription>리포트를 생성할 학생을 선택하세요</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedStudents(new Set()) }}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 학생</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={toggleAll}>
                  {selectedStudents.size === students.length ? '전체 해제' : '전체 선택'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="grid gap-3 md:grid-cols-2">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => toggleStudent(student.id)}
                  >
                    <Checkbox
                      checked={selectedStudents.has(student.id)}
                      onCheckedChange={() => toggleStudent(student.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{student.users?.name || '이름 없음'}</div>
                      <div className="text-sm text-muted-foreground">{student.student_code}</div>
                    </div>
                    {student.users?.email && (
                      <Badge variant="outline" className="text-xs">
                        <Send className="h-3 w-3 mr-1" />
                        이메일
                      </Badge>
                    )}
                  </div>
                ))}
              </div>

              {students.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>학생이 없습니다.</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Badge variant="secondary" className="text-sm">
                {selectedStudents.size}명 선택됨
              </Badge>
              <Button
                size="lg"
                onClick={handleGenerateClick}
                disabled={generating || selectedStudents.size === 0}
              >
                <FileText className="h-5 w-5 mr-2" />
                {generating ? '생성 중...' : `리포트 생성 (${selectedStudents.size}명)`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        {generating && (
          <Card>
            <CardHeader>
              <CardTitle>생성 진행 중</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {progress}% 완료
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>생성 결과</CardTitle>
              <CardDescription>
                성공: {results.filter((r) => r.success).length}건 /
                실패: {results.filter((r) => !r.success).length}건
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((result) => (
                  <div
                    key={result.studentId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">{result.studentName}</span>
                    </div>
                    <div>
                      {result.success ? (
                        <Badge variant="default">성공</Badge>
                      ) : (
                        <Badge variant="destructive" title={result.error}>
                          실패
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate Confirmation Dialog */}
        <ConfirmationDialog
          open={generateDialogOpen}
          onOpenChange={setGenerateDialogOpen}
          title="리포트를 생성하시겠습니까?"
          description={`${selectedStudents.size}명의 학생 리포트가 생성됩니다.`}
          confirmText="생성"
          variant="default"
          isLoading={generating}
          onConfirm={handleConfirmGenerate}
        />
      </div>
    </PageWrapper>
  )
}
