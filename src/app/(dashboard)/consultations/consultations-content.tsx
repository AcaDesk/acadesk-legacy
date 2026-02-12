'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import {
  MessageSquare,
  Plus,
  Search,
  Calendar,
  User,
  Clock,
  Filter,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
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
import { getConsultations } from '@/app/actions/consultations'
import { getErrorMessage } from '@/lib/error-handlers'
import { format } from 'date-fns'

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
}

const PAGE_SIZE = 20

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
  const [filterOpen, setFilterOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Race condition guard
  const requestSeqRef = useRef(0)
  const isInitializedRef = useRef(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

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
    // page=1이면 URL에서 제거
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

      // Race condition guard
      if (requestSeq !== requestSeqRef.current) return

      if (!result.success || !result.data) {
        throw new Error(result.error || '상담 목록 로드 실패')
      }

      setConsultations(result.data as Consultation[])
      setTotalCount(result.totalCount)
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
  }

  const hasActiveFilters =
    consultationType !== 'all' ||
    conductedBy !== 'all' ||
    followUpFilter !== 'all' ||
    startDate !== undefined ||
    endDate !== undefined

  // Stats
  const stats = initialStats ?? { total: 0, lead: 0, student: 0, converted: 0 }

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
            <Button asChild className="gap-2">
              <Link href="/consultations/new">
                <Plus className="h-4 w-4" />
                새 상담 기록
              </Link>
            </Button>
          </div>
        </section>

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
          <div className="flex gap-4 items-center">
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
          </div>

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
                  {filterOptions?.conductors && filterOptions.conductors.length > 0 && (
                    <div className="flex flex-col gap-1.5 min-w-[150px]">
                      <label className="text-sm font-medium">진행자</label>
                      <Select value={conductedBy} onValueChange={setConductedBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="전체" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          {filterOptions.conductors.map((c) => (
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
              const isUpcoming =
                consultation.follow_up_required &&
                consultation.next_consultation_date
              const nextDate = consultation.next_consultation_date
                ? new Date(consultation.next_consultation_date)
                : null
              const displayName = consultation.is_lead
                ? consultation.lead_name
                : consultation.students?.name

              return (
                <div
                  key={consultation.id}
                  {...getListItemAnimation(index)}
                >
                  <Card className={CARD_STYLES.INTERACTIVE}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="font-semibold text-lg">
                              {consultation.title}
                            </h3>
                            {consultation.is_lead ? (
                              <Badge variant="default" className="bg-info">
                                신규
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                재원생
                              </Badge>
                            )}
                            {consultation.converted_to_student_id && (
                              <Badge variant="default" className="bg-green-600">
                                등록 완료
                              </Badge>
                            )}
                            <Badge
                              variant={
                                consultationTypeLabels[
                                  consultation.consultation_type
                                ]
                                  ? 'outline'
                                  : 'secondary'
                              }
                            >
                              {consultationTypeLabels[
                                consultation.consultation_type
                              ] || consultation.consultation_type}
                            </Badge>
                            {isUpcoming && (
                              <Badge variant="secondary">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                후속 상담 필요
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4" />
                              <span>
                                {displayName || '이름 정보 없음'}
                                {consultation.is_lead && consultation.lead_guardian_name && (
                                  <span className="text-xs ml-1">
                                    (학부모: {consultation.lead_guardian_name})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {consultDate.toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {consultDate.toLocaleTimeString('ko-KR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {nextDate && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4 text-info" />
                                <span className="text-info">
                                  다음: {nextDate.toLocaleDateString('ko-KR')}
                                </span>
                              </div>
                            )}
                          </div>

                          {consultation.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {consultation.summary}
                            </p>
                          )}

                          {consultation.outcome && (
                            <div className="text-sm">
                              <span className="font-medium">결과: </span>
                              <span className="text-muted-foreground">
                                {consultation.outcome}
                              </span>
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            진행자: {consultation.users?.name || '정보 없음'}
                          </div>
                        </div>

                        <div className="ml-4">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/consultations/${consultation.id}`}>
                              상세보기
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
    </PageWrapper>
  )
}
