'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { Plus, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { ReportTableImproved } from '@/components/features/reports/report-table-improved'
import { ReportStatCards } from '@/components/features/reports/report-stat-cards'
import { ReportDialogs } from '@/components/features/reports/report-dialogs'
import { ReportFilterPresets, type PresetFilter } from '@/components/features/reports/report-filter-presets'
import { SendWorkbench } from '@/components/features/reports/send-workbench'
import { CommentWorkbench } from '@/components/features/reports/comment-workbench'
import { useReportActions } from '@/hooks/use-report-actions'
import { getReports } from '@/app/actions/reports'
import type { ReportWithStudent, StudentForFilter } from '@/core/types/report.types'

interface ReportsContentProps {
  initialReports: ReportWithStudent[]
  initialStudents: StudentForFilter[]
}

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

export function ReportsContent({ initialReports, initialStudents }: ReportsContentProps) {
  const [reports, setReports] = useState<ReportWithStudent[]>(initialReports)
  const [filteredReports, setFilteredReports] = useState<ReportWithStudent[]>(initialReports)
  const [allReports, setAllReports] = useState<ReportWithStudent[]>(initialReports)
  const [students] = useState<StudentForFilter[]>(initialStudents)
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<string>('all')
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null)
  const [activePresets, setActivePresets] = useState<PresetFilter[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('browse')

  const { toast } = useToast()
  const router = useRouter()

  const loadReports = useCallback(async () => {
    try {
      setLoading(true)

      const result = await getReports({
        studentId: selectedStudent !== 'all' ? selectedStudent : undefined,
        reportType: selectedType !== 'all' ? selectedType : undefined,
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || '리포트를 불러오는 중 오류가 발생했습니다.')
      }

      const fetchedReports = result.data
      setReports(fetchedReports)

      if (selectedStudent === 'all' && selectedType === 'all') {
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
  }, [toast, selectedStudent, selectedType])

  const actions = useReportActions(loadReports)

  // Load reports when server-side filters change
  useEffect(() => {
    loadReports()
  }, [loadReports])

  // Apply client-side filters (school level, stat card filter, presets)
  useEffect(() => {
    let filtered = reports

    if (selectedSchoolLevel !== 'all') {
      filtered = filtered.filter((report) => {
        const grade = report.students?.grade || ''
        return getSchoolLevel(grade) === selectedSchoolLevel
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

    // Apply preset filters
    if (activePresets.includes('today')) {
      const today = new Date().toISOString().split('T')[0]
      filtered = filtered.filter((r) => r.generated_at.startsWith(today))
    }
    if (activePresets.includes('notSent')) {
      filtered = filtered.filter((r) => r.sent_at === null)
    }

    setFilteredReports(filtered)
  }, [reports, selectedSchoolLevel, activeStatFilter, activePresets])

  function handlePresetToggle(preset: PresetFilter) {
    setActivePresets((prev) =>
      prev.includes(preset) ? prev.filter((p) => p !== preset) : [...prev, preset]
    )
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
  }

  function resetAllFilters() {
    setSelectedSchoolLevel('all')
    setSelectedStudent('all')
    setSelectedType('all')
    setActiveStatFilter(null)
    setActivePresets([])
  }

  const hasActiveFilters =
    selectedSchoolLevel !== 'all' ||
    selectedStudent !== 'all' ||
    selectedType !== 'all' ||
    activeStatFilter !== null ||
    activePresets.length > 0

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
        <ReportStatCards
          allReports={allReports}
          activeStatFilter={activeStatFilter}
          onStatFilterChange={setActiveStatFilter}
        />

        {/* Quick filter presets */}
        <ReportFilterPresets
          activePresets={activePresets}
          onToggle={handlePresetToggle}
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
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="browse">조회</TabsTrigger>
            <TabsTrigger value="send">일괄 전송</TabsTrigger>
            <TabsTrigger value="comment">코멘트 작업</TabsTrigger>
          </TabsList>

          <TabsContent value="browse">
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
                  mode="browse"
                  onSendClick={actions.handleSendClick}
                  onDeleteClick={actions.handleDeleteClick}
                  onBulkDeleteClick={actions.handleBulkDeleteClick}
                  onBulkSendClick={actions.handleBulkSendClick}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="send">
            <SendWorkbench
              data={filteredReports}
              loading={loading}
              onComplete={loadReports}
            />
          </TabsContent>

          <TabsContent value="comment">
            <CommentWorkbench
              data={filteredReports}
              loading={loading}
              onComplete={loadReports}
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ReportDialogs {...actions} />
      </div>
    </PageWrapper>
  )
}
