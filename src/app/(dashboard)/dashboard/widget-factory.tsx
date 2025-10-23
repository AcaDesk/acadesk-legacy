import { Users, Calendar, Trophy, Target, BookOpen, DollarSign } from "lucide-react"
import { StatsCard } from "@/components/features/dashboard/stats-card"
import { TodayTasks } from "@/components/features/dashboard/today-tasks"
import { TodayCommunications } from "@/components/features/dashboard/today-communications"
import { StudentAlerts } from "@/components/features/dashboard/student-alerts"
import { FinancialSnapshot } from "@/components/features/dashboard/financial-snapshot"
import { ClassStatus } from "@/components/features/dashboard/class-status"
import { AttendanceSummary } from "@/components/features/dashboard/attendance-summary"
import { WeeklyPerformance } from "@/components/features/dashboard/weekly-performance"
import { RecentStudentsCard } from "@/components/features/dashboard/recent-students-card"
import { CalendarWidget } from "@/components/features/dashboard/calendar-widget"
import { QuickActions } from "@/components/features/dashboard/quick-actions"
import { QuickStats } from "@/components/features/dashboard/quick-stats"
import { RecentActivityFeed } from "@/components/features/dashboard/recent-activity-feed"
import type {
  DashboardWidgetId,
  RecentStudent,
  TodaySession,
  BirthdayStudent,
  ScheduledConsultation,
  StudentAlert,
  ClassStatus as ClassStatusType,
  ParentToContact,
  CalendarEvent,
  ActivityLog,
  DashboardStats,
  FinancialData,
} from "@/core/types/dashboard"

export interface WidgetFactoryProps {
  widgetId: DashboardWidgetId
  stats: DashboardStats
  attendanceRate: number
  averageScore: number
  completionRate: number
  upcomingSessions: TodaySession[]
  recentStudents: RecentStudent[]
  todaySessions: TodaySession[]
  birthdayStudents: BirthdayStudent[]
  scheduledConsultations: ScheduledConsultation[]
  studentAlerts: {
    longAbsence: StudentAlert[]
    pendingAssignments: StudentAlert[]
  }
  financialData: FinancialData | undefined
  classStatus: ClassStatusType[]
  parentsToContact: ParentToContact[]
  calendarEvents: CalendarEvent[]
  activityLogs: ActivityLog[]
  isEditMode: boolean
}

/**
 * Widget Factory - Centralized widget rendering logic
 * Returns the rendered widget component or null if not found/not renderable
 */
export function renderWidgetContent({
  widgetId,
  stats,
  attendanceRate,
  averageScore,
  completionRate,
  upcomingSessions,
  recentStudents,
  todaySessions,
  birthdayStudents,
  scheduledConsultations,
  studentAlerts,
  financialData,
  classStatus,
  parentsToContact,
  calendarEvents,
  activityLogs,
  isEditMode,
}: WidgetFactoryProps): React.ReactNode {
  switch (widgetId) {
    // KPI Widgets
    case 'kpi-total-students': {
      const newStudentsThisMonth = stats.previousMonthStudents
        ? stats.totalStudents - stats.previousMonthStudents
        : 0
      return (
        <StatsCard
          title="전체 학생"
          value={stats.totalStudents}
          icon={Users}
          description="이번 달 신규 등록"
          trend={{ value: newStudentsThisMonth, isPositive: newStudentsThisMonth > 0 }}
          index={0}
          href="/students"
          variant="default"
        />
      )
    }

    case 'kpi-active-students': {
      const attendanceChange = stats.previousWeekAttendance
        ? stats.todayAttendance - stats.previousWeekAttendance
        : 0
      return (
        <StatsCard
          title="활동 학생"
          value={stats.todayAttendance}
          icon={Target}
          description="지난주 대비"
          trend={{ value: attendanceChange, isPositive: attendanceChange >= 0 }}
          index={1}
          href="/students"
          variant="success"
        />
      )
    }

    case 'kpi-attendance-rate': {
      const prevWeekRate = stats.previousWeekAttendance && stats.totalStudents > 0
        ? Math.round((stats.previousWeekAttendance / stats.totalStudents) * 100)
        : 0
      const rateChange = attendanceRate - prevWeekRate
      return (
        <StatsCard
          title="출석률"
          value={`${attendanceRate}%`}
          icon={Calendar}
          description="지난주 대비"
          trend={{ value: rateChange, isPositive: rateChange >= 0 }}
          index={2}
          variant="success"
          href="/attendance"
        />
      )
    }

    case 'kpi-average-score': {
      const scoreChange = stats.previousMonthAvgScore
        ? averageScore - stats.previousMonthAvgScore
        : 0
      return (
        <StatsCard
          title="평균 성적"
          value={averageScore > 0 ? `${averageScore}점` : '데이터 없음'}
          icon={Trophy}
          description="지난 달 대비"
          trend={{ value: scoreChange, isPositive: scoreChange >= 0 }}
          index={3}
          href="/grades"
          variant="primary"
        />
      )
    }

    case 'kpi-completion-rate': {
      const completionChange = stats.previousWeekCompletionRate
        ? completionRate - stats.previousWeekCompletionRate
        : 0
      return (
        <StatsCard
          title="과제 완료율"
          value={`${completionRate}%`}
          icon={BookOpen}
          description="지난주 대비"
          trend={{ value: completionChange, isPositive: completionChange >= 0 }}
          index={4}
          variant={completionRate >= 90 ? "success" : "warning"}
          href="/todos"
        />
      )
    }

    case 'kpi-monthly-revenue':
      return financialData?.currentMonthRevenue ? (
        <StatsCard
          title="이번 달 매출"
          value={`${(financialData.currentMonthRevenue / 10000).toFixed(0)}만원`}
          icon={DollarSign}
          description="지난 달 대비"
          trend={{
            value: financialData.previousMonthRevenue
              ? Math.round(((financialData.currentMonthRevenue - financialData.previousMonthRevenue) / financialData.previousMonthRevenue) * 100)
              : 0,
            isPositive: financialData.currentMonthRevenue >= (financialData.previousMonthRevenue || 0)
          }}
          index={5}
          variant="primary"
          href="/payments"
        />
      ) : null

    // Main Widgets
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
      return classStatus && classStatus.length > 0 ? (
        <ClassStatus classes={classStatus} />
      ) : null

    case 'attendance-summary':
      return (
        <AttendanceSummary
          todayAttendance={stats.todayAttendance}
          totalStudents={stats.totalStudents}
          sessions={todaySessions || []}
        />
      )

    case 'weekly-performance':
      return <WeeklyPerformance />

    case 'calendar':
      return <CalendarWidget events={calendarEvents || []} />

    case 'quick-actions':
      return <QuickActions isEditMode={isEditMode} />

    case 'quick-stats':
      return (
        <QuickStats
          newStudents={5}
          excellentStudents={23}
          needsAttention={3}
        />
      )

    case 'activity-feed':
      return <RecentActivityFeed activities={activityLogs || []} maxItems={10} />

    default:
      console.warn(`Unknown widget ID: ${widgetId}`)
      return null
  }
}
