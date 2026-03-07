'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Checkbox } from '@ui/checkbox'
import {
  MessageSquare,
  Plus,
  Search,
  Calendar as CalendarIcon,
  User,
  Clock,
  Filter,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  Trash2,
  UserCog,
  Download,
} from 'lucide-react'
import Link from 'next/link'
import { PageWrapper } from '@/components/layout/page-wrapper'
import {
  PAGE_LAYOUT,
  GRID_LAYOUTS,
  TEXT_STYLES,
  CARD_STYLES,
} from '@/lib/constants'
import { Input } from '@ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { DatePicker } from '@ui/date-picker'
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs'
import { EmptyState } from '@/components/ui/loading-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ui/dialog'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@ui/pagination'
import { PAGE_ANIMATIONS, getListItemAnimation } from '@/lib/animation-config'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  getConsultations,
  bulkDeleteConsultations,
  bulkUpdateConductor,
  getConsultationPageMeta,
} from '@/app/actions/consultations'
import { getErrorMessage } from '@/lib/error-handlers'
import { format } from 'date-fns'

const ConsultationCalendar = dynamic(
  () => import('@ui/calendar').then((mod) => mod.Calendar),
  { loading: () => <div className="h-[294px] w-[280px] animate-pulse rounded-md bg-muted" /> }
)

type Consultation = {
  id: string
  is_lead: boolean
  student_id: string | null
  lead_name: string | null
  lead_guardian_name: string | null
  lead_guardian_phone: string | null
  converted_to_student_id: string | null
  converted_at: string | null
  consultation_date: string
  consultation_type: string
  title: string
  summary: string | null
  outcome: string | null
  follow_up_required: boolean
  next_consultation_date: string | null
  students?: { name: string }
  users?: { name: string }
}

type Stats = {
  total: number
  lead: number
  student: number
  converted: number
}

type FilterOptions = {
  conductors: Array<{ id: string; name: string }>
}

interface ConsultationsContentProps {
  initialData: Consultation[]
  initialTotalCount: number
  initialStats: Stats | null
  filterOptions: FilterOptions | null
  upcomingFollowUps: Consultation[]
}

const PAGE_SIZE = 20
const DEFAULT_STATS: Stats = {
  total: 0,
  lead: 0,
  student: 0,
  converted: 0,
}

const consultationTypeLabels: Record<string, string> = {
  parent_meeting: '학부모 상담',
  phone_call: '전화 상담',
  video_call: '화상 상담',
  in_person: '대면 상담',
}

