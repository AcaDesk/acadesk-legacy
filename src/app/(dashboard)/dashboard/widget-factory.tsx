import dynamic from "next/dynamic"
import { Users, Calendar, Trophy, Target, BookOpen, DollarSign } from "lucide-react"
import { StatsCard } from "@/components/features/dashboard/stats-card"
import { DashboardWidgetSkeleton } from "@/components/features/dashboard/dashboard-widget-wrapper"
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
  WeeklyPerformanceData,
} from "@/core/types/dashboard"

const TodayTasks = dynamic(
  () => import("@/components/features/dashboard/today-tasks").then((m) => m.TodayTasks),
  { loading: () => <DashboardWidgetSkeleton variant="default" /> }
)
const TodayCommunications = dynamic(
  () => import("@/components/features/dashboard/today-communications").then((m) => m.TodayCommunications),
  { loading: () => <DashboardWidgetSkeleton variant="list" /> }
)
const StudentAlerts = dynamic(
  () => import("@/components/features/dashboard/student-alerts").then((m) => m.StudentAlerts),
  { loading: () => <DashboardWidgetSkeleton variant="list" /> }
)
const FinancialSnapshot = dynamic(
  () => import("@/components/features/dashboard/financial-snapshot").then((m) => m.FinancialSnapshot),
  { loading: () => <DashboardWidgetSkeleton variant="default" /> }
)
const ClassStatus = dynamic(
  () => import("@/components/features/dashboard/class-status").then((m) => m.ClassStatus),
  { loading: () => <DashboardWidgetSkeleton variant="list" /> }
)
const AttendanceSummary = dynamic(
  () => import("@/components/features/dashboard/attendance-summary").then((m) => m.AttendanceSummary),
  { loading: () => <DashboardWidgetSkeleton variant="default" /> }
)
const WeeklyPerformance = dynamic(
  () => import("@/components/features/dashboard/weekly-performance").then((m) => m.WeeklyPerformance),
  { loading: () => <DashboardWidgetSkeleton variant="chart" /> }
)
const RecentStudentsCard = dynamic(
  () => import("@/components/features/dashboard/recent-students-card").then((m) => m.RecentStudentsCard),
  { loading: () => <DashboardWidgetSkeleton variant="list" /> }
)
const CalendarWidget = dynamic(
  () => import("@/components/features/dashboard/calendar-widget").then((m) => m.CalendarWidget),
  { loading: () => <DashboardWidgetSkeleton variant="default" /> }
)
const QuickActions = dynamic(
  () => import("@/components/features/dashboard/quick-actions").then((m) => m.QuickActions),
  { loading: () => <DashboardWidgetSkeleton variant="default" /> }
)
const QuickStats = dynamic(
  () => import("@/components/features/dashboard/quick-stats").then((m) => m.QuickStats),
  { loading: () => <DashboardWidgetSkeleton variant="stats" /> }
)
const RecentActivityFeed = dynamic(
  () => import("@/components/features/dashboard/recent-activity-feed").then((m) => m.RecentActivityFeed),
  { loading: () => <DashboardWidgetSkeleton variant="list" /> }
)

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
  weeklyPerformance?: WeeklyPerformanceData
  isEditMode: boolean
  // 드릴다운 콜백 (#8): KPI 카드 클릭 시 호출
  onDrilldown?: () => void
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
  weeklyPerformance,
  isEditMode,
  onDrilldown,
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
          onClick={onDrilldown}
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
          onClick={onDrilldown}
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
          onClick={onDrilldown}
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
          onClick={onDrilldown}
        />
      )
    }

    case 'kpi-monthly-revenue':
      return financialData && financialData.currentMonthRevenue != null ? (
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
      return <WeeklyPerformance data={weeklyPerformance} />

    case 'calendar':
      return <CalendarWidget events={calendarEvents || []} />

    case 'quick-actions':
      return <QuickActions isEditMode={isEditMode} />

    case 'quick-stats': {
      const newStudentsCount = stats.previousMonthStudents != null
        ? stats.totalStudents - stats.previousMonthStudents
        : 0
      const needsAttentionCount =
        (studentAlerts?.longAbsence?.length ?? 0) +
        (studentAlerts?.pendingAssignments?.length ?? 0)
      return (
        <QuickStats
          newStudents={Math.max(0, newStudentsCount)}
          excellentStudents={stats.todayAttendance}
          needsAttention={needsAttentionCount}
        />
      )
    }

    case 'activity-feed':
      return <RecentActivityFeed activities={activityLogs || []} maxItems={10} />

    default:
      console.warn(`Unknown widget ID: ${widgetId}`)
      return null
  }
}
