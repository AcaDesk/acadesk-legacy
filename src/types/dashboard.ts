export type DashboardWidgetId =
  | 'today-tasks'
  | 'today-communications'
  | 'recent-students'
  | 'financial-snapshot'
  | 'student-alerts'
  | 'class-status'
  | 'stats-grid'
  | 'quick-actions'

export interface DashboardWidget {
  id: DashboardWidgetId
  title: string
  visible: boolean
  order: number
  column: 'left' | 'right'
}

export interface DashboardPreferences {
  widgets: DashboardWidget[]
  layout?: 'default' | 'compact' | 'spacious'
}

export const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'today-tasks', title: '오늘의 할 일', visible: true, order: 0, column: 'left' },
  { id: 'today-communications', title: '오늘의 소통', visible: true, order: 1, column: 'left' },
  { id: 'recent-students', title: '최근 등록 학생', visible: true, order: 2, column: 'left' },
  { id: 'financial-snapshot', title: '재무 현황', visible: true, order: 0, column: 'right' },
  { id: 'student-alerts', title: '학생 알림', visible: true, order: 1, column: 'right' },
  { id: 'class-status', title: '수업 현황', visible: true, order: 2, column: 'right' },
  { id: 'stats-grid', title: '통계', visible: true, order: 3, column: 'right' },
  { id: 'quick-actions', title: '빠른 실행', visible: true, order: 4, column: 'right' },
]
