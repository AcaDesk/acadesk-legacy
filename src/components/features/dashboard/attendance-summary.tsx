import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserX, Clock } from "lucide-react"
import Link from "next/link"
import type { TodaySession } from "@/hooks/use-dashboard-data"

interface AttendanceSummaryProps {
  sessions: TodaySession[]
  todayAttendance: number
  totalStudents: number
}

export function AttendanceSummary({
  sessions = [],
  todayAttendance,
  totalStudents
}: AttendanceSummaryProps) {
  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes() // 분 단위로 변환

  // 현재 진행 중인 세션 찾기
  const currentSession = sessions.find(session => {
    const startTime = new Date(session.scheduled_start)
    const endTime = new Date(session.scheduled_end)
    const sessionStart = startTime.getHours() * 60 + startTime.getMinutes()
    const sessionEnd = endTime.getHours() * 60 + endTime.getMinutes()

    return currentTime >= sessionStart && currentTime <= sessionEnd
  })

  // 출석률 계산
  const attendanceRate = totalStudents > 0 ? (todayAttendance / totalStudents) * 100 : 0

  // 세션별 출석 통계
  const sessionStats = sessions.map(session => {
    const startTime = new Date(session.scheduled_start)
    const timeStr = startTime.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })

    return {
      ...session,
      timeStr,
      attendanceRate: (session.total_students || 0) > 0
        ? ((session.attendance_count || 0) / (session.total_students || 0)) * 100
        : 0
    }
  })

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>오늘의 출석 현황</CardTitle>
            <CardDescription>실시간 출석 통계 및 수업별 현황</CardDescription>
          </div>
          <Link href="/attendance">
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              출석 관리
            </Badge>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 전체 출석률 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">전체 출석률</span>
            <span className="text-muted-foreground">
              {todayAttendance} / {totalStudents}명
            </span>
          </div>
          <Progress value={attendanceRate} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{attendanceRate.toFixed(1)}%</span>
            <span>목표: 95%</span>
          </div>
        </div>

        {/* 현재 진행 중인 세션 */}
        {currentSession && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium">현재 진행 중</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{currentSession.class_name}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(currentSession.scheduled_start).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {new Date(currentSession.scheduled_end).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <Badge variant="secondary">
                <UserCheck className="h-3 w-3 mr-1" />
                {currentSession.attendance_count || 0} / {currentSession.total_students || 0}
              </Badge>
            </div>
          </div>
        )}

        {/* 수업별 출석 현황 */}
        <div className="space-y-2">
          <div className="text-sm font-medium mb-2">수업별 출석</div>
          {sessionStats.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              오늘 예정된 수업이 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {sessionStats.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {session.class_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {session.timeStr}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.status === 'completed' ? (
                      <Badge variant="default">
                        <UserCheck className="h-3 w-3 mr-1" />
                        {session.attendance_count || 0}명
                      </Badge>
                    ) : session.status === 'in_progress' ? (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        진행 중
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        예정
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 빠른 통계 */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <UserCheck className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-xs text-muted-foreground">출석</div>
            <div className="text-sm font-medium">{todayAttendance}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="text-xs text-muted-foreground">지각</div>
            <div className="text-sm font-medium">0</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <UserX className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-xs text-muted-foreground">결석</div>
            <div className="text-sm font-medium">{Math.max(0, totalStudents - todayAttendance)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}