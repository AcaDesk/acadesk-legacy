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
// rowHeight=60 기준 픽셀 높이: h * 60 + (h-1) * 16
// KPI h=3 → 212px (CardHeader~48px + CardContent~108px = 156px 필요, 여유 56px)
// h=6 → 440px, h=8 → 592px, h=5 → 364px, h=4 → 288px
const ALL_WIDGETS: DashboardWidget[] = [
  // Row 0-2: KPI 카드 — 12컬럼에 6개 균등 배치 (각 w=2, h=3)
  { id: 'kpi-total-students',  title: '전체 학생',   name: '전체 학생 KPI',   visible: true,  x: 0,  y: 0, w: 2, h: 3, minW: 2, minH: 3, column: 'left',  order: 0 },
  { id: 'kpi-active-students', title: '활동 학생',   name: '활동 학생 KPI',   visible: true,  x: 2,  y: 0, w: 2, h: 3, minW: 2, minH: 3, column: 'left',  order: 1 },
  { id: 'kpi-attendance-rate', title: '출석률',      name: '출석률 KPI',      visible: true,  x: 4,  y: 0, w: 2, h: 3, minW: 2, minH: 3, column: 'left',  order: 2, requiredFeatures: ['attendanceManagement'] },
  { id: 'kpi-average-score',   title: '평균 성적',   name: '평균 성적 KPI',   visible: true,  x: 6,  y: 0, w: 2, h: 3, minW: 2, minH: 3, column: 'right', order: 3, requiredFeatures: ['gradesManagement'] },
  { id: 'kpi-completion-rate', title: '과제 완료율', name: '과제 완료율 KPI', visible: true,  x: 8,  y: 0, w: 2, h: 3, minW: 2, minH: 3, column: 'right', order: 4, requiredFeatures: ['todoManagement'] },
  { id: 'kpi-monthly-revenue', title: '이번 달 매출', name: '매출 KPI',       visible: false, x: 10, y: 0, w: 2, h: 3, minW: 2, minH: 3, column: 'right', order: 5, requiredFeatures: ['tuitionManagement'] },

  // Row 3-8: 메인 2컬럼 위젯
  { id: 'today-tasks',          title: '오늘의 할 일',   name: '오늘의 할 일',     visible: true, x: 0, y: 3,  w: 6, h: 6, minW: 4, minH: 3, column: 'left',  order: 6,  requiredFeatures: ['todoManagement', 'classManagement'] },
  { id: 'quick-stats',          title: '빠른 통계',      name: '빠른 통계',        visible: true, x: 6, y: 3,  w: 6, h: 6, minW: 3, minH: 3, column: 'right', order: 7 },

  // Row 9-13: 전체 너비
  { id: 'activity-feed',        title: '최근 활동',      name: '최근 활동 피드',   visible: true, x: 0, y: 9,  w: 12, h: 5, minW: 6, minH: 3, column: 'left',  order: 8 },

  // Row 14-21: 2컬럼
  { id: 'calendar',             title: '캘린더',         name: '일정 캘린더',      visible: true, x: 0, y: 14, w: 6, h: 8, minW: 4, minH: 4, column: 'left',  order: 9,  requiredFeatures: ['calendarIntegration'] },
  { id: 'today-communications', title: '오늘의 소통',    name: '오늘의 소통',      visible: true, x: 6, y: 14, w: 6, h: 8, minW: 4, minH: 4, column: 'right', order: 10, requiredFeatures: ['consultationManagement'] },

  // Row 22-27: 전체 너비
  { id: 'weekly-performance',   title: '주간 성과',      name: '주간 성과 분석',   visible: true, x: 0, y: 22, w: 12, h: 6, minW: 6, minH: 3, column: 'left',  order: 11, requiredFeatures: ['gradesManagement'] },

  // Row 28-33: 2컬럼
  { id: 'student-alerts',       title: '학생 알림',      name: '학생 알림',        visible: true, x: 0, y: 28, w: 6, h: 6, minW: 4, minH: 3, column: 'left',  order: 12, requiredFeatures: ['notificationSystem'] },
  { id: 'recent-students',      title: '최근 등록 학생', name: '최근 등록 학생',   visible: true, x: 6, y: 28, w: 6, h: 6, minW: 4, minH: 3, column: 'right', order: 13, requiredFeatures: ['studentManagement'] },

  // Row 34-37: 전체 너비
  { id: 'quick-actions',        title: '빠른 실행',      name: '빠른 실행',        visible: true, x: 0, y: 34, w: 12, h: 4, minW: 6, minH: 2, column: 'left',  order: 14 },

  // 숨겨진 위젯 (편집 모드에서 고스트로 표시)
  { id: 'attendance-summary',   title: '출석 현황',      name: '출석 요약',        visible: false, x: 0, y: 38, w: 6, h: 5, minW: 4, minH: 3, column: 'left',  order: 15, requiredFeatures: ['attendanceManagement'] },
  { id: 'class-status',         title: '수업 현황',      name: '수업 상태',        visible: false, x: 6, y: 38, w: 6, h: 5, minW: 4, minH: 3, column: 'right', order: 16, requiredFeatures: ['classManagement'] },
  { id: 'financial-snapshot',   title: '재무 현황',      name: '재무 스냅샷',      visible: false, x: 0, y: 43, w: 6, h: 5, minW: 4, minH: 3, column: 'left',  order: 17, requiredFeatures: ['tuitionManagement'] },
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

/** 위험 학생 조기 경보 항목 (규칙 기반 복합 스코어) */
export interface RiskStudentAlert {
  id: string
  name: string
  grade: string
  level: 'danger' | 'warning'
  score: number
  reasons: string[]
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

export interface WeeklyPerformanceData {
  attendance: number[]  // 7일간 출석률 (%)
  todos: number[]       // 7일간 완료 TODO 수
  reports: number[]     // 7일간 리포트 수 (placeholder)
}

export interface DashboardData {
  stats: DashboardStats
  recentStudents: RecentStudent[]
  todaySessions: TodaySession[]
  birthdayStudents: BirthdayStudent[]
  scheduledConsultations: ScheduledConsultation[]
  studentAlerts: {
    atRisk: RiskStudentAlert[]
  }
  financialData?: FinancialData
  classStatus: ClassStatus[]
  parentsToContact: ParentToContact[]
  calendarEvents: CalendarEvent[]
  activityLogs: ActivityLog[]
  weeklyPerformance?: WeeklyPerformanceData
}

// ============================================================================
// Layout Presets
// ============================================================================

// rowHeight=60 기준: 픽셀 높이 = h * 60 + (h-1) * 16
export const LAYOUT_PRESETS: Record<DashboardPreset, LayoutPreset> = {
  default: {
    name: '기본 레이아웃',
    description: 'KPI와 주요 위젯을 균형있게 배치',
    widgets: [
      // KPI 카드 6개 — 1줄, 각 w=2, h=3 (212px)
      { id: 'kpi-total-students',  visible: true,  x: 0,  y: 0, w: 2, h: 3 },
      { id: 'kpi-active-students', visible: true,  x: 2,  y: 0, w: 2, h: 3 },
      { id: 'kpi-attendance-rate', visible: true,  x: 4,  y: 0, w: 2, h: 3 },
      { id: 'kpi-average-score',   visible: true,  x: 6,  y: 0, w: 2, h: 3 },
      { id: 'kpi-completion-rate', visible: true,  x: 8,  y: 0, w: 2, h: 3 },
      { id: 'kpi-monthly-revenue', visible: false, x: 10, y: 0, w: 2, h: 3 },
      // 주요 위젯
      { id: 'today-tasks',          visible: true, x: 0, y: 3,  w: 6,  h: 6 },
      { id: 'quick-stats',          visible: true, x: 6, y: 3,  w: 6,  h: 6 },
      { id: 'activity-feed',        visible: true, x: 0, y: 9,  w: 12, h: 5 },
      { id: 'calendar',             visible: true, x: 0, y: 14, w: 6,  h: 8 },
      { id: 'today-communications', visible: true, x: 6, y: 14, w: 6,  h: 8 },
    ]
  },
  compact: {
    name: '컴팩트 레이아웃',
    description: '핵심 정보만 집약적으로 표시',
    widgets: [
      // KPI 3개 (w=4 균등 배치), h=3
      { id: 'kpi-total-students',  visible: true, x: 0, y: 0, w: 4, h: 3 },
      { id: 'kpi-attendance-rate', visible: true, x: 4, y: 0, w: 4, h: 3 },
      { id: 'kpi-average-score',   visible: true, x: 8, y: 0, w: 4, h: 3 },
      // 핵심 위젯
      { id: 'today-tasks',     visible: true, x: 0, y: 3, w: 6,  h: 6 },
      { id: 'student-alerts',  visible: true, x: 6, y: 3, w: 6,  h: 6 },
      { id: 'quick-actions',   visible: true, x: 0, y: 9, w: 12, h: 4 },
    ]
  },
  focus: {
    name: '집중 모드',
    description: '오늘 할 일과 중요 알림에 집중',
    widgets: [
      { id: 'today-tasks',          visible: true, x: 0, y: 0,  w: 12, h: 7 },
      { id: 'student-alerts',       visible: true, x: 0, y: 7,  w: 6,  h: 6 },
      { id: 'today-communications', visible: true, x: 6, y: 7,  w: 6,  h: 6 },
      { id: 'activity-feed',        visible: true, x: 0, y: 13, w: 12, h: 5 },
    ]
  },
  overview: {
    name: '전체 보기',
    description: '모든 정보를 한 화면에 표시',
    widgets: [
      // KPI 6개 — 1줄, w=2, h=3
      { id: 'kpi-total-students',  visible: true, x: 0,  y: 0, w: 2, h: 3 },
      { id: 'kpi-active-students', visible: true, x: 2,  y: 0, w: 2, h: 3 },
      { id: 'kpi-attendance-rate', visible: true, x: 4,  y: 0, w: 2, h: 3 },
      { id: 'kpi-average-score',   visible: true, x: 6,  y: 0, w: 2, h: 3 },
      { id: 'kpi-completion-rate', visible: true, x: 8,  y: 0, w: 2, h: 3 },
      { id: 'kpi-monthly-revenue', visible: true, x: 10, y: 0, w: 2, h: 3 },
      // 3열 위젯 (w=4)
      { id: 'today-tasks',          visible: true, x: 0, y: 3,  w: 4, h: 5 },
      { id: 'quick-stats',          visible: true, x: 4, y: 3,  w: 4, h: 5 },
      { id: 'student-alerts',       visible: true, x: 8, y: 3,  w: 4, h: 5 },
      // 2열 위젯 (w=6)
      { id: 'activity-feed',        visible: true, x: 0, y: 8,  w: 6, h: 5 },
      { id: 'calendar',             visible: true, x: 6, y: 8,  w: 6, h: 5 },
      { id: 'recent-students',      visible: true, x: 0, y: 13, w: 6, h: 5 },
      { id: 'today-communications', visible: true, x: 6, y: 13, w: 6, h: 5 },
    ]
  }
}
