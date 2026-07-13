'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { Plus, Users } from 'lucide-react'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { ReportTableImproved } from '@/components/features/reports/report-table-improved'
import { ReportStatCards } from '@/components/features/reports/report-stat-cards'
import { ReportDialogs } from '@/components/features/reports/report-dialogs'
import { ReportFilterPresets, type PresetFilter } from '@/components/features/reports/report-filter-presets'
import { JobsContent } from '@/components/features/jobs/JobsContent'
import { useReportActions } from '@/hooks/use-report-actions'
import { useReportsQuery, type ReportPeriod } from '@/hooks/queries/use-reports-query'
import { queryKeys } from '@/lib/query-keys'
import type { ReportWithStudent, StudentForFilter } from '@/core/types/report.types'

type ReportsTab = 'list' | 'jobs'

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
  const [allReports, setAllReports] = useState<ReportWithStudent[]>(initialReports)
  const students = initialStudents
  const [selectedStudent, setSelectedStudent] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedSchoolLevel, setSelectedSchoolLevel] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('this_month')
  const [activePresets, setActivePresets] = useState<PresetFilter[]>([])

  const queryClient = useQueryClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab: ReportsTab = searchParams.get('tab') === 'jobs' ? 'jobs' : 'list'

  // 서버 필터가 쿼리 key에 포함되어 변경 시 자동 refetch
  const listQuery = useReportsQuery(
    { studentId: selectedStudent, reportType: selectedType, period: selectedPeriod },
    initialReports
  )
  const reports = useMemo(() => listQuery.data ?? [], [listQuery.data])
  const loading = listQuery.isPending || listQuery.isPlaceholderData

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value === 'list') {
        params.delete('tab')
      } else {
        params.set('tab', value)
      }
      const queryString = params.toString()
      router.replace(queryString ? `/reports?${queryString}` : '/reports', { scroll: false })
    },
    [router, searchParams],
  )

  // 리포트 액션(전송/삭제) 후 목록 갱신 — 캐시 무효화로 처리
  const invalidateReports = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.reports.lists() })
  }, [queryClient])

  const actions = useReportActions(invalidateReports)

  // 전체(무필터) 목록 스냅샷 — 통계 카드용
  useEffect(() => {
    if (listQuery.data && selectedStudent === 'all' && selectedType === 'all') {
      setAllReports(listQuery.data)
    }
  }, [listQuery.data, selectedStudent, selectedType])

  // Apply client-side filters (school level, presets)
  const filteredReports = useMemo(() => {
    let filtered = reports

    if (selectedSchoolLevel !== 'all') {
      filtered = filtered.filter((report) => {
        const grade = report.students?.grade || ''
        return getSchoolLevel(grade) === selectedSchoolLevel
      })
    }

    // Apply preset filters
    if (activePresets.includes('today')) {
      const today = new Date().toISOString().split('T')[0]
      filtered = filtered.filter((r) => r.generated_at.startsWith(today))
    }
    if (activePresets.includes('notSent')) {
      filtered = filtered.filter((r) => r.sent_at === null)
    }
    if (activePresets.includes('sent')) {
      filtered = filtered.filter((r) => r.sent_at !== null)
    }

    return filtered
  }, [reports, selectedSchoolLevel, activePresets])

  function handlePresetToggle(preset: PresetFilter) {
    setActivePresets((prev) => {
      if (prev.includes(preset)) return prev.filter((p) => p !== preset)
      // 전송 상태 프리셋은 상호 배타 (미전송 ↔ 전송 완료)
      const exclusive: Record<string, PresetFilter> = { notSent: 'sent', sent: 'notSent' }
      const opposite = exclusive[preset]
      const next = opposite ? prev.filter((p) => p !== opposite) : prev
      return [...next, preset]
    })
  }

  function resetAllFilters() {
    setSelectedSchoolLevel('all')
    setSelectedStudent('all')
    setSelectedType('all')
    setSelectedPeriod('this_month')
    setActivePresets([])
  }

  const hasActiveFilters =
    selectedSchoolLevel !== 'all' ||
    selectedStudent !== 'all' ||
    selectedType !== 'all' ||
    selectedPeriod !== 'this_month' ||
    activePresets.length > 0

  return (
    <PageWrapper
      title="리포트 관리"
      subtitle="생성된 모든 리포트를 조회하고 관리합니다"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push('/reports/new')}>
            <Plus className="h-4 w-4 mr-2" />
            개별 생성
          </Button>
          <Button onClick={() => router.push('/reports/bulk')} variant="outline">
            <Users className="h-4 w-4 mr-2" />
            일괄 작업
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">리포트 목록</TabsTrigger>
          <TabsTrigger value="jobs">작업 이력</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
        {/* Statistics */}
        <ReportStatCards allReports={allReports} />

        {/* Quick filter presets */}
        <ReportFilterPresets
          activePresets={activePresets}
          onToggle={handlePresetToggle}
        />

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as typeof selectedPeriod)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">이번 달</SelectItem>
              <SelectItem value="last_month">지난 달</SelectItem>
              <SelectItem value="last_3_months">최근 3개월</SelectItem>
              <SelectItem value="all">전체</SelectItem>
            </SelectContent>
          </Select>
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
            </SelectContent>
          </Select>

          {/* Active filters display */}
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

          <Badge variant="secondary" className="h-10 px-4 flex items-center whitespace-nowrap ml-auto">
            {filteredReports.length}개 리포트
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>리포트 목록</CardTitle>
            <CardDescription>
              생성된 리포트를 확인하고 개별 전송/삭제를 처리할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportTableImproved
              data={filteredReports}
              loading={loading}
              onSendClick={actions.handleSendClick}
              onDeleteClick={actions.handleDeleteClick}
              onBulkDeleteClick={actions.handleBulkDeleteClick}
              onBulkSendClick={actions.handleBulkSendClick}
            />
          </CardContent>
        </Card>

        {/* Dialogs */}
        <ReportDialogs {...actions} />
        </TabsContent>

        <TabsContent value="jobs">
          <JobsContent />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  )
}
