"use client"

import { useState, useEffect, useMemo, useCallback, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import ReactGridLayout, { WidthProvider } from "react-grid-layout/legacy"
import type { Layout, LayoutItem } from "react-grid-layout/legacy"
import "react-grid-layout/css/styles.css"
import { DashboardHeader } from "@/components/features/dashboard/dashboard-header"
import { DashboardWidgetWrapper, DashboardWidgetSkeleton } from "@/components/features/dashboard/dashboard-widget-wrapper"
import { WelcomeBanner } from "@/components/features/dashboard/welcome-banner"
import { KPIPeriodSelector } from "@/components/features/dashboard/kpi-period-selector"
import { WidgetGhostPlaceholder } from "@/components/features/dashboard/widget-ghost-placeholder"
import { WidgetDrilldownDialog } from "@/components/features/dashboard/widget-drilldown-dialog"
import { WidgetWithControls } from "@/components/features/dashboard/widget-with-controls"
import {
  DEFAULT_WIDGETS,
  type DashboardWidget,
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
import { saveDashboardPreferences, getDashboardPreferences } from "@/app/actions/dashboard-preferences"
import { getKPIStatsByPeriod, type KPIPeriod } from "@/app/actions/dashboard-kpi"
import type { DrilldownWidgetId } from "@/app/actions/dashboard-drilldown"

const AutoWidthGridLayout = WidthProvider(ReactGridLayout)

// KPI 드릴다운이 지원되는 위젯 ID
const DRILLDOWN_WIDGET_IDS = new Set<string>([
  'kpi-total-students',
  'kpi-attendance-rate',
  'kpi-average-score',
  'kpi-completion-rate',
])

export function DashboardClient({ data: initialData }: { data: DashboardData }) {
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

  // 레이아웃 상태
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [tempWidgets, setTempWidgets] = useState<DashboardWidget[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Undo 히스토리 (#6)
  const [widgetHistory, setWidgetHistory] = useState<DashboardWidget[][]>([])

  // 자동 새로고침 (#5)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('dashboard-auto-refresh') !== 'false'
  })

  // 위젯 컨트롤 (#1 최대화, #4 새로고침)
  const [maximizedWidgetId, setMaximizedWidgetId] = useState<string | null>(null)
  const [refreshingWidgetId, setRefreshingWidgetId] = useState<string | null>(null)

  // KPI 기간 선택 (#3)
  const [kpiPeriod, setKpiPeriod] = useState<KPIPeriod>('today')

  // 드릴다운 (#8)
  const [drilldownWidgetId, setDrilldownWidgetId] = useState<DrilldownWidgetId | null>(null)

  // KPI 기간별 통계
  const { data: kpiStatsData } = useQuery({
    queryKey: ['kpi-stats', kpiPeriod],
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

  const averageScore = useMemo(() => activeStats.averageScore, [activeStats.averageScore])
  const completionRate = useMemo(() => activeStats.completionRate, [activeStats.completionRate])

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
    return tempWidgets.some((tempWidget) => {
      const widget = widgets.find(w => w.id === tempWidget.id)
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

  // ── 사용자 설정 로드 ────────────────────────────────────────────

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const result = await getDashboardPreferences()
        if (result.success && result.preferences?.widgets) {
          const saved = result.preferences.widgets

          // 구버전 레이아웃 감지: react-grid-layout 이전에는 KPI 외 위젯이 h≤2였음
          // 신버전은 h≥4 이상이므로 구버전으로 판단되면 기본 위치로 리셋
          const isLegacyLayout = saved.some(
            (w: DashboardWidget) => !w.id.startsWith('kpi-') && w.visible && w.h <= 2
          )

          if (isLegacyLayout) {
            // 구버전: visible 플래그만 보존하고 나머지는 DEFAULT_WIDGETS 기준으로 리셋
            const visibilityMap = new Map(
              saved
                .filter((w: DashboardWidget) => {
                  const def = DEFAULT_WIDGETS.find(d => d.id === w.id)
                  return def && isWidgetAvailable({ ...w, requiredFeatures: def.requiredFeatures })
                })
                .map((w: DashboardWidget) => [w.id, w.visible])
            )
            const migrated = DEFAULT_WIDGETS.map(def => ({
              ...def,
              visible: visibilityMap.has(def.id)
                ? (visibilityMap.get(def.id) ?? def.visible)
                : def.visible,
            }))
            setWidgets(migrated)
            return
          }

          // 신버전: 저장된 값 그대로 사용
          const widgetsWithNames = saved
            .filter((widget: DashboardWidget) => {
              const defaultWidget = DEFAULT_WIDGETS.find(w => w.id === widget.id)
              if (!defaultWidget) return false
              return isWidgetAvailable({
                ...widget,
                requiredFeatures: defaultWidget.requiredFeatures,
              })
            })
            .map((widget: DashboardWidget) => {
              const defaultWidget = DEFAULT_WIDGETS.find(w => w.id === widget.id)
              return {
                ...widget,
                name: widget.name || defaultWidget?.name || widget.title || widget.id,
                requiredFeatures: defaultWidget?.requiredFeatures,
              }
            })
          const savedWidgetIds = new Set(widgetsWithNames.map((w: DashboardWidget) => w.id))
          const newWidgets = DEFAULT_WIDGETS
            .filter(w => !savedWidgetIds.has(w.id))
            .map(w => ({ ...w, visible: false }))
          setWidgets([...widgetsWithNames, ...newWidgets])
        }
      } catch (error) {
        console.error('Failed to load preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadPreferences()
  }, [])

  // ── 핸들러 ──────────────────────────────────────────────────────

  const handleManualRefresh = useCallback(() => {
    startTransition(() => { router.refresh() })
  }, [router])

  const handleToggleAutoRefresh = useCallback(() => {
    setAutoRefreshEnabled(prev => {
      const next = !prev
      localStorage.setItem('dashboard-auto-refresh', String(next))
      return next
    })
  }, [])

  const handleEnterEditMode = useCallback(() => {
    const widgetsWithNames = widgets.map(widget => ({
      ...widget,
      name: widget.name || widget.title || widget.id,
    }))
    setTempWidgets(widgetsWithNames)
    setWidgetHistory([])
    setIsEditMode(true)
  }, [widgets])

  const handleCancelEdit = useCallback(() => {
    setTempWidgets([])
    setWidgetHistory([])
    setIsEditMode(false)
  }, [])

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
      setIsEditMode(false)
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }, [hasChanges, tempWidgets])

  const handleToggleWidget = useCallback((widgetId: string) => {
    pushHistory(tempWidgets)
    setTempWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    ))
  }, [tempWidgets, pushHistory])

  const handleShowWidget = useCallback((widgetId: string) => {
    pushHistory(tempWidgets)
    setTempWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, visible: true } : widget
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
    setMaximizedWidgetId(prev => (prev === id ? null : id))
  }, [])

  const handleRefreshWidget = useCallback((id: string) => {
    setRefreshingWidgetId(id)
    startTransition(() => { router.refresh() })
    setTimeout(() => setRefreshingWidgetId(null), 1500)
  }, [router])

  // ── react-grid-layout 이벤트 ────────────────────────────────────

  // drag/resize 시작 시 히스토리 저장 (변경 전 상태 보존)
  const handleDragStart = useCallback(
    (_layout: Layout, _oldItem: LayoutItem | null) => { pushHistory(tempWidgets) },
    [tempWidgets, pushHistory]
  )
  const handleResizeStart = useCallback(
    (_layout: Layout, _oldItem: LayoutItem | null) => { pushHistory(tempWidgets) },
    [tempWidgets, pushHistory]
  )

  // 레이아웃 변경 시 tempWidgets의 x,y,w,h 동기화
  const handleLayoutChange = useCallback((layout: Layout) => {
    if (!isEditMode) return
    setTempWidgets(prev => {
      let changed = false
      const next = prev.map(w => {
        const l = layout.find(l => l.i === w.id)
        if (!l) return w
        if (w.x === l.x && w.y === l.y && w.w === l.w && w.h === l.h) return w
        changed = true
        return { ...w, x: l.x, y: l.y, w: l.w, h: l.h }
      })
      return changed ? next : prev
    })
  }, [isEditMode])

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
      averageScore,
      completionRate,
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
          onHide={() => handleToggleWidget(widgetId)}
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
    maximizedWidgetId,
    refreshingWidgetId,
    handleToggleWidget,
    handleMaximizeWidget,
    handleRefreshWidget,
  ])

  const renderGhostWidget = useCallback((widgetId: DashboardWidgetId) => {
    return (
      <WidgetGhostPlaceholder
        widgetId={widgetId}
        onShow={handleShowWidget}
      />
    )
  }, [handleShowWidget])

  // ── 렌더 ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6" role="main" aria-labelledby="dashboard-title">
      {/* Welcome Banner */}
      <section aria-label="환영 배너" className="animate-in fade-in-50 slide-in-from-top-2 duration-500">
        <WelcomeBanner
          totalStudents={activeStats.totalStudents}
          attendanceRate={attendanceRate}
          averageScore={averageScore}
        />
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
        onAddWidget={handleShowWidget}
        onApplyPreset={handleApplyPreset}
        isLoading={isPending}
        isSaving={isSaving}
        hasChanges={hasChanges}
        autoRefreshEnabled={autoRefreshEnabled}
        onToggleAutoRefresh={handleToggleAutoRefresh}
        onUndo={handleUndo}
        canUndo={widgetHistory.length > 0}
      />

      {isLoading ? (
        <div className="space-y-6 animate-in fade-in-50 duration-700">
          <DashboardWidgetSkeleton variant="stats" />
          <DashboardWidgetSkeleton variant="default" />
          <DashboardWidgetSkeleton variant="chart" />
          <DashboardWidgetSkeleton variant="list" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* KPI 기간 선택기 (#3) — 보기 모드에서만 표시 */}
          {!isEditMode && (
            <KPIPeriodSelector period={kpiPeriod} onChange={setKpiPeriod} />
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
            preventCollision={false}
            measureBeforeMount={false}
            onLayoutChange={handleLayoutChange}
            onDragStart={handleDragStart}
            onResizeStart={handleResizeStart}
            draggableHandle=".widget-drag-handle"
            resizeHandles={['se']}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            className={cn(isEditMode && 'edit-mode-grid')}
          >
            {gridItems.map(({ i }) => {
              const widget = currentWidgets.find(w => w.id === i)
              return (
                <div key={i} className="h-full overflow-hidden">
                  {widget?.visible
                    ? renderWidget(i as DashboardWidgetId)
                    : renderGhostWidget(i as DashboardWidgetId)}
                </div>
              )
            })}
          </AutoWidthGridLayout>
        </div>
      )}

      {/* 드릴다운 모달 (#8) */}
      {drilldownWidgetId && (
        <WidgetDrilldownDialog
          widgetId={drilldownWidgetId}
          period={kpiPeriod}
          open={drilldownWidgetId !== null}
          onClose={() => setDrilldownWidgetId(null)}
        />
      )}
    </div>
  )
}
