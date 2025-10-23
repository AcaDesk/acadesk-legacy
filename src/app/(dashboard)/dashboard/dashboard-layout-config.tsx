/**
 * Dashboard Layout Configuration
 *
 * 대시보드 레이아웃을 정의하는 설정 파일입니다.
 * 보기 모드와 편집 모드에서 동일한 레이아웃을 사용합니다.
 */

import { type DashboardWidgetId } from "@/core/types/dashboard"

export type LayoutSectionType = 'kpi-grid' | 'two-column' | 'full-width'

export interface LayoutSection {
  type: LayoutSectionType
  widgetIds: DashboardWidgetId[]
  className?: string
}

/**
 * 대시보드 레이아웃 정의
 *
 * - kpi-grid: KPI 카드들을 그리드로 표시
 * - two-column: 2컬럼 그리드
 * - full-width: 전체 너비
 */
export const DASHBOARD_LAYOUT: LayoutSection[] = [
  {
    type: 'kpi-grid',
    widgetIds: [
      'kpi-total-students',
      'kpi-active-students',
      'kpi-attendance-rate',
      'kpi-average-score',
      'kpi-completion-rate',
      'kpi-monthly-revenue',
    ],
    className: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'
  },
  {
    type: 'two-column',
    widgetIds: ['today-tasks', 'quick-stats'],
    className: 'grid gap-6 md:grid-cols-2'
  },
  {
    type: 'full-width',
    widgetIds: ['activity-feed'],
  },
  {
    type: 'two-column',
    widgetIds: ['calendar', 'today-communications'],
    className: 'grid gap-6 md:grid-cols-2'
  },
  {
    type: 'full-width',
    widgetIds: ['weekly-performance'],
  },
  {
    type: 'two-column',
    widgetIds: ['student-alerts', 'recent-students'],
    className: 'grid gap-6 md:grid-cols-2'
  },
  {
    type: 'full-width',
    widgetIds: ['quick-actions'],
  },
]

/**
 * 위젯 ID를 한글 이름으로 매핑
 */
export const WIDGET_NAMES: Record<DashboardWidgetId, string> = {
  'kpi-total-students': '전체 학생 수',
  'kpi-active-students': '활동 학생 수',
  'kpi-attendance-rate': '출석률',
  'kpi-average-score': '평균 성적',
  'kpi-completion-rate': '과제 완료율',
  'kpi-monthly-revenue': '이번 달 매출',
  'today-tasks': '오늘의 할 일',
  'today-communications': '오늘의 소통',
  'recent-students': '최근 등록 학생',
  'financial-snapshot': '재무 현황',
  'student-alerts': '학생 알림',
  'class-status': '수업 현황',
  'quick-actions': '빠른 실행',
  'attendance-summary': '출석 요약',
  'weekly-performance': '주간 성과',
  'calendar': '캘린더',
  'quick-stats': '빠른 통계',
  'activity-feed': '최근 활동',
}

/**
 * 특정 섹션이 보여야 하는지 확인
 * 섹션 내 위젯 중 하나라도 표시되면 섹션을 보여줌
 */
export function shouldShowSection(
  section: LayoutSection,
  visibleWidgetIds: Set<DashboardWidgetId>
): boolean {
  return section.widgetIds.some(id => visibleWidgetIds.has(id))
}

/**
 * 섹션 내에서 보여야 할 위젯들만 필터링
 */
export function getVisibleWidgetsInSection(
  section: LayoutSection,
  visibleWidgetIds: Set<DashboardWidgetId>
): DashboardWidgetId[] {
  return section.widgetIds.filter(id => visibleWidgetIds.has(id))
}