export function ConsultationsContent({
  initialData,
  initialTotalCount,
  initialStats,
  filterOptions,
  upcomingFollowUps,
}: ConsultationsContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // URL에서 초기 상태 복원
  const initialTab = (searchParams.get('tab') as 'all' | 'lead' | 'student') || 'all'
  const initialPage = Number(searchParams.get('page')) || 1
  const initialSearch = searchParams.get('search') || ''
  const initialType = searchParams.get('type') || 'all'
  const initialConductor = searchParams.get('conductor') || 'all'
  const initialFollowUp = searchParams.get('followUp') || 'all'
  const initialStartDate = searchParams.get('startDate')
  const initialEndDate = searchParams.get('endDate')

  // State
  const [consultations, setConsultations] = useState<Consultation[]>(initialData)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [activeTab, setActiveTab] = useState<'all' | 'lead' | 'student'>(initialTab)
  const [consultationType, setConsultationType] = useState(initialType)
  const [conductedBy, setConductedBy] = useState(initialConductor)
  const [followUpFilter, setFollowUpFilter] = useState(initialFollowUp)
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialStartDate ? new Date(initialStartDate) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    initialEndDate ? new Date(initialEndDate) : undefined
  )
  const hasUrlFilters =
    initialType !== 'all' ||
    initialConductor !== 'all' ||
    initialFollowUp !== 'all' ||
    initialStartDate !== null ||
    initialEndDate !== null
  const [filterOpen, setFilterOpen] = useState(hasUrlFilters)
  const [loading, setLoading] = useState(false)

  // 캘린더 토글
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>()

  // 후속 상담 배너
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // 선택 모드
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState<Stats>(initialStats ?? DEFAULT_STATS)
  const [conductorOptions, setConductorOptions] = useState<FilterOptions | null>(filterOptions)
  const [upcomingFollowUpsState, setUpcomingFollowUpsState] = useState<Consultation[]>(upcomingFollowUps)

  // 일괄 작업 상태
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [conductorDialogOpen, setConductorDialogOpen] = useState(false)
  const [newConductorId, setNewConductorId] = useState('')
  const [isUpdatingConductor, setIsUpdatingConductor] = useState(false)

  // Race condition guard
  const requestSeqRef = useRef(0)
  const isInitializedRef = useRef(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  useEffect(() => {
    let active = true

    async function loadPageMeta() {
      try {
        const metaResult = await getConsultationPageMeta(7)

        if (!active) return

        if (metaResult.success && metaResult.data) {
          setStats(metaResult.data.stats)
          setConductorOptions(metaResult.data.filterOptions)
          setUpcomingFollowUpsState(metaResult.data.upcomingFollowUps as Consultation[])
        }
      } catch (error) {
        if (!active) return
        console.error('[ConsultationsContent] Failed to load page meta:', error)
      }
    }

    void loadPageMeta()

    return () => {
      active = false
    }
  }, [])

  // URL query 업데이트
  const updateUrl = useCallback((params: Record<string, string | undefined>) => {
    const url = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(params)) {
      if (value && value !== 'all' && value !== '' && value !== '1') {
        url.set(key, value)
      } else {
        url.delete(key)
      }
    }
    if (url.get('page') === '1') url.delete('page')
    const queryString = url.toString()
    router.replace(queryString ? `?${queryString}` : '/consultations', { scroll: false })
  }, [router, searchParams])

  // 데이터 로드
  const loadConsultations = useCallback(async (page: number) => {
    const requestSeq = ++requestSeqRef.current
    setLoading(true)

    try {
      const result = await getConsultations({
        page,
        pageSize: PAGE_SIZE,
        isLead: activeTab === 'all' ? undefined : activeTab === 'lead',
        consultationType: consultationType !== 'all' ? consultationType : undefined,
        conductedBy: conductedBy !== 'all' ? conductedBy : undefined,
        followUpOnly: followUpFilter === 'required' ? true : undefined,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        searchTerm: searchTerm.trim() || undefined,
      })

      if (requestSeq !== requestSeqRef.current) return

      if (!result.success || !result.data) {
        throw new Error(result.error || '상담 목록 로드 실패')
      }

      setConsultations(result.data as Consultation[])
      setTotalCount(result.totalCount)
      setSelectedIds(new Set())
    } catch (error) {
      if (requestSeq !== requestSeqRef.current) return
      toast({
        title: '데이터 로드 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setLoading(false)
      }
    }
  }, [activeTab, consultationType, conductedBy, followUpFilter, startDate, endDate, searchTerm, toast])

  // 필터/탭 변경 시 재로드 (초기 마운트 제외)
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true
      return
    }
    setCurrentPage(1)
    loadConsultations(1)
    updateUrl({
      tab: activeTab,
      type: consultationType,
      conductor: conductedBy,
      followUp: followUpFilter,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      search: searchTerm || undefined,
      page: '1',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, consultationType, conductedBy, followUpFilter, startDate, endDate])

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    if (!isInitializedRef.current) return

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    searchDebounceRef.current = setTimeout(() => {
      setCurrentPage(1)
      loadConsultations(1)
      updateUrl({
        tab: activeTab,
        type: consultationType,
        conductor: conductedBy,
        followUp: followUpFilter,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
        search: searchTerm || undefined,
        page: '1',
      })
    }, 300)

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  // 페이지 변경
  function handlePageChange(page: number) {
    setCurrentPage(page)
    loadConsultations(page)
    updateUrl({
      tab: activeTab,
      type: consultationType,
      conductor: conductedBy,
      followUp: followUpFilter,
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      search: searchTerm || undefined,
      page: String(page),
    })
  }

  // 필터 초기화
  function clearFilters() {
    setConsultationType('all')
    setConductedBy('all')
    setFollowUpFilter('all')
    setStartDate(undefined)
    setEndDate(undefined)
    setSelectedCalendarDate(undefined)
  }

  // 캘린더 날짜 선택
  function handleCalendarDateSelect(date: Date | undefined) {
    if (date && selectedCalendarDate?.toDateString() === date.toDateString()) {
      setSelectedCalendarDate(undefined)
      setStartDate(undefined)
      setEndDate(undefined)
    } else {
      setSelectedCalendarDate(date)
      setStartDate(date)
      setEndDate(date)
    }
  }

  const hasActiveFilters =
    consultationType !== 'all' ||
    conductedBy !== 'all' ||
    followUpFilter !== 'all' ||
    startDate !== undefined ||
    endDate !== undefined

  // 선택 토글
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === consultations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(consultations.map((c) => c.id)))
    }
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  // CSV 내보내기
  function exportToCSV() {
    const selected = consultations.filter((c) => selectedIds.has(c.id))
    const headers = ['제목', '유형', '이름', '날짜', '진행자', '후속상담', '요약']
    const rows = selected.map((c) => [
      c.title,
      consultationTypeLabels[c.consultation_type] || c.consultation_type,
      c.is_lead ? (c.lead_name || '') : (c.students?.name || ''),
      c.consultation_date,
      c.users?.name || '',
      c.follow_up_required ? '필요' : '불필요',
      (c.summary || '').replace(/\n/g, ' '),
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `상담목록_${format(new Date(), 'yyyyMMdd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 일괄 삭제
  async function handleBulkDelete() {
    setIsBulkDeleting(true)
    try {
      const result = await bulkDeleteConsultations(Array.from(selectedIds))
      if (!result.success) throw new Error(result.error || '삭제 실패')
      toast({ title: `${selectedIds.size}건 삭제 완료` })
      exitSelectionMode()
      loadConsultations(1)
    } catch (error) {
      toast({ title: '삭제 실패', description: getErrorMessage(error), variant: 'destructive' })
    } finally {
      setIsBulkDeleting(false)
      setBulkDeleteDialogOpen(false)
    }
  }

  // 일괄 진행자 변경
  async function handleBulkUpdateConductor() {
    if (!newConductorId) return
    setIsUpdatingConductor(true)
    try {
      const result = await bulkUpdateConductor(Array.from(selectedIds), newConductorId)
      if (!result.success) throw new Error(result.error || '변경 실패')
      toast({ title: `${selectedIds.size}건 진행자 변경 완료` })
      exitSelectionMode()
      loadConsultations(1)
    } catch (error) {
      toast({ title: '변경 실패', description: getErrorMessage(error), variant: 'destructive' })
    } finally {
      setIsUpdatingConductor(false)
      setConductorDialogOpen(false)
      setNewConductorId('')
    }
  }

  return (
    <PageWrapper>
      <div className={PAGE_LAYOUT.SECTION_SPACING}>
        {/* Header */}
        <section className={PAGE_ANIMATIONS.header}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={TEXT_STYLES.PAGE_TITLE}>상담 관리</h1>
              <p className={TEXT_STYLES.PAGE_DESCRIPTION}>
                학부모 상담 일정 및 기록 관리
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={selectionMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (selectionMode) exitSelectionMode()
                  else setSelectionMode(true)
                }}
              >
                {selectionMode ? '선택 취소' : '선택'}
              </Button>
              <Button asChild className="gap-2">
                <Link href="/consultations/new">
                  <Plus className="h-4 w-4" />
                  새 상담 기록
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* 후속 상담 알림 배너 */}
        {upcomingFollowUpsState.length > 0 && !bannerDismissed && (
          <section>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-800">
              <AlertCircle className="h-4 w-4 text-orange-600 shrink-0" />
              <span className="text-sm text-orange-800 dark:text-orange-300 flex-1">
                <strong>{upcomingFollowUpsState.length}건</strong>의 후속 상담이 7일 내 예정되어 있습니다.
              </span>
              <Button
                size="sm"
                variant="link"
                className="text-orange-600 px-0 h-auto"
                onClick={() => setFollowUpFilter('required')}
              >
                보기
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0"
                onClick={() => setBannerDismissed(true)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </section>
        )}

        {/* Stats Cards */}
        <section
          className={cn(GRID_LAYOUTS.STATS, PAGE_ANIMATIONS.getSection(0).className)}
          style={PAGE_ANIMATIONS.getSection(0).style}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                전체 상담
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total}건
              </div>
              <p className="text-xs text-muted-foreground mt-1">총 상담 건수</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                신규 입회 상담
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">
                {stats.lead}건
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                진행 중인 입회 상담
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                입회 완료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.converted}건
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                학생 등록 완료
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Search & Filter & Tabs */}
        <section
          className={cn("space-y-4", PAGE_ANIMATIONS.getSection(1).className)}
          style={PAGE_ANIMATIONS.getSection(1).style}
        >
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="학생명, 제목, 내용으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={filterOpen ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setFilterOpen(!filterOpen)}
            >
              <Filter className="h-4 w-4" />
              필터
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-xs">
                  !
                </Badge>
              )}
            </Button>
            <Button
              variant={calendarOpen ? 'default' : 'outline'}
              size="icon"
              onClick={() => setCalendarOpen(!calendarOpen)}
              title="캘린더로 날짜 선택"
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* 미니 캘린더 */}
          {calendarOpen && (
              <Card>
              <CardContent className="pt-4 pb-4 flex justify-center">
                <ConsultationCalendar
                  mode="single"
                  selected={selectedCalendarDate}
                  onSelect={handleCalendarDateSelect}
                />
              </CardContent>
            </Card>
          )}

          {/* Filter Panel */}
          {filterOpen && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-wrap gap-4 items-end">
                  {/* 상담 방식 */}
                  <div className="flex flex-col gap-1.5 min-w-[150px]">
                    <label className="text-sm font-medium">상담 방식</label>
                    <Select value={consultationType} onValueChange={setConsultationType}>
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="in_person">대면 상담</SelectItem>
                        <SelectItem value="phone_call">전화 상담</SelectItem>
                        <SelectItem value="video_call">화상 상담</SelectItem>
                        <SelectItem value="parent_meeting">학부모 면담</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 진행자 */}
                  {conductorOptions?.conductors && conductorOptions.conductors.length > 0 && (
                    <div className="flex flex-col gap-1.5 min-w-[150px]">
                      <label className="text-sm font-medium">진행자</label>
                      <Select value={conductedBy} onValueChange={setConductedBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="전체" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          {conductorOptions.conductors.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* 후속 상담 */}
                  <div className="flex flex-col gap-1.5 min-w-[150px]">
                    <label className="text-sm font-medium">후속 상담</label>
                    <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="required">필요</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 시작일 */}
                  <div className="flex flex-col gap-1.5 min-w-[160px]">
                    <label className="text-sm font-medium">시작일</label>
                    <DatePicker
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="시작일"
                      dateFormat="yyyy-MM-dd"
                    />
                  </div>

                  {/* 종료일 */}
                  <div className="flex flex-col gap-1.5 min-w-[160px]">
                    <label className="text-sm font-medium">종료일</label>
                    <DatePicker
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="종료일"
                      dateFormat="yyyy-MM-dd"
                    />
                  </div>

                  {/* 필터 초기화 */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground"
                      onClick={clearFilters}
                    >
                      <X className="h-4 w-4" />
                      초기화
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as 'all' | 'lead' | 'student')
            }
          >
            <TabsList>
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="lead">신규 입회 상담</TabsTrigger>
              <TabsTrigger value="student">재원생 상담</TabsTrigger>
            </TabsList>
          </Tabs>
        </section>

        {/* 일괄 작업 바 */}
        {selectionMode && selectedIds.size > 0 && (
          <section className="sticky top-16 z-10">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background border shadow-sm">
              <span className="text-sm font-medium text-muted-foreground">
                {selectedIds.size}개 선택됨
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={exportToCSV}
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
                {conductorOptions?.conductors && conductorOptions.conductors.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setConductorDialogOpen(true)}
                  >
                    <UserCog className="h-4 w-4" />
                    진행자 변경
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-2"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  삭제
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* 선택 모드: 전체 선택 */}
        {selectionMode && consultations.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={selectedIds.size === consultations.length}
              onCheckedChange={toggleSelectAll}
            />
            전체 선택 ({consultations.length}건)
          </div>
        )}

        {/* Consultations List */}
        <section
          className={cn("space-y-3", PAGE_ANIMATIONS.getSection(2).className)}
          style={PAGE_ANIMATIONS.getSection(2).style}
        >
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && consultations.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-12 w-12" />}
              title={searchTerm || hasActiveFilters ? '검색 결과가 없습니다' : '상담 기록이 없습니다'}
              description={
                searchTerm || hasActiveFilters
                  ? '다른 검색어나 필터를 시도해보세요.'
                  : '새 상담 기록을 등록하여 시작하세요.'
              }
            />
          ) : !loading && (
            consultations.map((consultation, index) => {
              const consultDate = new Date(consultation.consultation_date)
              const nextDate = consultation.next_consultation_date
                ? new Date(consultation.next_consultation_date)
                : null
              const displayName = consultation.is_lead
                ? consultation.lead_name
                : consultation.students?.name

              // 카드 left border 색상
              const borderAccent = consultation.converted_to_student_id
                ? 'border-l-green-500'
                : consultation.is_lead
                ? 'border-l-blue-500'
                : 'border-l-gray-300 dark:border-l-gray-600'

              const isSelected = selectedIds.has(consultation.id)

              return (
                <div
                  key={consultation.id}
                  {...getListItemAnimation(index)}
                >
                  <Link
                    href={selectionMode ? '#' : `/consultations/${consultation.id}`}
                    onClick={selectionMode ? (e) => { e.preventDefault(); toggleSelect(consultation.id) } : undefined}
                  >
                    <Card className={cn(
                      CARD_STYLES.INTERACTIVE,
                      'border-l-4',
                      borderAccent,
                      isSelected && 'ring-2 ring-primary'
                    )}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          {/* 체크박스 (선택 모드) */}
                          {selectionMode && (
                            <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(consultation.id)}
                              />
                            </div>
                          )}

                          <div className="flex-1 space-y-1.5 min-w-0">
                            {/* 제목 + 배지 */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-base leading-tight">
                                {consultation.title}
                              </h3>
                              {consultation.is_lead ? (
                                <Badge variant="default" className="bg-info text-xs">
                                  신규
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  재원생
                                </Badge>
                              )}
                              {consultation.converted_to_student_id && (
                                <Badge variant="default" className="bg-green-600 text-xs">
                                  등록 완료
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {consultationTypeLabels[consultation.consultation_type] || consultation.consultation_type}
                              </Badge>
                              {consultation.follow_up_required && (
                                <Badge variant="secondary" className="text-xs text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/30">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  후속 상담 필요
                                </Badge>
                              )}
                            </div>

                            {/* 메타: 이름 · 날짜 · 시간 · 진행자 */}
                            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3.5" />
                                {displayName || '이름 정보 없음'}
                                {consultation.is_lead && consultation.lead_guardian_name && (
                                  <span className="text-xs">(보호자: {consultation.lead_guardian_name})</span>
                                )}
                              </span>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {consultDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                {' '}
                                {consultDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-muted-foreground/40">·</span>
                              <span>{consultation.users?.name || '진행자 미지정'}</span>
                              {nextDate && (
                                <>
                                  <span className="text-muted-foreground/40">·</span>
                                  <span className="text-info text-xs">
                                    다음: {nextDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* 요약 */}
                            {consultation.summary && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {consultation.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              )
            })
          )}
        </section>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <section className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              전체 {totalCount}건 중 {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, totalCount)}건
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(currentPage - 1)}
                    className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )
                  }
                  return null
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                    className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </section>
        )}
      </div>

      {/* 일괄 삭제 확인 다이얼로그 */}
      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title={`${selectedIds.size}건을 삭제하시겠습니까?`}
        description="선택한 상담 기록이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        variant="destructive"
        isLoading={isBulkDeleting}
        onConfirm={handleBulkDelete}
      />

      {/* 진행자 변경 다이얼로그 */}
      <Dialog open={conductorDialogOpen} onOpenChange={setConductorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>진행자 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              선택한 {selectedIds.size}건의 상담 진행자를 변경합니다.
            </p>
                <Select value={newConductorId} onValueChange={setNewConductorId}>
              <SelectTrigger>
                <SelectValue placeholder="진행자 선택" />
              </SelectTrigger>
              <SelectContent>
                {conductorOptions?.conductors.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setConductorDialogOpen(false); setNewConductorId('') }}
            >
              취소
            </Button>
            <Button
              onClick={handleBulkUpdateConductor}
              disabled={!newConductorId || isUpdatingConductor}
            >
              {isUpdatingConductor ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
