"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Users, TrendingUp, Calendar, FileText, GripVertical, Trophy } from "lucide-react"
import { DashboardHeader } from "@/components/features/dashboard/dashboard-header"
import { WidgetDragOverlay } from "@/components/features/dashboard/widget-drag-overlay"
import { DashboardWidgetWrapper, DashboardWidgetSkeleton } from "@/components/features/dashboard/dashboard-widget-wrapper"
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
import { WelcomeBanner } from "@/components/features/dashboard/welcome-banner"
import { QuickStats } from "@/components/features/dashboard/quick-stats"
import { RecentActivityFeed } from "@/components/features/dashboard/recent-activity-feed"
import { KPICardsGrid } from "@/components/features/dashboard/kpi-cards"
import { WidgetWithControls } from "@/components/features/dashboard/widget-with-controls"
import { DEFAULT_WIDGETS, DashboardWidget, isWidgetAvailable, LAYOUT_PRESETS, type DashboardPreset } from "@/types/dashboard"
import { useDashboardData, type DashboardData } from "@/hooks/use-dashboard-data"
import { cn } from "@/lib/utils"
import { renderWidgetContent } from "./widget-factory"
import { WidgetErrorBoundary } from "@/components/features/dashboard/widget-error-boundary"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  rectIntersection,
  useDroppable,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"


// Droppable Column Component for Edit Mode
function DroppableColumn({
  id,
  widgets,
  children
}: {
  id: string
  widgets: DashboardWidget[]
  children: React.ReactNode
}) {
  const { setNodeRef, isOver, active } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[400px] rounded-lg space-y-6 p-3",
        "transition-all duration-300 ease-out",
        "animate-in fade-in slide-in-from-bottom-2",
        isOver && "bg-accent ring-2 ring-primary scale-[1.01] shadow-lg",
        !isOver && active && "bg-muted/30 ring-1 ring-border"
      )}
    >
      <SortableContext
        items={widgets.map(w => w.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4 transition-all duration-200">
          {children}
        </div>
      </SortableContext>
    </div>
  )
}

