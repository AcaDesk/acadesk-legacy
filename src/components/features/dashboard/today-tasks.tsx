"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Badge } from "@ui/badge"
// import { Button } from "@ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { AlertCircle, FileText, TrendingUp, Clock, CheckCircle, ChevronRight, ListTodo } from "lucide-react"
import type { TodaySession } from "@/hooks/use-dashboard-data"

interface TodayTasksProps {
  upcomingSessions: TodaySession[]
  unsentReports: number
  pendingTodos: number
}

function getSessionStatus(session: TodaySession) {
  const now = new Date()
  const startTime = new Date(session.scheduled_start)
  const endTime = new Date(session.scheduled_end)
  const minutesUntilStart = Math.floor((startTime.getTime() - now.getTime()) / 60000)

  if (session.status === 'completed') return { label: '완료', variant: 'outline' as const, icon: CheckCircle }
  if (session.status === 'in_progress') return { label: '진행 중', variant: 'default' as const, icon: Clock }
  if (now > endTime) return { label: '종료 예정', variant: 'destructive' as const, icon: AlertCircle }
  if (minutesUntilStart <= 10 && minutesUntilStart > 0) return { label: `${minutesUntilStart}분 후`, variant: 'secondary' as const, icon: Clock }
  if (minutesUntilStart <= 0) return { label: '시작 가능', variant: 'default' as const, icon: AlertCircle }

  return { label: '대기 중', variant: 'outline' as const, icon: Clock }
}

function formatTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export function TodayTasks({ upcomingSessions, unsentReports, pendingTodos }: TodayTasksProps) {
  const hasAnyTasks = upcomingSessions.length > 0 || unsentReports > 0 || pendingTodos > 0
  const totalTasks = upcomingSessions.length + (unsentReports > 0 ? 1 : 0) + (pendingTodos > 0 ? 1 : 0)

  if (!hasAnyTasks) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <ListTodo className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">오늘의 할 일</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              모든 작업을 완료했습니다!
            </p>
            <p className="text-xs text-muted-foreground">
              오늘 처리할 작업이 없습니다
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <ListTodo className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">오늘의 할 일</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {totalTasks}개
          </Badge>
        </div>
        <CardDescription className="text-xs">지금 처리가 필요한 작업들입니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <div className="space-y-2">
            {upcomingSessions.map((session, index) => {
              const status = getSessionStatus(session)
              const StatusIcon = status.icon

              return (
                <Link
                  key={session.id}
                  href={`/attendance/${session.id}`}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    "hover:bg-accent hover:border-primary/30 hover:shadow-sm",
                    "group cursor-pointer",
                    "animate-in fade-in-50 slide-in-from-left-2 duration-300"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "p-2 rounded-md shrink-0 transition-colors",
                      status.variant === 'destructive' && "bg-destructive/10",
                      status.variant === 'default' && "bg-primary/10",
                      status.variant === 'secondary' && "bg-secondary",
                      status.variant === 'outline' && "bg-muted"
                    )}>
                      <StatusIcon className={cn(
                        "h-4 w-4",
                        status.variant === 'destructive' && "text-destructive",
                        status.variant === 'default' && "text-primary",
                        status.variant === 'secondary' && "text-foreground",
                        status.variant === 'outline' && "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {session.class_name || '수업'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(session.scheduled_start)} - {formatTime(session.scheduled_end)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-all group-hover:text-foreground group-hover:translate-x-0.5" />
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Quick Action Alerts */}
        {(unsentReports > 0 || pendingTodos > 0) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {unsentReports > 0 && (
              <Link
                href="/reports/list"
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  "hover:bg-accent hover:border-primary/30 hover:shadow-sm",
                  "group cursor-pointer"
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="p-1.5 rounded-md bg-orange-500/10 shrink-0">
                    <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm font-medium truncate">미전송 리포트</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="destructive" className="text-xs">
                    {unsentReports}건
                  </Badge>
                  <ChevronRight className="h-3 w-3 text-muted-foreground transition-all group-hover:text-foreground group-hover:translate-x-0.5" />
                </div>
              </Link>
            )}

            {pendingTodos > 0 && (
              <Link
                href="/todos"
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  "hover:bg-accent hover:border-primary/30 hover:shadow-sm",
                  "group cursor-pointer"
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="p-1.5 rounded-md bg-yellow-500/10 shrink-0">
                    <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <span className="text-sm font-medium truncate">미완료 과제</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {pendingTodos}건
                  </Badge>
                  <ChevronRight className="h-3 w-3 text-muted-foreground transition-all group-hover:text-foreground group-hover:translate-x-0.5" />
                </div>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
