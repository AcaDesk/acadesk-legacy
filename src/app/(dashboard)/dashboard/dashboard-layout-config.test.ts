import { describe, it, expect } from 'vitest'
import {
  getVisibleWidgetsInSection,
  getSortedSections,
  type LayoutSection,
} from './dashboard-layout-config'
import type { DashboardWidget, DashboardWidgetId } from '@/core/types/dashboard'
import { arrayMove } from '@dnd-kit/sortable'

// Helper: 최소한의 DashboardWidget 생성
function makeWidget(
  id: DashboardWidgetId,
  order: number,
  visible = true
): DashboardWidget {
  return {
    id,
    title: id,
    name: id,
    visible,
    x: 0, y: 0, w: 1, h: 1,
    order,
  }
}

// ============================================================================
// getVisibleWidgetsInSection
// ============================================================================
describe('getVisibleWidgetsInSection', () => {
  const section: LayoutSection = {
    type: 'two-column',
    widgetIds: ['today-tasks', 'quick-stats'],
  }

  it('위젯 order 기준으로 정렬한다', () => {
    const widgets = [
      makeWidget('quick-stats', 0),
      makeWidget('today-tasks', 5),
    ]
    const visible = new Set<DashboardWidgetId>(['today-tasks', 'quick-stats'])

    const result = getVisibleWidgetsInSection(section, visible, widgets)
    expect(result).toEqual(['quick-stats', 'today-tasks'])
  })

  it('widgets 없으면 widgetIds 원본 순서 유지', () => {
    const visible = new Set<DashboardWidgetId>(['today-tasks', 'quick-stats'])
    const result = getVisibleWidgetsInSection(section, visible)
    expect(result).toEqual(['today-tasks', 'quick-stats'])
  })

  it('숨김 위젯은 필터링된다', () => {
    const widgets = [
      makeWidget('today-tasks', 0, true),
      makeWidget('quick-stats', 1, false),
    ]
    const visible = new Set<DashboardWidgetId>(['today-tasks'])

    const result = getVisibleWidgetsInSection(section, visible, widgets)
    expect(result).toEqual(['today-tasks'])
  })
})

// ============================================================================
// getSortedSections
// ============================================================================
describe('getSortedSections', () => {
  const layout: LayoutSection[] = [
    {
      type: 'kpi-grid',
      widgetIds: ['kpi-total-students', 'kpi-active-students'],
    },
    {
      type: 'two-column',
      widgetIds: ['today-tasks', 'quick-stats'],
    },
    {
      type: 'full-width',
      widgetIds: ['activity-feed'],
    },
  ]

  it('위젯 order에 따라 섹션 순서가 바뀐다', () => {
    // activity-feed가 가장 낮은 order → 해당 섹션이 첫 번째로
    const widgets = [
      makeWidget('kpi-total-students', 10),
      makeWidget('kpi-active-students', 11),
      makeWidget('today-tasks', 5),
      makeWidget('quick-stats', 6),
      makeWidget('activity-feed', 0),
    ]
    const visible = new Set<DashboardWidgetId>([
      'kpi-total-students', 'kpi-active-students',
      'today-tasks', 'quick-stats',
      'activity-feed',
    ])

    const sorted = getSortedSections(layout, visible, widgets)
    expect(sorted[0].type).toBe('full-width') // activity-feed (order 0)
    expect(sorted[1].type).toBe('two-column') // today-tasks (order 5)
    expect(sorted[2].type).toBe('kpi-grid')   // kpi-total-students (order 10)
  })

  it('visible 위젯이 없는 섹션은 제외된다', () => {
    const widgets = [
      makeWidget('today-tasks', 0),
      makeWidget('quick-stats', 1),
    ]
    const visible = new Set<DashboardWidgetId>(['today-tasks', 'quick-stats'])

    const sorted = getSortedSections(layout, visible, widgets)
    expect(sorted).toHaveLength(1)
    expect(sorted[0].type).toBe('two-column')
  })

  it('기본 order(저장 전)에서는 레이아웃 원본 순서 유지', () => {
    // 모든 위젯이 동일한 order(0)면 layout 순서대로
    const widgets = [
      makeWidget('kpi-total-students', 0),
      makeWidget('kpi-active-students', 1),
      makeWidget('today-tasks', 2),
      makeWidget('quick-stats', 3),
      makeWidget('activity-feed', 4),
    ]
    const visible = new Set<DashboardWidgetId>([
      'kpi-total-students', 'kpi-active-students',
      'today-tasks', 'quick-stats',
      'activity-feed',
    ])

    const sorted = getSortedSections(layout, visible, widgets)
    expect(sorted[0].type).toBe('kpi-grid')
    expect(sorted[1].type).toBe('two-column')
    expect(sorted[2].type).toBe('full-width')
  })

  it('숨김 위젯이 섞여도 visible 위젯 order 기준으로 정렬한다', () => {
    const widgets = [
      makeWidget('kpi-total-students', 0, false), // hidden
      makeWidget('kpi-active-students', 1),        // visible, order 1
      makeWidget('today-tasks', 2, false),          // hidden
      makeWidget('quick-stats', 3),                 // visible, order 3
      makeWidget('activity-feed', 0),               // visible, order 0
    ]
    const visible = new Set<DashboardWidgetId>([
      'kpi-active-students',
      'quick-stats',
      'activity-feed',
    ])

    const sorted = getSortedSections(layout, visible, widgets)
    expect(sorted).toHaveLength(3)
    expect(sorted[0].type).toBe('full-width')  // activity-feed order 0
    expect(sorted[1].type).toBe('kpi-grid')    // kpi-active-students order 1
    expect(sorted[2].type).toBe('two-column')  // quick-stats order 3
  })
})

