'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  BookMarked,
  Library,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { PAGE_LAYOUT, GRID_LAYOUTS, TEXT_STYLES, CARD_STYLES } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'

export default function LibraryPage() {
  // 피처 플래그 체크
  if (!FEATURES.libraryManagement) {
    return <ComingSoon featureName="교재 관리" description="교재 및 도서 대여, 진도 관리를 체계적으로 지원하여 학습 자료 운영을 효율화하는 기능을 준비하고 있습니다." />;
  }
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const stats = {
    totalMaterials: 45,
    activeLendings: 12,
    availableBooks: 33,
  }

  const quickActions = [
    {
      title: '교재 대여 관리',
      description: '학생별 교재 대여 및 반납 관리',
      icon: BookMarked,
      href: '/library/lendings',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      title: '교재 목록',
      description: '보유 교재 및 도서 목록 관리',
      icon: Library,
      href: '/library/materials',
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      title: '진도 관리',
      description: '학생별 교재 진도 현황 확인',
      icon: TrendingUp,
      href: '/library/progress',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    },
  ]

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
              <h1 className={TEXT_STYLES.PAGE_TITLE}>교재 관리</h1>
              <p className={TEXT_STYLES.PAGE_DESCRIPTION}>
                교재 및 도서 대여, 진도 관리를 한 곳에서
              </p>
            </div>
            <Link href="/library/materials/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                새 교재 등록
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
                <BookOpen className="h-4 w-4" />
                총 교재 수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMaterials}권</div>
              <p className="text-xs text-muted-foreground mt-1">
                등록된 교재 및 도서
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <BookMarked className="h-4 w-4" />
                대여 중
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeLendings}권</div>
              <p className="text-xs text-muted-foreground mt-1">
                현재 대여 중인 교재
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Library className="h-4 w-4" />
                대여 가능
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.availableBooks}권</div>
              <p className="text-xs text-muted-foreground mt-1">
                대여 가능한 교재
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h2 className={TEXT_STYLES.SECTION_TITLE + ' mb-4'}>빠른 작업</h2>
          <div className={GRID_LAYOUTS.STATS}>
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * (index + 3) }}
                >
                  <Link href={action.href}>
                    <Card className={CARD_STYLES.INTERACTIVE}>
                      <CardHeader>
                        <div className={`w-12 h-12 rounded-lg ${action.bgColor} flex items-center justify-center mb-3`}>
                          <Icon className={`h-6 w-6 ${action.color}`} />
                        </div>
                        <CardTitle className="text-lg">{action.title}</CardTitle>
                        <CardDescription>{action.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <Button variant="ghost" size="sm" className="gap-2">
                            바로가기
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>최근 대여 활동</CardTitle>
              <CardDescription>최근 7일간 교재 대여 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>최근 대여 활동이 없습니다.</p>
                <p className="text-sm mt-2">
                  <Link href="/library/lendings" className="text-primary hover:underline">
                    대여 관리
                  </Link>
                  에서 새 대여를 시작하세요.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageWrapper>
  )
}
