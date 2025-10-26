import { FEATURES, type FeatureKey } from '@/lib/features.config'

export type DashboardWidgetId =
  | 'today-tasks'
  | 'today-communications'
  | 'recent-students'
  | 'financial-snapshot'
  | 'student-alerts'
  | 'class-status'
  | 'quick-actions'
  | 'attendance-summary'
  | 'weekly-performance'
  | 'calendar'
  | 'quick-stats'
  | 'activity-feed'
  // Individual KPI widgets
  | 'kpi-total-students'
  | 'kpi-active-students'
  | 'kpi-attendance-rate'
  | 'kpi-average-score'
  | 'kpi-completion-rate'
  | 'kpi-monthly-revenue'

export interface DashboardWidget {
  id: DashboardWidgetId
  title: string
  name: string  // For display in widget list and menus
  visible: boolean
  // Grid layout properties
  x: number  // Grid column position (0-11 for 12-column grid)
  y: number  // Grid row position
  w: number  // Width in grid units (1-12)
  h: number  // Height in grid units
  minW?: number  // Minimum width
  minH?: number  // Minimum height
  maxW?: number  // Maximum width
  maxH?: number  // Maximum height
  // Legacy column-based layout (for 2-column drag-and-drop edit mode)
  column?: 'left' | 'right'
  order?: number
  requiredFeatures?: FeatureKey[]  // Features required to show this widget
}

export interface DashboardPreferences {
  widgets: DashboardWidget[]
  layout?: 'default' | 'compact' | 'spacious'
  preset?: DashboardPreset
}

export type DashboardPreset = 'default' | 'compact' | 'focus' | 'overview'

export interface LayoutPreset {
  name: string
  description: string
  widgets: Partial<DashboardWidget>[]
}

// All available widgets with their feature dependencies
// Using 12-column grid system + column/order for edit mode
const ALL_WIDGETS: DashboardWidget[] = [
  // Row 0: KPI Cards - 기본적으로 표시됨, 개별적으로 숨김 가능
  { id: 'kpi-total-students', title: '전체 학생', name: '전체 학생 KPI', visible: true, x: 0, y: 0, w: 4, h: 1, minW: 2, minH: 1, column: 'left', order: 0 },
  { id: 'kpi-active-students', title: '활동 학생', name: '활동 학생 KPI', visible: true, x: 4, y: 0, w: 4, h: 1, minW: 2, minH: 1, column: 'left', order: 1 },
  { id: 'kpi-attendance-rate', title: '출석률', name: '출석률 KPI', visible: true, x: 8, y: 0, w: 4, h: 1, minW: 2, minH: 1, column: 'left', order: 2, requiredFeatures: ['attendanceManagement'] },
  { id: 'kpi-average-score', title: '평균 성적', name: '평균 성적 KPI', visible: true, x: 0, y: 1, w: 4, h: 1, minW: 2, minH: 1, column: 'right', order: 0, requiredFeatures: ['gradesManagement'] },
  { id: 'kpi-completion-rate', title: '과제 완료율', name: '과제 완료율 KPI', visible: true, x: 4, y: 1, w: 4, h: 1, minW: 2, minH: 1, column: 'right', order: 1, requiredFeatures: ['todoManagement'] },
  { id: 'kpi-monthly-revenue', title: '이번 달 매출', name: '매출 KPI', visible: false, x: 8, y: 1, w: 4, h: 1, minW: 2, minH: 1, column: 'right', order: 2, requiredFeatures: ['tuitionManagement'] },

  // Main widgets (visible by default)
  { id: 'today-tasks', title: '오늘의 할 일', name: '오늘의 할 일', visible: true, x: 0, y: 2, w: 6, h: 2, minW: 4, minH: 2, column: 'left', order: 3, requiredFeatures: ['todoManagement', 'classManagement'] },
  { id: 'quick-stats', title: '빠른 통계', name: '빠른 통계', visible: true, x: 6, y: 2, w: 6, h: 2, minW: 3, minH: 2, column: 'right', order: 3 },
  { id: 'activity-feed', title: '최근 활동', name: '최근 활동 피드', visible: true, x: 0, y: 4, w: 12, h: 3, minW: 6, minH: 2, column: 'left', order: 4 },
  { id: 'calendar', title: '캘린더', name: '일정 캘린더', visible: true, x: 0, y: 7, w: 6, h: 2, minW: 4, minH: 2, column: 'left', order: 5, requiredFeatures: ['calendarIntegration'] },
  { id: 'today-communications', title: '오늘의 소통', name: '오늘의 소통', visible: true, x: 6, y: 7, w: 6, h: 2, minW: 4, minH: 2, column: 'right', order: 4, requiredFeatures: ['consultationManagement'] },
  { id: 'weekly-performance', title: '주간 성과', name: '주간 성과 분석', visible: true, x: 0, y: 9, w: 12, h: 2, minW: 6, minH: 2, column: 'left', order: 6, requiredFeatures: ['gradesManagement'] },
  { id: 'student-alerts', title: '학생 알림', name: '학생 알림', visible: true, x: 0, y: 11, w: 6, h: 2, minW: 4, minH: 2, column: 'left', order: 7, requiredFeatures: ['notificationSystem'] },
  { id: 'recent-students', title: '최근 등록 학생', name: '최근 등록 학생', visible: true, x: 6, y: 11, w: 6, h: 2, minW: 4, minH: 2, column: 'right', order: 5, requiredFeatures: ['studentManagement'] },
  { id: 'quick-actions', title: '빠른 실행', name: '빠른 실행', visible: true, x: 0, y: 13, w: 12, h: 2, minW: 6, minH: 2, column: 'left', order: 8 },

  // Additional widgets (hidden by default)
  { id: 'attendance-summary', title: '출석 현황', name: '출석 요약', visible: false, x: 0, y: 15, w: 6, h: 2, minW: 4, minH: 2, column: 'left', order: 9, requiredFeatures: ['attendanceManagement'] },
  { id: 'class-status', title: '수업 현황', name: '수업 상태', visible: false, x: 6, y: 15, w: 6, h: 2, minW: 4, minH: 2, column: 'right', order: 6, requiredFeatures: ['classManagement'] },
  { id: 'financial-snapshot', title: '재무 현황', name: '재무 스냅샷', visible: false, x: 0, y: 17, w: 6, h: 2, minW: 4, minH: 2, column: 'left', order: 10, requiredFeatures: ['tuitionManagement'] },
]

