'use client'

import { useState, useEffect } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { useToast } from '@/hooks/use-toast'
import { LoadingState, EmptyState } from '@/components/ui/loading-state'
import { PAGE_ANIMATIONS, getListItemAnimation } from '@/lib/animation-config'
import { cn } from '@/lib/utils'

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

const consultationTypeLabels: Record<string, string> = {
  parent_meeting: '학부모 상담',
  phone_call: '전화 상담',
  video_call: '화상 상담',
  in_person: '대면 상담',
}

export default function ConsultationsPage() {
  // All Hooks must be called before any early returns
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'lead' | 'student'>(
    'all'
  )
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // 피처 플래그 체크 (Hooks 이후에 체크)
  const featureStatus = FEATURES.consultationManagement

  // Load consultations
  useEffect(() => {
    async function loadConsultations() {
      try {
        setLoading(true)
        const { getConsultations } = await import('@/app/actions/consultations')
        const result = await getConsultations({ limit: 100 })

        if (result.success && result.data) {
          setConsultations(result.data)
        } else {
          console.error('Failed to load consultations:', result.error)
          toast({
            title: '상담 기록 로드 실패',
            description: result.error || '상담 기록을 불러올 수 없습니다',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Error loading consultations:', error)
        toast({
          title: '오류 발생',
          description: '상담 기록을 불러오는 중 오류가 발생했습니다',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    if (featureStatus === 'active') {
      loadConsultations()
    }
  }, [featureStatus, toast])

  if (featureStatus === 'inactive') {
    return (
      <ComingSoon
        featureName="상담 관리"
        description="학부모 상담 일정을 체계적으로 관리하고, 상담 기록을 효율적으로 관리하는 기능을 준비하고 있습니다."
      />
    )
  }

  if (featureStatus === 'maintenance') {
    return (
      <Maintenance
        featureName="상담 관리"
        reason="상담 관리 시스템 개선 작업이 진행 중입니다."
      />
    )
  }

  // Calculate stats from real data
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const stats = {
    totalConsultations: consultations.length,
    leadConsultations: consultations.filter((c) => c.is_lead && !c.converted_to_student_id).length,
    studentConsultations: consultations.filter((c) => !c.is_lead).length,
    convertedConsultations: consultations.filter((c) => c.is_lead && c.converted_to_student_id).length,
  }

  // Filter consultations
  const filteredConsultations = consultations.filter((c) => {
    const displayName = c.is_lead ? c.lead_name : c.students?.name
    const matchesSearch =
      displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lead_guardian_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'lead' && c.is_lead) ||
      (activeTab === 'student' && !c.is_lead)

    return matchesSearch && matchesTab
  })

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
            <Link href="/consultations/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                새 상담 기록
              </Button>
            </Link>
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
                {loading ? (
                  <LoadingState variant="spinner" />
                ) : (
                  `${stats.totalConsultations}건`
                )}
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
              <div className="text-2xl font-bold text-blue-600">
                {loading ? (
                  <LoadingState variant="spinner" />
                ) : (
                  `${stats.leadConsultations}건`
                )}
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
                {loading ? (
                  <LoadingState variant="spinner" />
                ) : (
                  `${stats.convertedConsultations}건`
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                학생 등록 완료
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Search & Tabs */}
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
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              필터
            </Button>
          </div>

          <Tabs
            defaultValue="all"
            onValueChange={(value) =>
              setActiveTab(value as 'all' | 'lead' | 'student')
            }
          >
            <TabsList>
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="lead">✨ 입회 상담</TabsTrigger>
              <TabsTrigger value="student">👤 재원생 상담</TabsTrigger>
            </TabsList>
          </Tabs>
        </section>

        {/* Consultations List */}
        <section
          className={cn("space-y-3", PAGE_ANIMATIONS.getSection(2).className)}
          style={PAGE_ANIMATIONS.getSection(2).style}
        >
          {loading ? (
            <LoadingState
              variant="card"
              message="상담 기록을 불러오는 중..."
            />
          ) : filteredConsultations.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-12 w-12" />}
              title={searchTerm ? '검색 결과가 없습니다' : '상담 기록이 없습니다'}
              description={
                searchTerm
                  ? '다른 검색어를 시도해보세요.'
                  : '새 상담 기록을 등록하여 시작하세요.'
              }
            />
          ) : (
            filteredConsultations.map((consultation, index) => {
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
                              <Badge variant="default" className="bg-blue-600">
                                ✨ 신규
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                👤 재원생
                              </Badge>
                            )}
                            {consultation.converted_to_student_id && (
                              <Badge variant="default" className="bg-green-600">
                                ✅ 등록 완료
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
                                <Calendar className="h-4 w-4 text-blue-500" />
                                <span className="text-blue-600">
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
                          <Link href={`/consultations/${consultation.id}`}>
                            <Button variant="outline" size="sm">
                              상세보기
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })
          )}
        </section>
      </div>
    </PageWrapper>
  )
}
