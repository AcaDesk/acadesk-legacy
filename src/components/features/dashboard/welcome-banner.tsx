"use client"

import { memo, useMemo } from "react"
import { Card } from "@ui/card"
import { Badge } from "@ui/badge"
import { Users, Calendar, Trophy, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface WelcomeBannerProps {
  userName?: string
  totalStudents: number
  attendanceRate: number
  averageScore: number
  // 선택적 알림 정보
  urgentTasks?: {
    type: 'overdue_payment' | 'scheduled_consultation' | 'low_attendance' | 'pending_reports'
    count?: number
    message: string
    link?: string
  }[]
}

// 시간대별 인사말 생성
function getGreetingByTime(): { greeting: string; icon: typeof Clock } {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return {
      greeting: "좋은 아침입니다! 오늘 하루를 시작해볼까요?",
      icon: Clock
    }
  } else if (hour >= 12 && hour < 18) {
    return {
      greeting: "활기찬 오후입니다. 주요 현황을 확인해보세요.",
      icon: Clock
    }
  } else {
    return {
      greeting: "오늘 하루도 수고 많으셨습니다.",
      icon: CheckCircle
    }
  }
}

export const WelcomeBanner = memo(function WelcomeBanner({
  userName = "원장님",
  totalStudents,
  attendanceRate,
  averageScore,
  urgentTasks = []
}: WelcomeBannerProps) {
  // Memoize formatted date to prevent recalculation on every render
  const formattedDate = useMemo(() => {
    const currentDate = new Date()
    return currentDate.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }, [])

  // Memoize greeting based on time
  const { greeting, icon: GreetingIcon } = useMemo(() => getGreetingByTime(), [])

  // 가장 우선순위 높은 알림 선택
  const primaryAlert = urgentTasks[0]

  // Memoize stats array to prevent recalculation
  const stats = useMemo(() => [
    {
      icon: Users,
      label: "총 학생 수",
      value: `${totalStudents}명`,
      href: "/students",
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      icon: Calendar,
      label: "오늘 출석률",
      value: `${attendanceRate}%`,
      href: "/attendance",
      color: "text-green-600 dark:text-green-400",
      status: attendanceRate >= 90 ? 'good' : attendanceRate >= 70 ? 'normal' : 'warning'
    },
    {
      icon: Trophy,
      label: "평균 성적",
      value: `${averageScore}점`,
      href: "/grades",
      color: "text-yellow-600 dark:text-yellow-400",
      status: averageScore >= 85 ? 'good' : averageScore >= 70 ? 'normal' : 'warning'
    }
  ], [totalStudents, attendanceRate, averageScore])

  return (
    <Card className="relative overflow-hidden border-none shadow-lg bg-primary">
      {/* 미묘한 장식 패턴 */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white blur-3xl" />
        <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-white blur-3xl" />
      </div>

      {/* 컨텐츠 */}
      <div className="relative p-8 md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* 좌측: 환영 메시지 */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/25 px-3 py-1 text-xs font-medium text-white backdrop-blur-md shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
              </span>
              {formattedDate}
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              안녕하세요, {userName}!
            </h2>

            {/* 상황별 동적 메시지 */}
            {primaryAlert ? (
              <div className="flex items-start gap-2 rounded-lg bg-white/25 backdrop-blur-md px-4 py-3 border border-white/30 shadow-lg">
                <AlertCircle className="h-5 w-5 text-white shrink-0 mt-0.5 drop-shadow" />
                <div>
                  <p className="text-sm font-semibold text-white drop-shadow">
                    {primaryAlert.message}
                  </p>
                  {primaryAlert.link && (
                    <Link
                      href={primaryAlert.link}
                      className="text-xs text-white/90 underline hover:text-white mt-1 inline-block drop-shadow"
                    >
                      자세히 보기 →
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-lg text-white/95 flex items-center gap-2 drop-shadow">
                <GreetingIcon className="h-5 w-5" />
                {greeting}
              </p>
            )}
          </div>

          {/* 우측: 클릭 가능한 주요 통계 */}
          <div className="flex flex-wrap gap-4 md:gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon
              const isClickable = !!stat.href

              const content = (
                <>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/30 backdrop-blur-sm">
                    <Icon className="h-6 w-6 text-white drop-shadow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/90 drop-shadow">{stat.label}</p>
                    <p className="text-xl font-bold text-white drop-shadow-lg">{stat.value}</p>
                  </div>
                  {stat.status && (
                    <div className="shrink-0">
                      {stat.status === 'good' && (
                        <Badge variant="secondary" className="h-6 px-2 text-xs bg-green-500/30 text-white border-green-400/40 backdrop-blur-sm drop-shadow">
                          양호
                        </Badge>
                      )}
                      {stat.status === 'warning' && (
                        <Badge variant="secondary" className="h-6 px-2 text-xs bg-yellow-500/30 text-white border-yellow-400/40 backdrop-blur-sm drop-shadow">
                          주의
                        </Badge>
                      )}
                    </div>
                  )}
                </>
              )

              if (isClickable) {
                return (
                  <Link
                    key={index}
                    href={stat.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg bg-white/20 backdrop-blur-md px-4 py-3",
                      "border border-white/30 shadow-lg",
                      "transition-all duration-300",
                      "hover:bg-white/30 hover:scale-105 hover:shadow-xl",
                      "cursor-pointer group",
                      "animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
                    )}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {content}
                    <div className="absolute inset-0 rounded-lg bg-white/0 group-hover:bg-white/5 transition-colors" />
                  </Link>
                )
              }

              return (
                <div
                  key={index}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg bg-white/20 backdrop-blur-md px-4 py-3",
                    "border border-white/30 shadow-lg",
                    "animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {content}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
})
