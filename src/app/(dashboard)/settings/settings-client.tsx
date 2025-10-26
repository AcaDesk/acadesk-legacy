'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
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
  Shapes,
  MessageSquare,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import { PAGE_LAYOUT, GRID_LAYOUTS, TEXT_STYLES, CARD_STYLES } from '@/lib/constants'
import { Separator } from '@ui/separator'

interface SettingsClientProps {
  systemInfo: {
    version: string
    academyName: string
    plan: string
    lastBackup: string
  }
}

export function SettingsClient({ systemInfo }: SettingsClientProps) {
  const settingsSections = [
    {
      title: '학원 정보',
      description: '학원명, 주소, 연락처 및 운영 시간 설정',
      icon: Building2,
      href: '/settings/academy',
      badge: null,
      disabled: false,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      title: '과목 관리',
      description: '학원에서 가르치는 과목 관리',
      icon: Shapes,
      href: '/settings/subjects',
      badge: null,
      disabled: false,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
    },
    {
      title: '알림 서비스 연동',
      description: 'SMS, 이메일 등 알림 서비스 설정',
      icon: MessageSquare,
      href: '/settings/messaging-integration',
      badge: null,
      disabled: false,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    },
    {
      title: '메시지 템플릿',
      description: '자주 사용하는 메시지 템플릿 관리',
      icon: FileText,
      href: '/settings/message-templates',
      badge: null,
      disabled: false,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    },
    {
      title: '계정 설정',
      description: '사용자 프로필 및 비밀번호 변경',
      icon: User,
      href: '/settings/account',
      badge: '준비 중',
      disabled: true,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-950/20',
    },
    {
      title: '테마 설정',
      description: '다크모드 및 색상 테마 변경',
      icon: Palette,
      href: '/settings/theme',
      badge: '준비 중',
      disabled: true,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    },
    {
      title: '보안 및 개인정보',
      description: '2단계 인증 및 개인정보 보호 설정',
      icon: Lock,
      href: '/settings/security',
      badge: '준비 중',
      disabled: true,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
    },
    {
      title: '데이터 관리',
      description: '데이터 백업 및 내보내기',
      icon: Database,
      href: '/settings/data',
      badge: '준비 중',
      disabled: true,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50 dark:bg-slate-950/20',
    },
  ]

  // Plan label mapping
  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'free':
        return '무료'
      case 'basic':
        return '베이직'
      case 'premium':
        return '프리미엄'
      case 'enterprise':
        return '엔터프라이즈'
      default:
        return '무료'
    }
  }

  return (
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
                <p className="font-medium">{systemInfo.version}</p>
              </div>
              <div>
                <p className="text-muted-foreground">학원명</p>
                <p className="font-medium">{systemInfo.academyName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">플랜</p>
                <Badge variant="default">{getPlanLabel(systemInfo.plan)}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">마지막 백업</p>
                <p className="font-medium">{systemInfo.lastBackup}</p>
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
            const cardContent = (
              <Card className={section.disabled ? 'opacity-60 cursor-not-allowed' : CARD_STYLES.INTERACTIVE}>
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
            )

            return (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 * (index + 4) }}
              >
                {section.disabled ? (
                  <div>{cardContent}</div>
                ) : (
                  <Link href={section.href} prefetch={false}>
                    {cardContent}
                  </Link>
                )}
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
              <Link href="/help/guide">
                <Button variant="outline">
                  사용자 가이드
                </Button>
              </Link>
              <Link href="/help/faq">
                <Button variant="outline">
                  FAQ
                </Button>
              </Link>
              <Link href="/help/inquiries">
                <Button variant="outline">
                  고객 지원
                </Button>
              </Link>
              <Link href="/help/feedback">
                <Button variant="outline">
                  피드백 보내기
                </Button>
              </Link>
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
  )
}
