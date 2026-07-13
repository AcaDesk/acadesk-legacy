"use client"

import { useState, useEffect, useMemo, useCallback, useTransition, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import ReactGridLayout, { WidthProvider } from "react-grid-layout/legacy"
import type { Layout } from "react-grid-layout/legacy"
import "react-grid-layout/css/styles.css"
import { DashboardHeader } from "@/components/features/dashboard/dashboard-header"
import { DashboardWidgetWrapper } from "@/components/features/dashboard/dashboard-widget-wrapper"
import { WelcomeBanner } from "@/components/features/dashboard/welcome-banner"
import { KPIPeriodSelector } from "@/components/features/dashboard/kpi-period-selector"
import { WidgetGhostPlaceholder } from "@/components/features/dashboard/widget-ghost-placeholder"
import { WidgetWithControls } from "@/components/features/dashboard/widget-with-controls"
import {
  DEFAULT_WIDGETS,
  type DashboardWidget,
  type DashboardPreferences,
  isWidgetAvailable,
  LAYOUT_PRESETS,
  type DashboardPreset,
  type DashboardWidgetId,
  type DashboardData,
  type TodaySession,
} from "@/core/types/dashboard"
import { renderWidgetContent } from "./widget-factory"
import { WidgetErrorBoundary } from "@/components/features/dashboard/widget-error-boundary"
import { cn } from "@/lib/utils"
import { saveDashboardPreferences } from "@/app/actions/dashboard-preferences"
import { getKPIStatsByPeriod } from "@/app/actions/dashboard-kpi"
import type { DrilldownWidgetId } from "@/app/actions/dashboard-drilldown"
import { useDashboardStore } from "@/lib/stores/dashboard.store"
import { queryKeys } from "@/lib/query-keys"

const AutoWidthGridLayout = WidthProvider(ReactGridLayout)
const WidgetDrilldownDialog = dynamic(
  () => import("@/components/features/dashboard/widget-drilldown-dialog").then((m) => m.WidgetDrilldownDialog),
  { loading: () => null }
)

// KPI 드릴다운이 지원되는 위젯 ID
const DRILLDOWN_WIDGET_IDS = new Set<string>([
  'kpi-total-students',
  'kpi-attendance-rate',
  'kpi-average-score',
  'kpi-completion-rate',
])

/**
 * 서버에서 로드한 저장된 위젯 설정을 초기 위젯 배열로 변환
 * (기존 useEffect 로직과 동일, 초기 상태값 계산용)
 */
function resolveInitialWidgets(saved: DashboardWidget[] | undefined): DashboardWidget[] {
  if (!saved || saved.length === 0) return DEFAULT_WIDGETS

  const defaultWidgetMap = new Map(DEFAULT_WIDGETS.map(w => [w.id, w]))

  // 구버전 레이아웃 감지: react-grid-layout 이전에는 KPI 외 위젯이 h≤2였음
  const isLegacyLayout = saved.some(
    (w) => !w.id.startsWith('kpi-') && w.visible && w.h <= 2
  )

  if (isLegacyLayout) {
    const visibilityMap = new Map(
      saved
        .filter((w) => {
          const def = defaultWidgetMap.get(w.id)
          return def && isWidgetAvailable({ ...w, requiredFeatures: def.requiredFeatures })
        })
        .map((w) => [w.id, w.visible])
    )
    return DEFAULT_WIDGETS.map(def => ({
      ...def,
      visible: visibilityMap.has(def.id)
        ? (visibilityMap.get(def.id) ?? def.visible)
        : def.visible,
    }))
  }

  // 신버전: 저장된 값 그대로 사용
  const widgetsWithNames = saved
    .filter((widget) => {
      const defaultWidget = defaultWidgetMap.get(widget.id)
      if (!defaultWidget) return false
      return isWidgetAvailable({
        ...widget,
        requiredFeatures: defaultWidget.requiredFeatures,
      })
    })
    .map((widget) => {
      const defaultWidget = defaultWidgetMap.get(widget.id)!
      return {
        ...widget,
        name: widget.name || defaultWidget.name || widget.title || widget.id,
        requiredFeatures: defaultWidget.requiredFeatures,
      }
    })
  const savedWidgetIds = new Set(widgetsWithNames.map((w) => w.id))
  const newWidgets = DEFAULT_WIDGETS
    .filter(w => !savedWidgetIds.has(w.id))
    .map(w => ({ ...w, visible: false }))
  return [...widgetsWithNames, ...newWidgets]
}

interface DashboardClientProps {
  data: DashboardData
  savedPreferences?: DashboardPreferences | null
}

export function DashboardClient({ data: initialData, savedPreferences }: DashboardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const {
    stats,
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
  } = initialData

  // 레이아웃 상태 (서버에서 로드한 설정으로 초기화하여 깜빡임 방지)
  const [widgets, setWidgets] = useState<DashboardWidget[]>(
    () => resolveInitialWidgets(savedPreferences?.widgets)
  )
  const [tempWidgets, setTempWidgets] = useState<DashboardWidget[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Undo 히스토리 (#6)
  const [widgetHistory, setWidgetHistory] = useState<DashboardWidget[][]>([])

  // 위젯 새로고침 표시
  const [refreshingWidgetId, setRefreshingWidgetId] = useState<string | null>(null)

  // 전역 대시보드 상태 (Zustand — 페이지 이동 후에도 유지)
  const {
    isEditMode,
    setEditMode,
    maximizedWidgetId,
    setMaximizedWidgetId,
    kpiPeriod,
    setKpiPeriod,
    autoRefreshEnabled,
    toggleAutoRefresh,
    drilldownWidgetId,
    setDrilldownWidgetId,
  } = useDashboardStore()

  // KPI 기간별 통계
  const { data: kpiStatsData } = useQuery({
    queryKey: queryKeys.dashboard.kpi(kpiPeriod),
    queryFn: () => getKPIStatsByPeriod(kpiPeriod),
    staleTime: 60_000,
    enabled: kpiPeriod !== 'today',
  })

  const activeStats = (kpiPeriod !== 'today' && kpiStatsData?.success && kpiStatsData.stats)
    ? kpiStatsData.stats
    : stats

  // 자동 새로고침 (#5)
  useEffect(() => {
    if (!autoRefreshEnabled) return
    const id = setInterval(() => startTransition(() => router.refresh()), 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [autoRefreshEnabled, router])

  // Undo 핸들러 (ref로 최신 버전 유지)
  const handleUndoRef = useRef<() => void>(() => {})

  const handleUndo = useCallback(() => {
    if (widgetHistory.length === 0) return
    const last = widgetHistory[widgetHistory.length - 1]
    setTempWidgets(last)
    setWidgetHistory(prev => prev.slice(0, -1))
  }, [widgetHistory])

  // ref 항상 최신 상태 유지
  useEffect(() => {
    handleUndoRef.current = handleUndo
  }, [handleUndo])

  // Ctrl+Z 단축키 (#6)
  useEffect(() => {
    if (!isEditMode) return
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndoRef.current()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isEditMode])

  // 히스토리 저장 함수
  const pushHistory = useCallback((snapshot: DashboardWidget[]) => {
    setWidgetHistory(prev => [...prev.slice(-9), snapshot])
  }, [])

  // ── Memoized 계산값 ──────────────────────────────────────────────

  const attendanceRate = useMemo(() => {
    return activeStats.totalStudents > 0
      ? Math.round((activeStats.todayAttendance / activeStats.totalStudents) * 100)
      : 0
  }, [activeStats.totalStudents, activeStats.todayAttendance])

  const upcomingSessions = useMemo(() => {
    return todaySessions.filter((s: TodaySession) => {
      if (s.status === 'completed') return false
      const now = new Date()
      const startTime = new Date(s.scheduled_start)
      const minutesUntilStart = Math.floor((startTime.getTime() - now.getTime()) / 60000)
      return minutesUntilStart >= 0 && minutesUntilStart <= 30
    })
  }, [todaySessions])

  const hasChanges = useMemo(() => {
    if (!isEditMode) return false
    if (tempWidgets.length !== widgets.length) return true
    const widgetMap = new Map(widgets.map(w => [w.id, w]))
    return tempWidgets.some((tempWidget) => {
      const widget = widgetMap.get(tempWidget.id)
      if (!widget) return true
      return (
        tempWidget.visible !== widget.visible ||
        tempWidget.x !== widget.x ||
        tempWidget.y !== widget.y ||
        tempWidget.w !== widget.w ||
        tempWidget.h !== widget.h
      )
    })
  }, [tempWidgets, widgets, isEditMode])

  const hiddenWidgets = useMemo(() => {
    return isEditMode
      ? tempWidgets
          .filter(w => !w.visible)
          .map(w => ({ id: w.id, name: w.title || w.name || w.id }))
      : []
  }, [isEditMode, tempWidgets])

  // 사용자 설정은 서버에서 미리 로드하여 savedPreferences prop으로 전달됨
  // (깜빡임 방지 — 클라이언트 측 비동기 로드 제거)

  // ── 핸들러 ──────────────────────────────────────────────────────

  const handleManualRefresh = useCallback(() => {
    startTransition(() => { router.refresh() })
  }, [router])

  const handleToggleAutoRefresh = useCallback(() => {
    toggleAutoRefresh()
  }, [toggleAutoRefresh])

  const handleEnterEditMode = useCallback(() => {
    const widgetsWithNames = widgets.map(widget => ({
      ...widget,
      name: widget.name || widget.title || widget.id,
    }))
    setTempWidgets(widgetsWithNames)
    setWidgetHistory([])
    setEditMode(true)
  }, [widgets, setEditMode])

  const handleCancelEdit = useCallback(() => {
    setTempWidgets([])
    setWidgetHistory([])
    setEditMode(false)
  }, [setEditMode])

  const handleSaveChanges = useCallback(async () => {
    if (!hasChanges) return
    setIsSaving(true)
    try {
      const result = await saveDashboardPreferences({ widgets: tempWidgets })
      if (!result.success) {
        throw new Error(result.error || 'Failed to save preferences')
      }
      setWidgets(tempWidgets)
      setTempWidgets([])
      setWidgetHistory([])
      setEditMode(false)
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }, [hasChanges, tempWidgets, setEditMode])

  const handleSetWidgetVisibility = useCallback((widgetId: string, visible?: boolean) => {
    pushHistory(tempWidgets)
    setTempWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, visible: visible ?? !widget.visible } : widget
    ))
  }, [tempWidgets, pushHistory])

  const handleApplyPreset = useCallback((presetName: DashboardPreset) => {
    pushHistory(tempWidgets)
    const preset = LAYOUT_PRESETS[presetName]
    if (!preset) return

    const updatedWidgets = DEFAULT_WIDGETS.map(defaultWidget => {
      const presetWidget = preset.widgets.find(w => w.id === defaultWidget.id)
      if (presetWidget) {
        return {
          ...defaultWidget,
          ...presetWidget,
          name: defaultWidget.name,
          requiredFeatures: defaultWidget.requiredFeatures,
        }
      }
      return { ...defaultWidget, visible: false }
    })
    setTempWidgets(updatedWidgets)
  }, [tempWidgets, pushHistory])

  const handleMaximizeWidget = useCallback((id: string) => {
    setMaximizedWidgetId(maximizedWidgetId === id ? null : id)
  }, [maximizedWidgetId, setMaximizedWidgetId])

  const handleRefreshWidget = useCallback((id: string) => {
    setRefreshingWidgetId(id)
    startTransition(() => { router.refresh() })
    setTimeout(() => setRefreshingWidgetId(null), 1500)
  }, [router])

  // ── react-grid-layout 이벤트 ────────────────────────────────────

  // drag/resize 진행 중 플래그 (onLayoutChange에서 중간값 무시용)
  const isInteractingRef = useRef(false)

  // drag/resize 시작 시 히스토리 저장 (변경 전 상태 보존)
  const handleInteractionStart = useCallback(
    () => {
      isInteractingRef.current = true
      pushHistory(tempWidgets)
    },
    [tempWidgets, pushHistory]
  )

  // layout 배열로 tempWidgets의 x,y,w,h 동기화하는 공통 함수
  const syncLayoutToWidgets = useCallback((layout: Layout) => {
    setTempWidgets(prev => {
      let changed = false
      const next = prev.map(w => {
        const l = layout.find(li => li.i === w.id)
        if (!l) return w
        if (w.x === l.x && w.y === l.y && w.w === l.w && w.h === l.h) return w
        changed = true
        return { ...w, x: l.x, y: l.y, w: l.w, h: l.h }
      })
      return changed ? next : prev
    })
  }, [])

  // drag/resize 완료 시 최종값 반영
  const handleInteractionStop = useCallback((layout: Layout) => {
    isInteractingRef.current = false
    syncLayoutToWidgets(layout)
  }, [syncLayoutToWidgets])

  // 레이아웃 변경 시 tempWidgets의 x,y,w,h 동기화
  // (drag/resize 중에는 무시 — stop 핸들러에서 최종값 반영)
  const handleLayoutChange = useCallback((layout: Layout) => {
    if (!isEditMode || isInteractingRef.current) return
    syncLayoutToWidgets(layout)
  }, [isEditMode, syncLayoutToWidgets])

  // ── 그리드 아이템 구성 ──────────────────────────────────────────

  const currentWidgets = isEditMode ? tempWidgets : widgets

  const gridItems = useMemo(() => {
    return currentWidgets
      .filter(w => w.visible || isEditMode)
      .map(w => ({
        i: w.id,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: w.minW ?? 2,
        minH: w.minH ?? 2,
        ...(w.maxW !== undefined && { maxW: w.maxW }),
        ...(w.maxH !== undefined && { maxH: w.maxH }),
        static: !isEditMode,
        isDraggable: isEditMode,
        isResizable: isEditMode,
        visible: w.visible,
      }))
  }, [currentWidgets, isEditMode])

  // ── 위젯 렌더링 ─────────────────────────────────────────────────

  const renderWidget = useCallback((widgetId: DashboardWidgetId) => {
    const widget = currentWidgets.find(w => w.id === widgetId)
    if (!widget) return null

    const isKpiWidget = widgetId.startsWith('kpi-')
    const supportsDrilldown = DRILLDOWN_WIDGET_IDS.has(widgetId)

    const content = renderWidgetContent({
      widgetId,
      stats: activeStats,
      attendanceRate,
      averageScore: activeStats.averageScore,
      completionRate: activeStats.completionRate,
      upcomingSessions,
      recentStudents,
      todaySessions,
      birthdayStudents,
      scheduledConsultations,
      studentAlerts,
      financialData,
      classStatus: classStatus || [],
      parentsToContact: parentsToContact || [],
      calendarEvents: calendarEvents || [],
      activityLogs: activityLogs || [],
      weeklyPerformance,
      isEditMode,
      onDrilldown: supportsDrilldown
        ? () => setDrilldownWidgetId(widgetId as DrilldownWidgetId)
        : undefined,
    })

    if (!content) return null

    const wrapped = (
      <WidgetErrorBoundary widgetId={widgetId} widgetTitle={widget.title || widget.name}>
        {content}
      </WidgetErrorBoundary>
    )

    // 편집 모드: DashboardWidgetWrapper (드래그 핸들 + 숨기기)
    if (isEditMode) {
      return (
        <DashboardWidgetWrapper
          widgetId={widgetId}
          onHide={() => handleSetWidgetVisibility(widgetId, false)}
          disablePadding={isKpiWidget}
        >
          {wrapped}
        </DashboardWidgetWrapper>
      )
    }

    // 보기 모드: KPI가 아닌 위젯은 WidgetWithControls로 감싸기
    if (!isKpiWidget) {
      return (
        <WidgetWithControls
          widgetId={widgetId}
          isMaximized={maximizedWidgetId === widgetId}
          isRefreshing={refreshingWidgetId === widgetId}
          onMaximize={handleMaximizeWidget}
          onRefresh={handleRefreshWidget}
        >
          {wrapped}
        </WidgetWithControls>
      )
    }

    return wrapped
  }, [
    currentWidgets,
    isEditMode,
    activeStats,
    attendanceRate,
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
    maximizedWidgetId,
    refreshingWidgetId,
    handleSetWidgetVisibility,
    handleMaximizeWidget,
    handleRefreshWidget,
    setDrilldownWidgetId,
  ])

  const renderGhostWidget = useCallback((widgetId: DashboardWidgetId) => {
    return (
      <WidgetGhostPlaceholder
        widgetId={widgetId}
        onShow={(id) => handleSetWidgetVisibility(id, true)}
      />
    )
  }, [handleSetWidgetVisibility])

  // ── 렌더 ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6" role="main" aria-labelledby="dashboard-title">
      {/* Welcome Banner */}
      <section aria-label="환영 배너" className="animate-in fade-in-50 slide-in-from-top-2 duration-500">
        <WelcomeBanner />
      </section>

      {/* 헤더 */}
      <DashboardHeader
        title="대시보드"
        description="학원 운영 현황을 한눈에 확인하세요"
        isEditMode={isEditMode}
        onToggleEditMode={handleEnterEditMode}
        onSave={handleSaveChanges}
        onCancel={handleCancelEdit}
        onRefresh={handleManualRefresh}
        hiddenWidgets={hiddenWidgets}
        onAddWidget={(id) => handleSetWidgetVisibility(id, true)}
        onApplyPreset={handleApplyPreset}
        isLoading={isPending}
        isSaving={isSaving}
        hasChanges={hasChanges}
        autoRefreshEnabled={autoRefreshEnabled}
        onToggleAutoRefresh={handleToggleAutoRefresh}
        onUndo={handleUndo}
        canUndo={widgetHistory.length > 0}
      />

      <div className="space-y-3">
        {/* KPI 기간 선택기 (#3) — 보기 모드에서만 표시 */}
        {!isEditMode && (
          <KPIPeriodSelector period={kpiPeriod} onChange={(p) => setKpiPeriod(p)} />
        )}

        {/* 편집 모드 안내 */}
        {isEditMode && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/30 px-4 py-2.5 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-1 duration-300">
            <span>위젯을 드래그하여 이동하거나 우하단 모서리를 드래그하여 크기를 조절할 수 있습니다.</span>
          </div>
        )}

        {/* react-grid-layout */}
        <AutoWidthGridLayout
          layout={gridItems}
          cols={12}
          rowHeight={60}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          compactType={null}
          preventCollision={true}
          maxRows={60}
          measureBeforeMount={false}
          onLayoutChange={handleLayoutChange}
          onDragStart={handleInteractionStart}
          onDragStop={handleInteractionStop}
          onResizeStart={handleInteractionStart}
          onResizeStop={handleInteractionStop}
          draggableHandle=".widget-drag-handle"
          resizeHandles={['se']}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          className={cn(isEditMode && 'edit-mode-grid')}
        >
          {gridItems.map(({ i, visible }) => (
            <div key={i} className="h-full overflow-hidden rounded-lg">
              {visible
                ? renderWidget(i as DashboardWidgetId)
                : renderGhostWidget(i as DashboardWidgetId)}
            </div>
          ))}
        </AutoWidthGridLayout>
      </div>

      {/* 드릴다운 모달 (#8) */}
      {drilldownWidgetId && (
        <WidgetDrilldownDialog
          widgetId={drilldownWidgetId}
          period={kpiPeriod}
          open
          onClose={() => setDrilldownWidgetId(null)}
        />
      )}
    </div>
  )
}
