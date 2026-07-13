"use client"

import { memo, useMemo } from "react"
import { Card } from "@ui/card"
import { AlertCircle, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"

interface WelcomeBannerProps {
  userName?: string
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

  return (
    <Card className="relative overflow-hidden border-none shadow-lg bg-primary">
      {/* 미묘한 장식 패턴 */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white blur-3xl" />
        <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-white blur-3xl" />
      </div>

      {/* 컨텐츠 */}
      <div className="relative p-6 md:p-8">
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
      </div>
    </Card>
  )
})
