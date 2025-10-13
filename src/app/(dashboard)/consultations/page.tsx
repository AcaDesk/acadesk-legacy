'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { PageWrapper } from "@/components/layout/page-wrapper"
import { PAGE_LAYOUT, GRID_LAYOUTS, TEXT_STYLES, CARD_STYLES } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'

export default function ConsultationsPage() {
  // 피처 플래그 체크
  const featureStatus = FEATURES.consultationManagement;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="상담 관리" description="학부모 상담 일정을 체계적으로 관리하고, 상담 기록을 효율적으로 관리하는 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="상담 관리" reason="상담 관리 시스템 개선 작업이 진행 중입니다." />;
  }
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  const stats = {
    totalConsultations: 24,
    scheduledConsultations: 5,
    completedThisMonth: 12,
  }

  const consultations = [
    {
      id: '1',
      studentName: '김철수',
      guardianName: '김부모',
      date: '2025-10-05',
      time: '14:00',
      topic: '학습 진도 상담',
      status: 'scheduled',
      notes: '수학 성적 향상 방안 논의',
    },
    {
      id: '2',
      studentName: '이영희',
      guardianName: '이부모',
      date: '2025-10-03',
      time: '15:30',
      topic: '진로 상담',
      status: 'completed',
      notes: '대학 진학 관련 상담 완료',
    },
    {
      id: '3',
      studentName: '박민수',
      guardianName: '박부모',
      date: '2025-10-07',
      time: '16:00',
      topic: '출석 관련 상담',
      status: 'scheduled',
      notes: '최근 결석 사유 확인',
    },
  ]

  const filteredConsultations = consultations.filter(c => {
    const matchesSearch = c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.guardianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.topic.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTab = activeTab === 'all' ||
      (activeTab === 'scheduled' && c.status === 'scheduled') ||
      (activeTab === 'completed' && c.status === 'completed')

    return matchesSearch && matchesTab
  })

  return (
    <PageWrapper>
      <div className={PAGE_LAYOUT.SECTION_SPACING}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
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
                새 상담 예약
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className={GRID_LAYOUTS.STATS}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                전체 상담
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConsultations}건</div>
              <p className="text-xs text-muted-foreground mt-1">
                총 상담 건수
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                예정된 상담
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.scheduledConsultations}건</div>
              <p className="text-xs text-muted-foreground mt-1">
                진행 예정
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                이번 달 완료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedThisMonth}건</div>
              <p className="text-xs text-muted-foreground mt-1">
                10월 완료 상담
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Search & Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="학생명, 보호자명, 주제로 검색..."
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

          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="scheduled">예정</TabsTrigger>
              <TabsTrigger value="completed">완료</TabsTrigger>
            </TabsList>
          </Tabs>
        </motion.div>

        {/* Consultations List */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          {filteredConsultations.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>상담 기록이 없습니다.</p>
                  <p className="text-sm mt-2">새 상담을 예약하여 시작하세요.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredConsultations.map((consultation, index) => (
              <motion.div
                key={consultation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * index }}
              >
                <Card className={CARD_STYLES.INTERACTIVE}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{consultation.topic}</h3>
                          <Badge variant={consultation.status === 'completed' ? 'default' : 'secondary'}>
                            {consultation.status === 'completed' ? (
                              <><CheckCircle className="h-3 w-3 mr-1" /> 완료</>
                            ) : (
                              <><AlertCircle className="h-3 w-3 mr-1" /> 예정</>
                            )}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{consultation.studentName} ({consultation.guardianName})</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>{consultation.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                            <Clock className="h-4 w-4" />
                            <span>{consultation.time}</span>
                          </div>
                        </div>

                        {consultation.notes && (
                          <p className="text-sm text-muted-foreground">{consultation.notes}</p>
                        )}
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
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </PageWrapper>
  )
}
