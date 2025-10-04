'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Building2,
  User,
  Bell,
  Lock,
  Palette,
  Database,
  HelpCircle,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { PAGE_LAYOUT, GRID_LAYOUTS, TEXT_STYLES, CARD_STYLES } from '@/lib/constants'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  const settingsSections = [
    {
      title: '학원 정보',
      description: '학원 기본 정보 및 운영 시간 설정',
      icon: Building2,
      href: '/settings/academy',
      badge: null,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      title: '계정 설정',
      description: '사용자 프로필 및 비밀번호 변경',
      icon: User,
      href: '/settings/account',
      badge: null,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      title: '알림 설정',
      description: '푸시 알림 및 이메일 알림 관리',
      icon: Bell,
      href: '/settings/notifications',
      badge: null,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
    },
    {
      title: '보안 및 개인정보',
      description: '2단계 인증 및 개인정보 보호 설정',
      icon: Lock,
      href: '/settings/security',
      badge: '권장',
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
    },
    {
      title: '테마 설정',
      description: '다크모드 및 색상 테마 변경',
      icon: Palette,
      href: '/settings/theme',
      badge: null,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      title: '데이터 관리',
      description: '데이터 백업 및 내보내기',
      icon: Database,
      href: '/settings/data',
      badge: null,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-950/20',
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
          <div>
            <h1 className={TEXT_STYLES.PAGE_TITLE}>설정</h1>
            <p className={TEXT_STYLES.PAGE_DESCRIPTION}>
              학원 시스템 설정 및 개인화
            </p>
          </div>
        </motion.div>

        {/* System Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                시스템 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">버전</p>
                  <p className="font-medium">v1.0.0</p>
                </div>
                <div>
                  <p className="text-muted-foreground">학원명</p>
                  <p className="font-medium">Acadesk 학원</p>
                </div>
                <div>
                  <p className="text-muted-foreground">플랜</p>
                  <Badge variant="default">프로</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">마지막 백업</p>
                  <p className="font-medium">2025-10-02</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Settings Sections */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h2 className={TEXT_STYLES.SECTION_TITLE + ' mb-4'}>설정 카테고리</h2>
          <div className={GRID_LAYOUTS.DUAL}>
            {settingsSections.map((section, index) => {
              const Icon = section.icon
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * (index + 4) }}
                >
                  <Link href={section.href}>
                    <Card className={CARD_STYLES.INTERACTIVE}>
                      <CardContent className="py-6">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg ${section.bgColor} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`h-6 w-6 ${section.color}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{section.title}</h3>
                              {section.badge && (
                                <Badge variant="secondary" className="text-xs">
                                  {section.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {section.description}
                            </p>
                          </div>

                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Help & Support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <Separator className="my-6" />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                도움말 및 지원
              </CardTitle>
              <CardDescription>
                문제가 발생했거나 도움이 필요하신가요?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline">
                  사용자 가이드
                </Button>
                <Button variant="outline">
                  FAQ
                </Button>
                <Button variant="outline">
                  고객 지원
                </Button>
                <Button variant="outline">
                  피드백 보내기
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        >
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-600">위험 구역</CardTitle>
              <CardDescription>
                주의: 이 작업들은 되돌릴 수 없습니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start text-red-600 border-red-200 hover:bg-red-100">
                모든 데이터 초기화
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-600 border-red-200 hover:bg-red-100">
                계정 삭제
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageWrapper>
  )
}
