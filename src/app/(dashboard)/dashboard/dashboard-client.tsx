"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { DashboardHeader } from "@/components/features/dashboard/dashboard-header"
import { DashboardEditDialog } from "@/components/features/dashboard/dashboard-edit-dialog"
import { DashboardWidgetWrapper, DashboardWidgetSkeleton } from "@/components/features/dashboard/dashboard-widget-wrapper"
import { WelcomeBanner } from "@/components/features/dashboard/welcome-banner"
import { DEFAULT_WIDGETS, type DashboardWidget, isWidgetAvailable, LAYOUT_PRESETS, type DashboardPreset, type DashboardWidgetId } from "@/types/dashboard"
import { useDashboardData, type DashboardData, type TodaySession } from "@/hooks/use-dashboard-data"
import { renderWidgetContent } from "./widget-factory"
import { WidgetErrorBoundary } from "@/components/features/dashboard/widget-error-boundary"
import { DASHBOARD_LAYOUT, shouldShowSection, getVisibleWidgetsInSection } from "./dashboard-layout-config"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export function DashboardClient({ data: initialData }: { data: DashboardData }) {
  const { data, isRefetching, refetch } = useDashboardData(initialData)
  const { stats, recentStudents, todaySessions, birthdayStudents, scheduledConsultations, studentAlerts, financialData, classStatus, parentsToContact, calendarEvents, activityLogs } = data || initialData
  const { toast } = useToast()

  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

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

  // Visible widget IDs set for quick lookup
  const visibleWidgetIds = useMemo(() => {
    return new Set(
      widgets
        .filter(w => w.visible)
        .map(w => w.id)
    )
  }, [widgets])

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

  // Handlers
  const handleManualRefresh = useCallback(() => {
    refetch()
  }, [refetch])

  const handleOpenEditDialog = useCallback(() => {
    setIsEditDialogOpen(true)
  }, [])

  const handleSaveWidgets = useCallback(async (updatedWidgets: DashboardWidget[]) => {
    setIsSaving(true)

    try {
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
      setIsEditDialogOpen(false)

      toast({
        title: '대시보드 설정 저장 완료',
        description: '변경사항이 성공적으로 저장되었습니다.',
      })
    } catch (error) {
      console.error('Failed to save preferences:', error)
      toast({
        title: '저장 실패',
        description: '대시보드 설정 저장에 실패했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [toast])


  // Render individual widget
  const renderWidget = useCallback((widgetId: DashboardWidgetId) => {
    const widget = widgets.find(w => w.id === widgetId)
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
      isEditMode: false,
    })

    if (!content) return null

    return (
      <WidgetErrorBoundary
        widgetId={widgetId}
        widgetTitle={widget.title || widget.name}
      >
        {content}
      </WidgetErrorBoundary>
    )
  }, [
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
          className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: `${animationDelay}ms` }}
        >
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
  }, [visibleWidgetIds, renderWidget])

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
        isEditMode={false}
        onToggleEditMode={handleOpenEditDialog}
        onRefresh={handleManualRefresh}
        isLoading={isRefetching}
      />

      {isLoading ? (
        <div className="space-y-6 animate-in fade-in-50 duration-700">
          <DashboardWidgetSkeleton variant="stats" />
          <DashboardWidgetSkeleton variant="default" />
          <DashboardWidgetSkeleton variant="chart" />
          <DashboardWidgetSkeleton variant="list" />
        </div>
      ) : (
        <div className="space-y-6">
          {DASHBOARD_LAYOUT.map((section, index) =>
            shouldShowSection(section, visibleWidgetIds) && renderSection(section, index)
          )}
        </div>
      )}

      {/* Dashboard Edit Dialog */}
      <DashboardEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        widgets={widgets}
        onSave={handleSaveWidgets}
      />
    </div>
  )
}