/**
 * Check if a widget should be available based on feature flags
 */
export function isWidgetAvailable(widget: DashboardWidget): boolean {
  if (!widget.requiredFeatures || widget.requiredFeatures.length === 0) {
    return true
  }
  // Widget is available if ALL required features are enabled
  return widget.requiredFeatures.every(feature => FEATURES[feature])
}

/**
 * Get default widgets filtered by feature flags
 */
export function getDefaultWidgets(): DashboardWidget[] {
  return ALL_WIDGETS.filter(isWidgetAvailable)
}

/**
 * Default widgets (computed based on active features)
 */
export const DEFAULT_WIDGETS = getDefaultWidgets()

/**
 * Layout presets for quick dashboard configurations
 */
// ============================================================================
// Dashboard Data Types
// ============================================================================

export interface DashboardStats {
  totalStudents: number
  activeClasses: number
  todayAttendance: number
  pendingTodos: number
  totalReports: number
  unsentReports: number
  // 실제 계산 데이터
  averageScore: number
  completionRate: number
  // 입회 상담 통계
  leadConsultations?: number  // 신규 입회 상담 수
  convertedConsultations?: number  // 입회 완료 수
  conversionRate?: number  // 입회 전환율 (%)
  // Trend 계산용 (이전 기간 대비)
  previousMonthStudents?: number
  previousWeekAttendance?: number
  previousMonthAvgScore?: number
  previousWeekCompletionRate?: number
}

export interface FinancialData {
  currentMonthRevenue: number
  previousMonthRevenue: number
  unpaidTotal: number
  unpaidCount: number
}

export interface RecentStudent {
  id: string
  name: string
  grade: string
  joinedAt: string
  // Added for recent-students-card widget
  grade_level?: string
  guardian_name?: string
  enrollment_date?: string
}

export interface TodaySession {
  id: string
  class_name: string
  scheduled_start: string
  scheduled_end: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  instructor_name?: string
  // Added for attendance-summary widget
  total_students?: number
  attendance_count?: number
}

export interface BirthdayStudent {
  id: string
  name: string
  birthday: string
  grade: string
}

export interface StudentAlert {
  id: string
  name: string
  grade: string
  reason: string
  days?: number
  // Added for student-alerts widget
  student_id?: string
  student_name?: string
  description?: string
}

export interface ClassStatus {
  id: string
  class_name: string
  enrolled: number
  capacity: number
  instructor: string
  schedule: string
  // Added for class-status widget
  name?: string
  status?: 'active' | 'inactive' | 'completed'
  student_count?: number
  active_students?: number
  attendance_rate?: number
}

export interface ScheduledConsultation {
  id: string
  parent_name: string
  student_name: string
  scheduled_at: string
  topic: string
}

export interface ParentToContact {
  id: string
  parent_name: string
  student_name: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  type: 'class' | 'exam' | 'consultation' | 'event'
  // Added for calendar-widget
  start_date?: string
  event_type?: 'class' | 'exam' | 'consultation' | 'event'
}

export interface ActivityLog {
  id: string
  activity_type: string
  description: string
  created_at: string
  students?: {
    users?: {
      name: string
    } | null
  } | null
  // Added for recent-activity-feed widget
  activity_type_code?: string
  ref_activity_types?: {
    name: string
    icon?: string
  } | null
}

