"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { DashboardHeader } from "@/components/features/dashboard/dashboard-header"
import { DashboardWidgetWrapper, DashboardWidgetSkeleton } from "@/components/features/dashboard/dashboard-widget-wrapper"
import { WelcomeBanner } from "@/components/features/dashboard/welcome-banner"
import { DEFAULT_WIDGETS, type DashboardWidget, isWidgetAvailable, LAYOUT_PRESETS, type DashboardPreset, type DashboardWidgetId } from "@/types/dashboard"
import { useDashboardData, type DashboardData, type TodaySession } from "@/hooks/use-dashboard-data"
import { renderWidgetContent } from "./widget-factory"
import { WidgetErrorBoundary } from "@/components/features/dashboard/widget-error-boundary"
import { DASHBOARD_LAYOUT, shouldShowSection, getVisibleWidgetsInSection } from "./dashboard-layout-config"
import { cn } from "@/lib/utils"
import { saveDashboardPreferences } from "@/app/actions/dashboard-preferences"
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"

export function DashboardClient({ data: initialData }: { data: DashboardData }) {
  const { data, isRefetching, refetch } = useDashboardData(initialData)
  const { stats, recentStudents, todaySessions, birthdayStudents, scheduledConsultations, studentAlerts, financialData, classStatus, parentsToContact, calendarEvents, activityLogs } = data || initialData

  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [tempWidgets, setTempWidgets] = useState<DashboardWidget[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Memoized computed values
  const attendanceRate = useMemo(() => {
    return stats.totalStudents > 0
      ? Math.round((stats.todayAttendance / stats.totalStudents) * 100)
      : 0
  }, [stats.totalStudents, stats.todayAttendance])

  const averageScore = useMemo(() => 87, []) // Mock
  const completionRate = useMemo(() => 89, []) // Mock

  const upcomingSessions = useMemo(() => {
    return todaySessions.filter((s: TodaySession) => {
      if (s.status === 'completed') return false
      const now = new Date()
      const startTime = new Date(s.scheduled_start)
      const minutesUntilStart = Math.floor((startTime.getTime() - now.getTime()) / 60000)
      return minutesUntilStart <= 30
    })
  }, [todaySessions])

  const hasChanges = useMemo(() => {
    if (!isEditMode) return false
    if (tempWidgets.length !== widgets.length) return true
    return tempWidgets.some((tempWidget) => {
      const widget = widgets.find(w => w.id === tempWidget.id)
      if (!widget) return true
      return tempWidget.visible !== widget.visible || tempWidget.order !== widget.order
    })
  }, [tempWidgets, widgets, isEditMode])

  // Visible widget IDs set for quick lookup
  const visibleWidgetIds = useMemo(() => {
    const currentWidgets = isEditMode ? tempWidgets : widgets
    return new Set(
      currentWidgets
        .filter(w => w.visible)
        .map(w => w.id)
    )
  }, [isEditMode, tempWidgets, widgets])

  // Hidden widgets for header
  const hiddenWidgets = useMemo(() => {
    return isEditMode
      ? tempWidgets
          .filter(w => !w.visible)
          .map(w => ({ id: w.id, name: w.title || w.name || w.id }))
      : []
  }, [isEditMode, tempWidgets])

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/dashboard/preferences')
        if (response.ok) {
          const { preferences } = await response.json()
          if (preferences?.widgets) {
            const widgetsWithNames = preferences.widgets
              .filter((widget: DashboardWidget) => {
                const defaultWidget = DEFAULT_WIDGETS.find(w => w.id === widget.id)
                if (!defaultWidget) return false
                return isWidgetAvailable({
                  ...widget,
                  requiredFeatures: defaultWidget.requiredFeatures
                })
              })
              .map((widget: DashboardWidget) => {
                const defaultWidget = DEFAULT_WIDGETS.find(w => w.id === widget.id)
                return {
                  ...widget,
                  name: widget.name || defaultWidget?.name || widget.title || widget.id,
                  requiredFeatures: defaultWidget?.requiredFeatures
                }
              })
            setWidgets(widgetsWithNames)
          }
        }
      } catch (error) {
        console.error('Failed to load preferences:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadPreferences()
  }, [])

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handlers
  const handleManualRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  const handleEnterEditMode = useCallback(() => {
    const widgetsWithNames = widgets.map(widget => ({
      ...widget,
      name: widget.name || widget.title || widget.id
    }))
    setTempWidgets(widgetsWithNames)
    setIsEditMode(true)
  }, [widgets])

  const handleCancelEdit = useCallback(() => {
    setTempWidgets([])
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
      setIsEditMode(false)
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }, [hasChanges, tempWidgets])

  const handleToggleWidget = useCallback((widgetId: string) => {
    setTempWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    ))
  }, [])

  const handleShowWidget = useCallback((widgetId: string) => {
    setTempWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, visible: true } : widget
    ))
  }, [])

  const handleApplyPreset = useCallback((presetName: DashboardPreset) => {
    const preset = LAYOUT_PRESETS[presetName]
    if (!preset) return

    const updatedWidgets = DEFAULT_WIDGETS.map(defaultWidget => {
      const presetWidget = preset.widgets.find(w => w.id === defaultWidget.id)
      if (presetWidget) {
        return {
          ...defaultWidget,
          ...presetWidget,
          name: defaultWidget.name,
          requiredFeatures: defaultWidget.requiredFeatures
        }
      }
      return {
        ...defaultWidget,
        visible: false,
      }
    })

    setTempWidgets(updatedWidgets)
  }, [])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    setTempWidgets((widgets) => {
      const oldIndex = widgets.findIndex(w => w.id === active.id)
      const newIndex = widgets.findIndex(w => w.id === over.id)

      const newWidgets = arrayMove(widgets, oldIndex, newIndex)

      // Update order values
      return newWidgets.map((widget, index) => ({
        ...widget,
        order: index
      }))
    })
  }, [])


  // Render individual widget
  const renderWidget = useCallback((widgetId: DashboardWidgetId) => {
    const currentWidgets = isEditMode ? tempWidgets : widgets
    const widget = currentWidgets.find(w => w.id === widgetId)
    if (!widget || !widget.visible) return null

    const content = renderWidgetContent({
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
      classStatus: classStatus || [],
      parentsToContact: parentsToContact || [],
      calendarEvents: calendarEvents || [],
      activityLogs: activityLogs || [],
      isEditMode,
    })

    if (!content) return null

    const wrappedContent = (
      <WidgetErrorBoundary
        widgetId={widgetId}
        widgetTitle={widget.title || widget.name}
      >
        {content}
      </WidgetErrorBoundary>
    )

    if (isEditMode) {
      return (
        <DashboardWidgetWrapper
          widgetId={widgetId}
          isEditMode={true}
          onHide={() => handleToggleWidget(widgetId)}
          disablePadding={widgetId.startsWith('kpi-')}
        >
          {wrappedContent}
        </DashboardWidgetWrapper>
      )
    }

    return wrappedContent
  }, [
    isEditMode,
    tempWidgets,
    widgets,
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
    handleToggleWidget
  ])

  // Render layout section
  const renderSection = useCallback((section: typeof DASHBOARD_LAYOUT[0], sectionIndex: number) => {
    const visibleWidgets = getVisibleWidgetsInSection(section, visibleWidgetIds)
    if (visibleWidgets.length === 0) return null

    const animationDelay = sectionIndex * 100

    if (section.type === 'kpi-grid') {
      return (
        <div
          key={`section-${sectionIndex}`}
          className={cn(
            "animate-in fade-in-50 slide-in-from-bottom-2 duration-500",
            isEditMode && "bg-accent/30 border-2 border-dashed border-primary/50 rounded-lg p-4"
          )}
          style={{ animationDelay: `${animationDelay}ms` }}
        >
          {isEditMode && (
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">KPI 카드 영역</h3>
              <p className="text-xs text-muted-foreground">개별 카드를 숨기거나 표시할 수 있습니다</p>
            </div>
          )}
          <div className={section.className}>
            {visibleWidgets.map(widgetId => (
              <div key={widgetId}>
                {renderWidget(widgetId)}
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (section.type === 'two-column') {
      return (
        <div
          key={`section-${sectionIndex}`}
          className={cn(
            section.className,
            "animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
          )}
          style={{ animationDelay: `${animationDelay}ms` }}
        >
          {visibleWidgets.map(widgetId => (
            <div key={widgetId}>
              {renderWidget(widgetId)}
            </div>
          ))}
        </div>
      )
    }

    // full-width
    return (
      <div
        key={`section-${sectionIndex}`}
        className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: `${animationDelay}ms` }}
      >
        {visibleWidgets.map(widgetId => (
          <div key={widgetId}>
            {renderWidget(widgetId)}
          </div>
        ))}
      </div>
    )
  }, [isEditMode, visibleWidgetIds, renderWidget])

  return (
    <div className="space-y-6" role="main" aria-labelledby="dashboard-title">
      {/* Welcome Banner */}
      <section aria-label="환영 배너" className="animate-in fade-in-50 slide-in-from-top-2 duration-500">
        <WelcomeBanner
          totalStudents={stats.totalStudents}
          attendanceRate={attendanceRate}
          averageScore={averageScore}
        />
      </section>

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
        isLoading={isRefetching}
        isSaving={isSaving}
        hasChanges={hasChanges}
      />

      {isLoading ? (
        <div className="space-y-6 animate-in fade-in-50 duration-700">
          <DashboardWidgetSkeleton variant="stats" />
          <DashboardWidgetSkeleton variant="default" />
          <DashboardWidgetSkeleton variant="chart" />
          <DashboardWidgetSkeleton variant="list" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={isEditMode ? tempWidgets.map(w => w.id) : widgets.map(w => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {DASHBOARD_LAYOUT.map((section, index) =>
                shouldShowSection(section, visibleWidgetIds) && renderSection(section, index)
              )}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="opacity-50">
                {renderWidget(activeId as DashboardWidgetId)}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
