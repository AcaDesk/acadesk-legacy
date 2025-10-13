"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  UserCheck,
  FileText,
  CheckCircle,
  TrendingUp,
  Calendar,
  MessageSquare,
  Book,
  AlertCircle,
  UserPlus,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface ActivityLog {
  id: string
  activity_type: string
  description: string
  created_at: string
  student_name?: string
  metadata?: any
}

interface RecentActivityFeedProps {
  activities: ActivityLog[]
  maxItems?: number
}

const activityConfig = {
  attendance_checked: {
    icon: UserCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    label: "출석"
  },
  exam_score_entered: {
    icon: FileText,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    label: "성적"
  },
  todo_completed: {
    icon: CheckCircle,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    label: "과제"
  },
  student_enrolled: {
    icon: UserPlus,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/20",
    label: "입학"
  },
  consultation_logged: {
    icon: MessageSquare,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    label: "상담"
  },
  book_borrowed: {
    icon: Book,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/20",
    label: "도서"
  },
  default: {
    icon: AlertCircle,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-950/20",
    label: "활동"
  }
}

function getRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "방금 전"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`

  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export function RecentActivityFeed({ activities, maxItems = 10 }: RecentActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">최근 활동</CardTitle>
            <CardDescription className="text-xs mt-1">
              실시간 학원 운영 현황을 확인하세요
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/activity">
              전체 보기
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {displayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              아직 활동이 없습니다
            </p>
            <p className="text-xs text-muted-foreground">
              학원 운영이 시작되면 활동 내역이 표시됩니다
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {displayActivities.map((activity, index) => {
                const config = activityConfig[activity.activity_type as keyof typeof activityConfig] || activityConfig.default
                const Icon = config.icon

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "flex gap-3 p-3 rounded-lg transition-all",
                      "hover:bg-accent border border-transparent hover:border-border",
                      "animate-in fade-in-50 slide-in-from-left-2 duration-300"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* 아이콘 */}
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      config.bgColor
                    )}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm leading-relaxed text-foreground">
                          {activity.description}
                        </p>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {getRelativeTime(activity.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
