"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Users, GraduationCap, TrendingUp, Calendar, ArrowUpRight, FileText } from "lucide-react"
import { StatsCard } from "@/components/features/dashboard/stats-card"
import { TodayTasks } from "@/components/features/dashboard/today-tasks"
import { TodayCommunications } from "@/components/features/dashboard/today-communications"
import { StudentAlerts } from "@/components/features/dashboard/student-alerts"
import { FinancialSnapshot } from "@/components/features/dashboard/financial-snapshot"
import { ClassStatus } from "@/components/features/dashboard/class-status"
import { DashboardEditMode } from "@/components/features/dashboard/dashboard-edit-mode"
import { DEFAULT_WIDGETS, DashboardWidget } from "@/types/dashboard"

interface DashboardData {
  stats: {
    totalStudents: number
    activeClasses: number
    todayAttendance: number
    pendingTodos: number
    totalReports: number
    unsentReports: number
  }
  recentStudents: any[]
  todaySessions: any[]
  birthdayStudents: any[]
  scheduledConsultations: any[]
  studentAlerts: {
    longAbsence: any[]
    pendingAssignments: any[]
  }
  financialData?: {
    currentMonthRevenue: number
    previousMonthRevenue: number
    unpaidTotal: number
    unpaidCount: number
  }
  classStatus?: any[]
  parentsToContact?: any[]
}

export function DashboardClient({ data }: { data: DashboardData }) {
  const { stats, recentStudents, todaySessions, birthdayStudents, scheduledConsultations, studentAlerts, financialData, classStatus, parentsToContact } = data
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS)
  const [isLoading, setIsLoading] = useState(true)

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/dashboard/preferences')
        if (response.ok) {
          const { preferences } = await response.json()
          if (preferences?.widgets) {
            setWidgets(preferences.widgets)
          }
        }
      } catch (error) {
        console.error('Failed to load preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [])

  const upcomingSessions = todaySessions.filter((s: any) => {
    if (s.status === 'completed') return false
    const now = new Date()
    const startTime = new Date(s.scheduled_start_at)
    const minutesUntilStart = Math.floor((startTime.getTime() - now.getTime()) / 60000)
    return minutesUntilStart <= 30
  })

  const handleSaveWidgets = async (updatedWidgets: DashboardWidget[]) => {
    setWidgets(updatedWidgets)

    try {
      const response = await fetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: {
            widgets: updatedWidgets,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
      // TODO: Show error toast to user
    }
  }

  const isWidgetVisible = (id: string) => {
    const widget = widgets.find(w => w.id === id)
    return widget?.visible ?? true
  }

  const leftColumnWidgets = widgets.filter(w => w.column === 'left' && w.visible).sort((a, b) => a.order - b.order)
  const rightColumnWidgets = widgets.filter(w => w.column === 'right' && w.visible).sort((a, b) => a.order - b.order)

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case 'today-tasks':
        return (
          <TodayTasks
            key={widgetId}
            upcomingSessions={upcomingSessions}
            unsentReports={stats.unsentReports}
            pendingTodos={stats.pendingTodos}
          />
        )
      case 'today-communications':
        return (
          <TodayCommunications
            key={widgetId}
            birthdayStudents={birthdayStudents}
            scheduledConsultations={scheduledConsultations}
            parentsToContact={parentsToContact}
          />
        )
      case 'recent-students':
        return (
          <Card key={widgetId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>최근 등록 학생</CardTitle>
                  <CardDescription>최근 5명의 학생</CardDescription>
                </div>
                <Link href="/students">
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                    전체 보기
                  </Badge>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>등록된 학생이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentStudents.map((student: any) => (
                    <Link
                      key={student.id}
                      href={`/students/${student.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {student.users?.name || '이름 없음'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {student.student_code}
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      case 'financial-snapshot':
        return financialData ? <FinancialSnapshot key={widgetId} data={financialData} /> : null
      case 'student-alerts':
        return (
          <StudentAlerts
            key={widgetId}
            longAbsence={studentAlerts?.longAbsence || []}
            pendingAssignments={studentAlerts?.pendingAssignments || []}
          />
        )
      case 'class-status':
        return classStatus && classStatus.length > 0 ? <ClassStatus key={widgetId} classes={classStatus} /> : null
      case 'stats-grid':
        return (
          <div key={widgetId} className="grid gap-4 sm:grid-cols-2">
            <StatsCard
              title="전체 학생"
              value={`${stats.totalStudents}명`}
              icon={Users}
              description="등록된 전체 학생 수"
              index={0}
              href="/students"
            />
            <StatsCard
              title="활성 수업"
              value={`${stats.activeClasses}개`}
              icon={GraduationCap}
              description="운영 중인 수업"
              index={1}
              href="/classes"
            />
            <StatsCard
              title="오늘 출석"
              value={`${stats.todayAttendance}명`}
              icon={Calendar}
              description="오늘 등원한 학생"
              index={2}
              variant="primary"
              href="/attendance"
            />
            <StatsCard
              title="진행 중 TODO"
              value={`${stats.pendingTodos}개`}
              icon={TrendingUp}
              description="완료되지 않은 과제"
              index={3}
              variant="warning"
              href="/todos"
            />
            <StatsCard
              title="생성된 리포트"
              value={`${stats.totalReports}개`}
              icon={FileText}
              description="총 리포트 수"
              index={4}
              href="/reports"
            />
            <StatsCard
              title="미전송 리포트"
              value={`${stats.unsentReports}개`}
              icon={FileText}
              description="전송 대기 중"
              index={5}
              variant={stats.unsentReports > 0 ? "danger" : "default"}
              href="/reports/list"
            />
          </div>
        )
      case 'quick-actions':
        return (
          <Card key={widgetId}>
            <CardHeader>
              <CardTitle>빠른 실행</CardTitle>
              <CardDescription>자주 사용하는 기능에 빠르게 접근하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/students">
                  <div className="p-4 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">학생 관리</div>
                        <div className="text-xs text-muted-foreground">학생 정보 조회</div>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/attendance">
                  <div className="p-4 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="font-medium">출석 관리</div>
                        <div className="text-xs text-muted-foreground">출석 체크</div>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/grades">
                  <div className="p-4 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium">성적 관리</div>
                        <div className="text-xs text-muted-foreground">성적 입력</div>
                      </div>
                    </div>
                  </div>
                </Link>
                <Link href="/reports">
                  <div className="p-4 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <div className="font-medium">리포트 생성</div>
                        <div className="text-xs text-muted-foreground">월간 리포트</div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">대시보드</h1>
          <p className="text-muted-foreground">학원 운영 현황을 한눈에 확인하세요</p>
        </div>
        <DashboardEditMode widgets={widgets} onSave={handleSaveWidgets} />
      </div>

      <div
        className="grid gap-6 lg:grid-cols-2"
        style={{
          opacity: isLoading ? 0 : 1,
          transition: 'opacity 0.2s ease-in-out'
        }}
      >
        <div className="space-y-6">
          {leftColumnWidgets.map(widget => renderWidget(widget.id))}
        </div>
        <div className="space-y-6">
          {rightColumnWidgets.map(widget => renderWidget(widget.id))}
        </div>
      </div>
    </div>
  )
}
