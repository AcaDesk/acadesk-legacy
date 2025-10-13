"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Responsive, WidthProvider, Layout } from "react-grid-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Users, Calendar, Trophy, Target, BookOpen, DollarSign,
  RefreshCw, Settings2, Save, X, Eye, EyeOff, GripVertical,
  Maximize2, Minimize2, RotateCw
} from "lucide-react"

// Components
import { DashboardHeader } from "@/components/features/dashboard/dashboard-header"
import { WelcomeBanner } from "@/components/features/dashboard/welcome-banner"
import { KPIWidget } from "@/components/features/dashboard/kpi-widget"
import { TodayTasks } from "@/components/features/dashboard/today-tasks"
import { TodayCommunications } from "@/components/features/dashboard/today-communications"
import { StudentAlerts } from "@/components/features/dashboard/student-alerts"
import { ClassStatus } from "@/components/features/dashboard/class-status"
import { AttendanceSummary } from "@/components/features/dashboard/attendance-summary"
import { WeeklyPerformance } from "@/components/features/dashboard/weekly-performance"
import { RecentStudentsCard } from "@/components/features/dashboard/recent-students-card"
import { CalendarWidget } from "@/components/features/dashboard/calendar-widget"
import { QuickActions } from "@/components/features/dashboard/quick-actions"
import { QuickStats } from "@/components/features/dashboard/quick-stats"
import { RecentActivityFeed } from "@/components/features/dashboard/recent-activity-feed"
import { DEFAULT_WIDGETS, DashboardWidget, isWidgetAvailable, LAYOUT_PRESETS, type DashboardWidgetId, type DashboardPreset } from "@/types/dashboard"
import { useDashboardData, type DashboardData } from "@/hooks/use-dashboard-data"

const ResponsiveGridLayout = WidthProvider(Responsive)

// Grid configuration
const GRID_COLS = { lg: 12, md: 12, sm: 6, xs: 1 }
const GRID_BREAKPOINTS = { lg: 1280, md: 996, sm: 768, xs: 480 }
const ROW_HEIGHT = 80 // pixels

interface GridLayoutItem extends Layout {
  i: string // widget id
}