export function DashboardClient({ data: initialData }: { data: DashboardData }) {
  const { data, isRefetching, refetch } = useDashboardData(initialData)
  const { stats, recentStudents, todaySessions, birthdayStudents, scheduledConsultations, studentAlerts, financialData, classStatus, parentsToContact, calendarEvents, activityLogs } = data || initialData
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS)
  const [isLoading, setIsLoading] = useState(true)

  // States for inline editing with temporary state pattern
  const [isEditMode, setIsEditMode] = useState(false)
  const [tempWidgets, setTempWidgets] = useState<DashboardWidget[]>([])
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // New feature states
  const [maximizedWidget, setMaximizedWidget] = useState<string | null>(null)
  const [refreshingWidgets, setRefreshingWidgets] = useState<Set<string>>(new Set())

  // Compute hasChanges by comparing tempWidgets with widgets
  const hasChanges = useMemo(() => {
    if (!isEditMode) return false
    if (tempWidgets.length !== widgets.length) return true

    return tempWidgets.some((tempWidget, index) => {
      const widget = widgets.find(w => w.id === tempWidget.id)
      if (!widget) return true

      return (
        tempWidget.visible !== widget.visible ||
        tempWidget.order !== widget.order ||
        tempWidget.column !== widget.column
      )
    })
  }, [tempWidgets, widgets, isEditMode])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/dashboard/preferences')
        if (response.ok) {
          const { preferences } = await response.json()
          if (preferences?.widgets) {
            // Ensure all widgets have a 'name' property and are feature-flagged
            const widgetsWithNames = preferences.widgets
              .filter((widget: DashboardWidget) => {
                // Find default widget to check feature requirements
                const defaultWidget = DEFAULT_WIDGETS.find(w => w.id === widget.id)
                if (!defaultWidget) return false

                // Apply feature flag filtering
                return isWidgetAvailable({
                  ...widget,
                  requiredFeatures: defaultWidget.requiredFeatures
                })
              })
              .map((widget: DashboardWidget) => {
                if (!widget.name) {
                  // Find the default widget to get the name
                  const defaultWidget = DEFAULT_WIDGETS.find(w => w.id === widget.id)
                  return {
                    ...widget,
                    name: defaultWidget?.name || widget.title || widget.id,
                    requiredFeatures: defaultWidget?.requiredFeatures
                  }
                }
                const defaultWidget = DEFAULT_WIDGETS.find(w => w.id === widget.id)
                return {
                  ...widget,
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

  const handleManualRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  // Memoize computed values to prevent unnecessary recalculations
  const upcomingSessions = useMemo(() => {
    return todaySessions.filter((s: any) => {
      if (s.status === 'completed') return false
      const now = new Date()
      const startTime = new Date(s.scheduled_start_at)
      const minutesUntilStart = Math.floor((startTime.getTime() - now.getTime()) / 60000)
      return minutesUntilStart <= 30
    })
  }, [todaySessions])

  // Edit mode handlers with temporary state pattern (memoized)
  const handleEnterEditMode = useCallback(() => {
    // Initialize temporary widgets with current widgets
    const widgetsWithNames = widgets.map(widget => ({
      ...widget,
      name: widget.name || widget.title || widget.id
    }))
    setTempWidgets(widgetsWithNames)
    setIsEditMode(true)
  }, [widgets])

  const handleCancelEdit = useCallback(() => {
    // Discard temporary changes
    setTempWidgets([])
    setIsEditMode(false)
    setActiveId(null)
  }, [])

  const handleSaveChanges = useCallback(async () => {
    if (!hasChanges) return

    setIsSaving(true)

    try {
      const response = await fetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: { widgets: tempWidgets },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      // Commit temporary changes to actual widgets
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

  // Handle individual widget refresh (memoized)
  const handleRefreshWidget = useCallback(async (widgetId: string) => {
    setRefreshingWidgets(prev => new Set(prev).add(widgetId))

    try {
      await refetch()
    } finally {
      setTimeout(() => {
        setRefreshingWidgets(prev => {
          const newSet = new Set(prev)
          newSet.delete(widgetId)
          return newSet
        })
      }, 300) // Small delay for visual feedback
    }
  }, [refetch])

  // Handle widget maximize/minimize (memoized)
  const handleMaximizeWidget = useCallback((widgetId: string) => {
    setMaximizedWidget(prev => prev === widgetId ? null : widgetId)
  }, [])

  // Handle layout preset application (memoized)
  const handleApplyPreset = useCallback((presetName: DashboardPreset) => {
    const preset = LAYOUT_PRESETS[presetName]
    if (!preset) return

    // Update temp widgets with preset configuration
    const updatedWidgets = DEFAULT_WIDGETS.map(defaultWidget => {
      const presetWidget = preset.widgets.find(w => w.id === defaultWidget.id)
      if (presetWidget) {
        return {
          ...defaultWidget,
          ...presetWidget,
          name: defaultWidget.name, // Preserve name
          requiredFeatures: defaultWidget.requiredFeatures // Preserve feature flags
        }
      }
      // Hide widgets not in preset
      return {
        ...defaultWidget,
        visible: false,
      }
    })

    setTempWidgets(updatedWidgets)
  }, [])

  // Drag handlers (memoized)
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeId = active.id.toString()
    const overId = over.id.toString()

    setTempWidgets(prev => {
      const visibleWidgets = prev.filter(w => w.visible)
      const activeIndex = visibleWidgets.findIndex(w => w.id === activeId)
      const overIndex = visibleWidgets.findIndex(w => w.id === overId)

      if (activeIndex === -1 || overIndex === -1) return prev

      // Reorder visible widgets
      const reordered = arrayMove(visibleWidgets, activeIndex, overIndex)

      // Update order values
      const newWidgets = [...prev]
      reordered.forEach((widget, index) => {
        const widgetIndex = newWidgets.findIndex(w => w.id === widget.id)
        if (widgetIndex !== -1) {
          newWidgets[widgetIndex] = {
            ...newWidgets[widgetIndex],
            order: index
          }
        }
      })

      return newWidgets
    })
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
  }, [])

  // Calculate completion rate (memoized)
  const completionRate = useMemo(() => 89, []) // Mock data - should come from backend

  // Calculate attendance rate for welcome banner (memoized)
  const attendanceRate = useMemo(() => {
    return stats.totalStudents > 0
      ? Math.round((stats.todayAttendance / stats.totalStudents) * 100)
      : 0
  }, [stats.totalStudents, stats.todayAttendance])

  // Calculate average score (memoized, mock data for now)
  const averageScore = useMemo(() => 87, [])

  // Memoized widget rendering function
  const renderWidget = useCallback((widgetId: string) => {
    const widget = (isEditMode ? tempWidgets : widgets).find(w => w.id === widgetId)
    if (!widget || !widget.visible) return null

    // Use the widget factory to get content
    const content = renderWidgetContent({
      widgetId: widgetId as any,
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
    })

    if (!content) return null

    // Wrap content with error boundary
    const wrappedContent = (
      <WidgetErrorBoundary
        widgetId={widgetId}
        widgetTitle={widget.title || widget.name}
      >
        {content}
      </WidgetErrorBoundary>
    )

    // Edit mode rendering with drag & drop wrapper
    if (isEditMode) {
      const widgetIndex = tempWidgets.findIndex(w => w.id === widgetId)
      const animationDelay = widgetIndex * 75

      return (
        <DashboardWidgetWrapper
          widgetId={widgetId}
          isEditMode={isEditMode}
          onHide={() => handleToggleWidget(widgetId)}
          disablePadding={widgetId.startsWith('kpi-')}
        >
          {wrappedContent}
        </DashboardWidgetWrapper>
      )
    }

    // View mode - 동일한 컨텐츠를 보여주되 드래그 불가
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

  // Memoized column widgets (legacy, not currently used in view mode)
  const leftColumnWidgets = useMemo(() => {
    return (isEditMode ? tempWidgets : widgets)
      .filter(w => w.column === 'left')
      .sort((a, b) => a.order - b.order)
  }, [isEditMode, tempWidgets, widgets])

  const rightColumnWidgets = useMemo(() => {
    return (isEditMode ? tempWidgets : widgets)
      .filter(w => w.column === 'right')
      .sort((a, b) => a.order - b.order)
  }, [isEditMode, tempWidgets, widgets])

  // Memoized active widget for drag overlay
  const activeWidget = useMemo(() => {
    return activeId ? tempWidgets.find(w => w.id === activeId) : null
  }, [activeId, tempWidgets])

  // Memoized hidden widgets for header
  const hiddenWidgets = useMemo(() => {
    return isEditMode
      ? tempWidgets
          .filter(w => !w.visible)
          .map(w => ({ id: w.id, name: w.title || w.name || w.id }))
      : []
  }, [isEditMode, tempWidgets])

  return (
    <div className="space-y-6" role="main" aria-labelledby="dashboard-title">
      {/* Welcome Banner - Always shown above everything */}
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
        // Skeleton loaders for better perceived performance
        <div className="space-y-6 animate-in fade-in-50 duration-700">
          <DashboardWidgetSkeleton variant="stats" />
          <DashboardWidgetSkeleton variant="default" />
          <DashboardWidgetSkeleton variant="chart" />
          <DashboardWidgetSkeleton variant="list" />
        </div>
      ) : isEditMode ? (
        // Edit mode - 보기 모드와 동일한 레이아웃 (드래그 가능)
        <div className="space-y-6">
          {/* KPI Cards Grid - Edit Mode */}
          <div className="bg-accent/30 border-2 border-dashed border-primary/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">KPI 카드 영역</h3>
              <p className="text-xs text-muted-foreground">개별 KPI 카드는 설정에서 관리할 수 있습니다</p>
            </div>
            <KPICardsGrid
              totalStudents={stats.totalStudents}
              activeStudents={stats.todayAttendance}
              attendanceRate={attendanceRate}
              averageScore={averageScore}
              completionRate={89}
              monthlyRevenue={financialData?.currentMonthRevenue}
            />
          </div>

          {/* Grid for Today Tasks and Quick Stats - Edit Mode */}
          <div className="grid gap-6 md:grid-cols-2">
            <DashboardWidgetWrapper
              widgetId="today-tasks"
              isEditMode={true}
              onHide={() => handleToggleWidget("today-tasks")}
              disablePadding={false}
            >
              <TodayTasks
                upcomingSessions={upcomingSessions}
                unsentReports={stats.unsentReports}
                pendingTodos={stats.pendingTodos}
              />
            </DashboardWidgetWrapper>

            <DashboardWidgetWrapper
              widgetId="quick-stats"
              isEditMode={true}
              onHide={() => handleToggleWidget("quick-stats")}
              disablePadding={false}
            >
              <QuickStats
                newStudents={5}
                excellentStudents={23}
                needsAttention={3}
              />
            </DashboardWidgetWrapper>
          </div>

          {/* Recent Activity Feed - Edit Mode */}
          <DashboardWidgetWrapper
            widgetId="activity-feed"
            isEditMode={true}
            onHide={() => handleToggleWidget("activity-feed")}
            disablePadding={false}
          >
            <RecentActivityFeed activities={activityLogs || []} maxItems={10} />
          </DashboardWidgetWrapper>

          {/* Grid for Calendar and Communications - Edit Mode */}
          <div className="grid gap-6 md:grid-cols-2">
            <DashboardWidgetWrapper
              widgetId="calendar"
              isEditMode={true}
              onHide={() => handleToggleWidget("calendar")}
              disablePadding={false}
            >
              <CalendarWidget events={calendarEvents || []} />
            </DashboardWidgetWrapper>

            <DashboardWidgetWrapper
              widgetId="today-communications"
              isEditMode={true}
              onHide={() => handleToggleWidget("today-communications")}
              disablePadding={false}
            >
              <TodayCommunications
                birthdayStudents={birthdayStudents}
                scheduledConsultations={scheduledConsultations}
                parentsToContact={parentsToContact}
              />
            </DashboardWidgetWrapper>
          </div>

          {/* Weekly Performance - Edit Mode */}
          <DashboardWidgetWrapper
            widgetId="weekly-performance"
            isEditMode={true}
            onHide={() => handleToggleWidget("weekly-performance")}
            disablePadding={false}
          >
            <WeeklyPerformance />
          </DashboardWidgetWrapper>

          {/* Grid for Student Alerts and Recent Students - Edit Mode */}
          <div className="grid gap-6 md:grid-cols-2">
            <DashboardWidgetWrapper
              widgetId="student-alerts"
              isEditMode={true}
              onHide={() => handleToggleWidget("student-alerts")}
              disablePadding={false}
            >
              <StudentAlerts
                longAbsence={studentAlerts?.longAbsence || []}
                pendingAssignments={studentAlerts?.pendingAssignments || []}
              />
            </DashboardWidgetWrapper>

            <DashboardWidgetWrapper
              widgetId="recent-students"
              isEditMode={true}
              onHide={() => handleToggleWidget("recent-students")}
              disablePadding={false}
            >
              <RecentStudentsCard students={recentStudents} />
            </DashboardWidgetWrapper>
          </div>

          {/* Quick Actions - Edit Mode */}
          <DashboardWidgetWrapper
            widgetId="quick-actions"
            isEditMode={true}
            onHide={() => handleToggleWidget("quick-actions")}
            disablePadding={false}
          >
            <QuickActions isEditMode={true} />
          </DashboardWidgetWrapper>
        </div>
      ) : (
        // View mode - 정교한 레이아웃 유지
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            <KPICardsGrid
              totalStudents={stats.totalStudents}
              activeStudents={stats.todayAttendance}
              attendanceRate={attendanceRate}
              averageScore={averageScore}
              completionRate={89}
              monthlyRevenue={financialData?.currentMonthRevenue}
            />
          </div>

          {/* Grid for Today Tasks and Quick Stats */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="animate-in fade-in-50 slide-in-from-left-2 duration-500" style={{ animationDelay: "100ms" }}>
              <WidgetWithControls
                widgetId="today-tasks"
                isRefreshing={refreshingWidgets.has("today-tasks")}
                isMaximized={maximizedWidget === "today-tasks"}
                onRefresh={handleRefreshWidget}
                onMaximize={handleMaximizeWidget}
              >
                <TodayTasks
                  upcomingSessions={upcomingSessions}
                  unsentReports={stats.unsentReports}
                  pendingTodos={stats.pendingTodos}
                />
              </WidgetWithControls>
            </div>
            <div className="animate-in fade-in-50 slide-in-from-right-2 duration-500" style={{ animationDelay: "150ms" }}>
              <WidgetWithControls
                widgetId="quick-stats"
                isRefreshing={refreshingWidgets.has("quick-stats")}
                isMaximized={maximizedWidget === "quick-stats"}
                onRefresh={handleRefreshWidget}
                onMaximize={handleMaximizeWidget}
              >
                <QuickStats
                  newStudents={5}
                  excellentStudents={23}
                  needsAttention={3}
                />
              </WidgetWithControls>
            </div>
          </div>

          {/* Recent Activity Feed - Main Feature */}
          <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500" style={{ animationDelay: "200ms" }}>
            <WidgetWithControls
              widgetId="activity-feed"
              isRefreshing={refreshingWidgets.has("activity-feed")}
              isMaximized={maximizedWidget === "activity-feed"}
              onRefresh={handleRefreshWidget}
              onMaximize={handleMaximizeWidget}
            >
              <RecentActivityFeed activities={activityLogs || []} maxItems={10} />
            </WidgetWithControls>
          </div>

          {/* Grid for Calendar and Communications */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="animate-in fade-in-50 slide-in-from-left-2 duration-500" style={{ animationDelay: "250ms" }}>
              <WidgetWithControls
                widgetId="calendar"
                isRefreshing={refreshingWidgets.has("calendar")}
                isMaximized={maximizedWidget === "calendar"}
                onRefresh={handleRefreshWidget}
                onMaximize={handleMaximizeWidget}
              >
                <CalendarWidget events={calendarEvents || []} />
              </WidgetWithControls>
            </div>
            <div className="animate-in fade-in-50 slide-in-from-right-2 duration-500" style={{ animationDelay: "300ms" }}>
              <WidgetWithControls
                widgetId="today-communications"
                isRefreshing={refreshingWidgets.has("today-communications")}
                isMaximized={maximizedWidget === "today-communications"}
                onRefresh={handleRefreshWidget}
                onMaximize={handleMaximizeWidget}
              >
                <TodayCommunications
                  birthdayStudents={birthdayStudents}
                  scheduledConsultations={scheduledConsultations}
                  parentsToContact={parentsToContact}
                />
              </WidgetWithControls>
            </div>
          </div>

          {/* Weekly Performance */}
          <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500" style={{ animationDelay: "350ms" }}>
            <WidgetWithControls
              widgetId="weekly-performance"
              isRefreshing={refreshingWidgets.has("weekly-performance")}
              isMaximized={maximizedWidget === "weekly-performance"}
              onRefresh={handleRefreshWidget}
              onMaximize={handleMaximizeWidget}
            >
              <WeeklyPerformance />
            </WidgetWithControls>
          </div>

          {/* Grid for Student Alerts and Recent Students */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="animate-in fade-in-50 slide-in-from-left-2 duration-500" style={{ animationDelay: "400ms" }}>
              <WidgetWithControls
                widgetId="student-alerts"
                isRefreshing={refreshingWidgets.has("student-alerts")}
                isMaximized={maximizedWidget === "student-alerts"}
                onRefresh={handleRefreshWidget}
                onMaximize={handleMaximizeWidget}
              >
                <StudentAlerts
                  longAbsence={studentAlerts?.longAbsence || []}
                  pendingAssignments={studentAlerts?.pendingAssignments || []}
                />
              </WidgetWithControls>
            </div>
            <div className="animate-in fade-in-50 slide-in-from-right-2 duration-500" style={{ animationDelay: "450ms" }}>
              <WidgetWithControls
                widgetId="recent-students"
                isRefreshing={refreshingWidgets.has("recent-students")}
                isMaximized={maximizedWidget === "recent-students"}
                onRefresh={handleRefreshWidget}
                onMaximize={handleMaximizeWidget}
              >
                <RecentStudentsCard students={recentStudents} />
              </WidgetWithControls>
            </div>
          </div>

          {/* Quick Actions at the bottom */}
          <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500" style={{ animationDelay: "500ms" }}>
            <QuickActions isEditMode={false} />
          </div>
        </div>
      )}
    </div>
  )
}