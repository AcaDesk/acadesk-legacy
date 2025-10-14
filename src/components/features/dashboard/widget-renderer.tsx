"use client"

import { TodayTasks } from "./today-tasks"
import { TodayCommunications } from "./today-communications"
import { RecentStudentsCard } from "./recent-students-card"
import { FinancialSnapshot } from "./financial-snapshot"
import { StudentAlerts } from "./student-alerts"
import { ClassStatus } from "./class-status"
import { AttendanceSummary } from "./attendance-summary"
import { WeeklyPerformance } from "./weekly-performance"
import { CalendarWidget } from "./calendar-widget"
import { StatsCard } from "./stats-card"
import { Users, GraduationCap, TrendingUp, Calendar, FileText } from "lucide-react"
import { DashboardWidget } from "@/types/dashboard"
import { DashboardData, TodaySession } from "@/hooks/use-dashboard-data"

interface WidgetRendererProps {
  widgetId: string
  widgets: DashboardWidget[]
  data: DashboardData
  upcomingSessions: TodaySession[]
}

export function WidgetRenderer({
  widgetId,
  widgets,
  data,
  upcomingSessions
}: WidgetRendererProps) {
  const widget = widgets.find(w => w.id === widgetId)
  if (!widget || !widget.visible) return null

  const { stats, birthdayStudents, scheduledConsultations, parentsToContact, studentAlerts, recentStudents, financialData, classStatus, calendarEvents } = data

  switch (widgetId) {
    case 'today-tasks':
      return (
        <TodayTasks
          upcomingSessions={upcomingSessions}
          unsentReports={stats.unsentReports}
          pendingTodos={stats.pendingTodos}
        />
      )

    case 'today-communications':
      return (
        <TodayCommunications
          birthdayStudents={birthdayStudents}
          scheduledConsultations={scheduledConsultations}
          parentsToContact={parentsToContact}
        />
      )

    case 'recent-students':
      return <RecentStudentsCard students={recentStudents} />

    case 'financial-snapshot':
      return financialData ? <FinancialSnapshot data={financialData} /> : null

    case 'student-alerts':
      return (
        <StudentAlerts
          longAbsence={studentAlerts?.longAbsence || []}
          pendingAssignments={studentAlerts?.pendingAssignments || []}
        />
      )

    case 'class-status':
      return classStatus && classStatus.length > 0 ? <ClassStatus classes={classStatus} /> : null

    case 'stats-grid':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatsCard
            title="전체 학생"
            value={`${stats.totalStudents}명`}
            icon={Users}
            description="등록된 전체 학생 수"
            index={0}
            href="/students"
            variant="default"
          />
          <StatsCard
            title="활성 수업"
            value={`${stats.activeClasses}개`}
            icon={GraduationCap}
            description="진행 중인 수업"
            index={1}
            href="/classes"
            variant="primary"
          />
          <StatsCard
            title="오늘 출석률"
            value={`${Math.round((stats.todayAttendance / Math.max(stats.totalStudents, 1)) * 100)}%`}
            icon={TrendingUp}
            description={`${stats.todayAttendance}명 출석`}
            index={2}
            href="/attendance"
            variant="success"
          />
          <StatsCard
            title="미완료 할일"
            value={`${stats.pendingTodos}개`}
            icon={Calendar}
            description="학생 할일 관리"
            index={3}
            href="/todos"
            variant="warning"
          />
          <StatsCard
            title="미발송 리포트"
            value={`${stats.unsentReports}개`}
            icon={FileText}
            description="발송 대기 중"
            index={4}
            href="/reports"
            variant="danger"
          />
        </div>
      )

    case 'attendance-summary':
      return (
        <AttendanceSummary
          sessions={upcomingSessions}
          todayAttendance={stats.todayAttendance}
          totalStudents={stats.totalStudents}
        />
      )

    case 'weekly-performance':
      return <WeeklyPerformance />

    case 'calendar':
      return <CalendarWidget events={calendarEvents || []} />

    default:
      return null
  }
}