"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle, FileText, TrendingUp, Clock, CheckCircle } from "lucide-react"

interface TodaySession {
  id: string
  session_date: string
  scheduled_start_at: string
  scheduled_end_at: string
  status: string
  classes: {
    name: string
  } | null
}

interface TodayTasksProps {
  upcomingSessions: TodaySession[]
  unsentReports: number
  pendingTodos: number
}

function getSessionStatus(session: TodaySession) {
  const now = new Date()
  const startTime = new Date(session.scheduled_start_at)
  const endTime = new Date(session.scheduled_end_at)
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

  if (!hasAnyTasks) return null

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          오늘의 할 일
        </CardTitle>
        <CardDescription>지금 처리가 필요한 작업들입니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <div className="space-y-2">
            {upcomingSessions.map((session) => {
              const status = getSessionStatus(session)
              const StatusIcon = status.icon

              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-900"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">{session.classes?.name || '수업'}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatTime(session.scheduled_start_at)} - {formatTime(session.scheduled_end_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={status.variant}>{status.label}</Badge>
                    {session.status !== 'completed' && session.status !== 'in_progress' && (
                      <Link href={`/attendance/${session.id}`}>
                        <Button size="sm">시작</Button>
                      </Link>
                    )}
                    {session.status === 'in_progress' && (
                      <Link href={`/attendance/${session.id}`}>
                        <Button size="sm" variant="outline">계속</Button>
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Quick Action Alerts */}
        <div className="grid gap-2 md:grid-cols-2">
          {unsentReports > 0 && (
            <Link href="/reports/list">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-900 hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span className="text-sm">미전송 리포트</span>
                </div>
                <Badge variant="destructive">{unsentReports}건</Badge>
              </div>
            </Link>
          )}

          {pendingTodos > 0 && (
            <Link href="/todos">
              <div className="flex items-center justify-between p-3 rounded-lg border bg-white dark:bg-gray-900 hover:bg-muted transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">미완료 과제</span>
                </div>
                <Badge variant="secondary">{pendingTodos}건</Badge>
              </div>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