export function DashboardGridClient({ data: initialData }: { data: DashboardData }) {
  const { data, isRefetching, refetch } = useDashboardData(initialData)
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
    activityLogs
  } = data || initialData

  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditMode, setIsEditMode] = useState(false)
  const [tempLayouts, setTempLayouts] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)
  const [maximizedWidget, setMaximizedWidget] = useState<string | null>(null)
  const [refreshingWidgets, setRefreshingWidgets] = useState<Set<string>>(new Set())

  // Calculate derived values
  const attendanceRate = stats.totalStudents > 0
    ? Math.round((stats.todayAttendance / stats.totalStudents) * 100)
    : 0
  const averageScore = 87 // Mock data
  const completionRate = 89 // Mock data

  const upcomingSessions = todaySessions.filter((s: any) => {
    if (s.status === 'completed') return false
    const now = new Date()
    const startTime = new Date(s.scheduled_start_at)
    const minutesUntilStart = Math.floor((startTime.getTime() - now.getTime()) / 60000)
    return minutesUntilStart <= 30
  })

  // Convert widgets to react-grid-layout format
  const layouts = useMemo(() => {
    const visibleWidgets = widgets.filter(w => w.visible && isWidgetAvailable(w))

    // Generate responsive layouts
    const generateLayout = (colNum: number) => {
      return visibleWidgets.map(widget => {
        // Adjust width for different breakpoints
        let adjustedWidth = widget.w
        if (colNum === 6) { // tablet (sm)
          adjustedWidth = Math.min(widget.w * 2, 6)
        } else if (colNum === 1) { // mobile (xs)
          adjustedWidth = 1
        }

        return {
          i: widget.id,
          x: colNum === 1 ? 0 : widget.x,
          y: widget.y,
          w: adjustedWidth,
          h: widget.h,
          minW: colNum === 1 ? 1 : (widget.minW || 2),
          minH: widget.minH || 1,
          maxW: colNum === 1 ? 1 : widget.maxW,
          maxH: widget.maxH,
          static: false
        }
      })
    }

    return {
      lg: generateLayout(12),
      md: generateLayout(12),
      sm: generateLayout(6),
      xs: generateLayout(1)
    }
  }, [widgets])

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/dashboard/preferences')
        if (response.ok) {
          const { preferences } = await response.json()
          if (preferences?.widgets) {
            const widgetsWithGrid = preferences.widgets.map((widget: any) => {
              const defaultWidget = DEFAULT_WIDGETS.find(w => w.id === widget.id)
              if (defaultWidget) {
                return {
                  ...defaultWidget,
                  ...widget,
                  visible: widget.visible !== undefined ? widget.visible : defaultWidget.visible
                }
              }
              return widget
            })
            setWidgets(widgetsWithGrid)
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

  // Handle layout changes
  const handleLayoutChange = useCallback((layout: Layout[], layouts: any) => {
    if (!isEditMode) return
    setTempLayouts(layouts)
  }, [isEditMode])

  // Save layout changes
  const handleSaveChanges = async () => {
    if (!tempLayouts.lg) return

    setIsSaving(true)

    try {
      // Update widget positions from temp layouts
      const updatedWidgets = widgets.map(widget => {
        const layoutItem = tempLayouts.lg.find((item: Layout) => item.i === widget.id)
        if (layoutItem) {
          return {
            ...widget,
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        }
        return widget
      })

      const response = await fetch('/api/dashboard/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: { widgets: updatedWidgets },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      setWidgets(updatedWidgets)
      setIsEditMode(false)
      setTempLayouts({})
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle widget visibility
  const handleToggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    ))
  }

  // Refresh individual widget
  const handleRefreshWidget = async (widgetId: string) => {
    setRefreshingWidgets(prev => new Set(prev).add(widgetId))

    // Simulate refresh delay (in real app, this would fetch fresh data for specific widget)
    await new Promise(resolve => setTimeout(resolve, 1000))

    // In production, you would refetch specific widget data here
    await refetch()

    setRefreshingWidgets(prev => {
      const newSet = new Set(prev)
      newSet.delete(widgetId)
      return newSet
    })
  }

  // Toggle maximize widget
  const handleMaximizeWidget = (widgetId: string) => {
    if (maximizedWidget === widgetId) {
      setMaximizedWidget(null)
    } else {
      setMaximizedWidget(widgetId)
    }
  }

  // Apply layout preset
  const handleApplyPreset = (presetName: DashboardPreset) => {
    const preset = LAYOUT_PRESETS[presetName]
    if (!preset) return

    // Update widgets with preset configuration
    const updatedWidgets = DEFAULT_WIDGETS.map(defaultWidget => {
      const presetWidget = preset.widgets.find(w => w.id === defaultWidget.id)
      if (presetWidget) {
        return {
          ...defaultWidget,
          ...presetWidget,
        }
      }
      // Hide widgets not in preset
      return {
        ...defaultWidget,
        visible: false,
      }
    })

    setWidgets(updatedWidgets)
    setTempLayouts({}) // Clear temp layouts
  }

  // Render individual widget content
  const renderWidgetContent = (widgetId: DashboardWidgetId) => {
    switch (widgetId) {
      // KPI Widgets
      case 'kpi-total-students':
        return (
          <KPIWidget
            title="전체 학생"
            value={stats.totalStudents}
            change={{ value: 5, isPositive: true, label: "이번 달" }}
            icon={Users}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBgColor="bg-blue-50 dark:bg-blue-950/20"
            href="/students"
          />
        )
      case 'kpi-active-students':
        return (
          <KPIWidget
            title="활동 학생"
            value={stats.todayAttendance}
            change={{ value: 3, isPositive: true, label: "지난주 대비" }}
            icon={Target}
            iconColor="text-green-600 dark:text-green-400"
            iconBgColor="bg-green-50 dark:bg-green-950/20"
            href="/students"
          />
        )
      case 'kpi-attendance-rate':
        return (
          <KPIWidget
            title="출석률"
            value={`${attendanceRate}%`}
            change={{ value: 2, isPositive: true, label: "지난주 대비" }}
            icon={Calendar}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBgColor="bg-purple-50 dark:bg-purple-950/20"
            href="/attendance"
          />
        )
      case 'kpi-average-score':
        return (
          <KPIWidget
            title="평균 성적"
            value={`${averageScore}점`}
            change={{ value: 3, isPositive: true, label: "지난 달 대비" }}
            icon={Trophy}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBgColor="bg-amber-50 dark:bg-amber-950/20"
            href="/grades"
          />
        )
      case 'kpi-completion-rate':
        return (
          <KPIWidget
            title="과제 완료율"
            value={`${completionRate}%`}
            change={{ value: -1, isPositive: false, label: "지난주 대비" }}
            icon={BookOpen}
            iconColor="text-indigo-600 dark:text-indigo-400"
            iconBgColor="bg-indigo-50 dark:bg-indigo-950/20"
            href="/todos"
          />
        )
      case 'kpi-monthly-revenue':
        return financialData?.currentMonthRevenue ? (
          <KPIWidget
            title="이번 달 매출"
            value={`${financialData.currentMonthRevenue.toLocaleString()}원`}
            change={{ value: 12, isPositive: true, label: "지난 달 대비" }}
            icon={DollarSign}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBgColor="bg-emerald-50 dark:bg-emerald-950/20"
            href="/payments"
          />
        ) : null

      // Other widgets
      case 'today-tasks':
        return (
          <TodayTasks
            upcomingSessions={upcomingSessions}
            unsentReports={stats.unsentReports}
            pendingTodos={stats.pendingTodos}
          />
        )
      case 'quick-stats':
        return (
          <QuickStats
            newStudents={5}
            excellentStudents={23}
            needsAttention={3}
          />
        )
      case 'activity-feed':
        return <RecentActivityFeed activities={activityLogs || []} maxItems={10} />
      case 'calendar':
        return <CalendarWidget events={calendarEvents || []} />
      case 'today-communications':
        return (
          <TodayCommunications
            birthdayStudents={birthdayStudents}
            scheduledConsultations={scheduledConsultations}
            parentsToContact={parentsToContact}
          />
        )
      case 'weekly-performance':
        return <WeeklyPerformance />
      case 'student-alerts':
        return (
          <StudentAlerts
            longAbsence={studentAlerts?.longAbsence || []}
            pendingAssignments={studentAlerts?.pendingAssignments || []}
          />
        )
      case 'recent-students':
        return <RecentStudentsCard students={recentStudents} />
      case 'quick-actions':
        return <QuickActions isEditMode={isEditMode} />
      case 'attendance-summary':
        return (
          <AttendanceSummary
            todayAttendance={stats.todayAttendance}
            totalStudents={stats.totalStudents}
            sessions={todaySessions || []}
          />
        )
      case 'class-status':
        return classStatus && classStatus.length > 0 ? <ClassStatus classes={classStatus} /> : null
      default:
        return null
    }
  }

  // Hidden widgets for header
  const hiddenWidgets = isEditMode
    ? widgets
        .filter(w => !w.visible)
        .map(w => ({ id: w.id, name: w.title || w.name || w.id }))
    : []

  const hasChanges = Object.keys(tempLayouts).length > 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="animate-in fade-in-50 slide-in-from-top-2 duration-500">
        <WelcomeBanner
          totalStudents={stats.totalStudents}
          attendanceRate={attendanceRate}
          averageScore={averageScore}
        />
      </div>

      {/* Dashboard Header */}
      <DashboardHeader
        title="대시보드"
        description="학원 운영 현황을 한눈에 확인하세요"
        isEditMode={isEditMode}
        onToggleEditMode={() => {
          setIsEditMode(!isEditMode)
          if (isEditMode && hasChanges) {
            setTempLayouts({}) // Cancel changes
          }
        }}
        onSave={handleSaveChanges}
        onCancel={() => {
          setIsEditMode(false)
          setTempLayouts({})
        }}
        onRefresh={() => refetch()}
        hiddenWidgets={hiddenWidgets}
        onAddWidget={(widgetId) => handleToggleWidget(widgetId)}
        onApplyPreset={handleApplyPreset}
        isLoading={isRefetching}
        isSaving={isSaving}
        hasChanges={hasChanges}
      />

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={GRID_BREAKPOINTS}
        cols={GRID_COLS}
        rowHeight={ROW_HEIGHT}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        resizeHandles={['se', 'sw', 'ne', 'nw']}
        compactType="vertical"
        preventCollision={false}
        margin={[16, 16]}
      >
        {widgets.filter(w => w.visible && isWidgetAvailable(w)).map(widget => {
          const content = renderWidgetContent(widget.id)
          if (!content) return null

          const isRefreshing = refreshingWidgets.has(widget.id)
          const isMaximized = maximizedWidget === widget.id

          return (
            <div key={widget.id} className={cn(
              "h-full",
              isMaximized && "!fixed !inset-4 z-50"
            )}>
              {isEditMode ? (
                <Card className={cn(
                  "h-full relative group border-2 transition-all duration-200",
                  "hover:border-primary/50 hover:shadow-lg",
                  isMaximized && "!h-full"
                )}>
                  {/* Edit Mode Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/5 to-transparent pointer-events-none rounded-lg" />

                  {/* Drag Handle */}
                  {!isMaximized && (
                    <div className="drag-handle absolute top-2 left-2 z-20 cursor-move">
                      <div className={cn(
                        "p-1.5 rounded-md transition-all",
                        "bg-primary/10 border border-primary/20",
                        "hover:bg-primary/20 hover:scale-110"
                      )}>
                        <GripVertical className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  )}

                  {/* Widget Title Bar */}
                  <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
                    <div className={cn(
                      "px-2 py-1 rounded-md text-xs font-medium",
                      "bg-background/90 backdrop-blur-sm border shadow-sm"
                    )}>
                      {widget.name}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleToggleWidget(widget.id)}
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className={cn(
                    "h-full overflow-auto opacity-90",
                    isRefreshing && "opacity-50"
                  )}>
                    {content}
                  </div>
                </Card>
              ) : (
                <Card className={cn(
                  "h-full relative group",
                  isMaximized && "!h-full"
                )}>
                  {/* Widget Controls (visible on hover) */}
                  <div className={cn(
                    "absolute top-2 right-2 z-10 flex items-center gap-1",
                    "opacity-0 group-hover:opacity-100 transition-opacity"
                  )}>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:bg-accent"
                      onClick={() => handleRefreshWidget(widget.id)}
                      disabled={isRefreshing}
                    >
                      {isRefreshing ? (
                        <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:bg-accent"
                      onClick={() => handleMaximizeWidget(widget.id)}
                    >
                      {isMaximized ? (
                        <Minimize2 className="h-3.5 w-3.5" />
                      ) : (
                        <Maximize2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>

                  {/* Maximized backdrop */}
                  {isMaximized && (
                    <div
                      className="fixed inset-0 bg-background/80 backdrop-blur-sm -z-10"
                      onClick={() => handleMaximizeWidget(widget.id)}
                    />
                  )}

                  <div className={cn(
                    "h-full overflow-auto",
                    isRefreshing && "opacity-50 pointer-events-none"
                  )}>
                    {content}
                  </div>
                </Card>
              )}
            </div>
          )
        })}
      </ResponsiveGridLayout>
    </div>
  )
}