// ============================================================================
// DnD: sort-then-arrayMove 패턴 검증
// ============================================================================
describe('DnD sort-then-arrayMove', () => {
  /**
   * handleDragEnd 로직을 재현:
   * 1. 상태 배열을 order 기준 정렬
   * 2. 정렬된 배열에서 findIndex → arrayMove
   * 3. 새 order 값 부여
   */
  function simulateDragEnd(
    widgets: DashboardWidget[],
    activeId: DashboardWidgetId,
    overId: DashboardWidgetId
  ): DashboardWidget[] {
    const sorted = [...widgets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const oldIndex = sorted.findIndex(w => w.id === activeId)
    const newIndex = sorted.findIndex(w => w.id === overId)
    const reordered = arrayMove(sorted, oldIndex, newIndex)
    return reordered.map((widget, index) => ({ ...widget, order: index }))
  }

  it('첫 번째 위젯을 세 번째로 이동', () => {
    const widgets = [
      makeWidget('today-tasks', 0),
      makeWidget('quick-stats', 1),
      makeWidget('activity-feed', 2),
    ]

    const result = simulateDragEnd(widgets, 'today-tasks', 'activity-feed')

    const ids = result.map(w => w.id)
    expect(ids).toEqual(['quick-stats', 'activity-feed', 'today-tasks'])
    expect(result.map(w => w.order)).toEqual([0, 1, 2])
  })

  it('상태 배열 순서가 order와 다를 때도 올바르게 동작', () => {
    // 상태 배열 순서: [activity-feed, today-tasks, quick-stats]
    // order 순서:     today-tasks(0), quick-stats(1), activity-feed(2)
    const widgets = [
      makeWidget('activity-feed', 2),
      makeWidget('today-tasks', 0),
      makeWidget('quick-stats', 1),
    ]

    // today-tasks(0번)를 activity-feed(2번) 위치로 드래그
    const result = simulateDragEnd(widgets, 'today-tasks', 'activity-feed')

    const ids = result.map(w => w.id)
    expect(ids).toEqual(['quick-stats', 'activity-feed', 'today-tasks'])
    expect(result.map(w => w.order)).toEqual([0, 1, 2])
  })

  it('숨김 위젯이 포함된 상태에서 드래그', () => {
    const widgets = [
      makeWidget('today-tasks', 0, true),
      makeWidget('quick-stats', 1, false), // hidden
      makeWidget('activity-feed', 2, true),
      makeWidget('calendar', 3, true),
    ]

    // 실제 DnD에서는 visible 위젯만 SortableContext에 있지만,
    // handleDragEnd는 전체 배열을 다룸 (숨김 위젯도 order 유지)
    const result = simulateDragEnd(widgets, 'activity-feed', 'today-tasks')

    // activity-feed가 today-tasks 앞으로 이동
    const visibleOrder = result
      .filter(w => w.visible)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(w => w.id)

    expect(visibleOrder[0]).toBe('activity-feed')
    expect(visibleOrder[1]).toBe('today-tasks')
    expect(visibleOrder[2]).toBe('calendar')
  })

  it('연속 드래그 후 order가 항상 연속적이다', () => {
    let widgets = [
      makeWidget('today-tasks', 0),
      makeWidget('quick-stats', 1),
      makeWidget('activity-feed', 2),
      makeWidget('calendar', 3),
    ]

    // 1차 드래그: calendar → today-tasks 위치로
    widgets = simulateDragEnd(widgets, 'calendar', 'today-tasks')
    // 2차 드래그: quick-stats → activity-feed 위치로
    widgets = simulateDragEnd(widgets, 'quick-stats', 'activity-feed')

    const orders = widgets.map(w => w.order!).sort((a, b) => a - b)
    expect(orders).toEqual([0, 1, 2, 3])
  })
})