export interface DashboardData {
  stats: DashboardStats
  recentStudents: RecentStudent[]
  todaySessions: TodaySession[]
  birthdayStudents: BirthdayStudent[]
  scheduledConsultations: ScheduledConsultation[]
  studentAlerts: {
    longAbsence: StudentAlert[]
    pendingAssignments: StudentAlert[]
  }
  financialData?: FinancialData
  classStatus: ClassStatus[]
  parentsToContact: ParentToContact[]
  calendarEvents: CalendarEvent[]
  activityLogs: ActivityLog[]
}

// ============================================================================
// Layout Presets
// ============================================================================

export const LAYOUT_PRESETS: Record<DashboardPreset, LayoutPreset> = {
  default: {
    name: '기본 레이아웃',
    description: 'KPI와 주요 위젯을 균형있게 배치',
    widgets: [
      // KPI 카드들 - 상단 2줄
      { id: 'kpi-total-students', visible: true, x: 0, y: 0, w: 4, h: 1 },
      { id: 'kpi-active-students', visible: true, x: 4, y: 0, w: 4, h: 1 },
      { id: 'kpi-attendance-rate', visible: true, x: 8, y: 0, w: 4, h: 1 },
      { id: 'kpi-average-score', visible: true, x: 0, y: 1, w: 4, h: 1 },
      { id: 'kpi-completion-rate', visible: true, x: 4, y: 1, w: 4, h: 1 },
      { id: 'kpi-monthly-revenue', visible: false, x: 8, y: 1, w: 4, h: 1 },
      // 주요 위젯들
      { id: 'today-tasks', visible: true, x: 0, y: 2, w: 6, h: 2 },
      { id: 'quick-stats', visible: true, x: 6, y: 2, w: 6, h: 2 },
      { id: 'activity-feed', visible: true, x: 0, y: 4, w: 12, h: 3 },
      { id: 'calendar', visible: true, x: 0, y: 7, w: 6, h: 2 },
      { id: 'today-communications', visible: true, x: 6, y: 7, w: 6, h: 2 },
    ]
  },
  compact: {
    name: '컴팩트 레이아웃',
    description: '핵심 정보만 집약적으로 표시',
    widgets: [
      // KPI 카드 3개만
      { id: 'kpi-total-students', visible: true, x: 0, y: 0, w: 4, h: 1 },
      { id: 'kpi-attendance-rate', visible: true, x: 4, y: 0, w: 4, h: 1 },
      { id: 'kpi-average-score', visible: true, x: 8, y: 0, w: 4, h: 1 },
      // 핵심 위젯만
      { id: 'today-tasks', visible: true, x: 0, y: 1, w: 6, h: 2 },
      { id: 'student-alerts', visible: true, x: 6, y: 1, w: 6, h: 2 },
      { id: 'quick-actions', visible: true, x: 0, y: 3, w: 12, h: 1 },
    ]
  },
  focus: {
    name: '집중 모드',
    description: '오늘 할 일과 중요 알림에 집중',
    widgets: [
      { id: 'today-tasks', visible: true, x: 0, y: 0, w: 12, h: 3 },
      { id: 'student-alerts', visible: true, x: 0, y: 3, w: 6, h: 2 },
      { id: 'today-communications', visible: true, x: 6, y: 3, w: 6, h: 2 },
      { id: 'activity-feed', visible: true, x: 0, y: 5, w: 12, h: 3 },
    ]
  },
  overview: {
    name: '전체 보기',
    description: '모든 정보를 한 화면에 표시',
    widgets: [
      // 모든 KPI
      { id: 'kpi-total-students', visible: true, x: 0, y: 0, w: 2, h: 1 },
      { id: 'kpi-active-students', visible: true, x: 2, y: 0, w: 2, h: 1 },
      { id: 'kpi-attendance-rate', visible: true, x: 4, y: 0, w: 2, h: 1 },
      { id: 'kpi-average-score', visible: true, x: 6, y: 0, w: 2, h: 1 },
      { id: 'kpi-completion-rate', visible: true, x: 8, y: 0, w: 2, h: 1 },
      { id: 'kpi-monthly-revenue', visible: true, x: 10, y: 0, w: 2, h: 1 },
      // 모든 위젯
      { id: 'today-tasks', visible: true, x: 0, y: 1, w: 4, h: 2 },
      { id: 'quick-stats', visible: true, x: 4, y: 1, w: 4, h: 2 },
      { id: 'student-alerts', visible: true, x: 8, y: 1, w: 4, h: 2 },
      { id: 'activity-feed', visible: true, x: 0, y: 3, w: 6, h: 2 },
      { id: 'calendar', visible: true, x: 6, y: 3, w: 6, h: 2 },
      { id: 'recent-students', visible: true, x: 0, y: 5, w: 6, h: 2 },
      { id: 'today-communications', visible: true, x: 6, y: 5, w: 6, h: 2 },
    ]
  }
}
