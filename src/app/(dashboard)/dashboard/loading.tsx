import { DashboardWidgetSkeleton } from "@/components/features/dashboard/dashboard-widget-wrapper"

export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="대시보드 로딩 중">
      <div className="space-y-2">
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted/80" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted/60" />
      </div>

      <div className="animate-in fade-in-50 duration-300">
        <DashboardWidgetSkeleton variant="stats" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardWidgetSkeleton variant="default" />
        <DashboardWidgetSkeleton variant="list" />
      </div>

      <DashboardWidgetSkeleton variant="chart" />
    </div>
  )
}
