import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, UserPlus, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { WidgetErrorBoundary } from '@/components/features/dashboard/widget-error-boundary'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'

/**
 * 비동기 최근 활동 피드 (Server Component)
 *
 * 독립적으로 데이터를 fetch하고 Suspense로 스트리밍됩니다.
 * 에러가 발생해도 다른 위젯에 영향을 주지 않습니다.
 */

interface Activity {
  id: string
  activity_type: string
  description: string | null
  created_at: string
  students?: {
    users?: {
      name?: string
    } | null
  } | null
}

function getActivityIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'enrollment':
    case 'registration':
      return UserPlus
    case 'attendance':
    case 'check-in':
      return CheckCircle2
    case 'assignment':
    case 'homework':
      return BookOpen
    case 'alert':
    case 'warning':
      return AlertCircle
    default:
      return Clock
  }
}

function getActivityColor(type: string) {
  switch (type.toLowerCase()) {
    case 'enrollment':
    case 'registration':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    case 'attendance':
    case 'check-in':
      return 'bg-green-500/10 text-green-700 dark:text-green-400'
    case 'assignment':
    case 'homework':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
    case 'alert':
    case 'warning':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return '방금 전'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`

  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

async function RecentActivityFeedContent({ maxItems = 10 }: { maxItems?: number }) {
  const supabase = await createClient()

  const { data: rawActivities, error } = await supabase
    .from('student_activity_logs')
    .select(`
      id,
      activity_type,
      description,
      created_at,
      students (
        users (
          name
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(maxItems)

  if (error) {
    console.error('Failed to fetch activity logs:', error)
    throw new Error('최근 활동을 불러오는데 실패했습니다')
  }

  // Type cast to match our Activity interface
  const activities = rawActivities as unknown as Activity[]

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>최근 활동</CardTitle>
          <CardDescription>학생들의 최근 활동 내역</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">활동 내역이 없습니다</p>
            <p className="text-xs text-muted-foreground">
              학생 활동이 기록되면 여기에 표시됩니다
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>
              최근 {activities.length}개의 활동 내역
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            실시간
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity: Activity) => {
            const Icon = getActivityIcon(activity.activity_type)
            const studentName = activity.students?.users?.name

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className={`p-2 rounded-full ${getActivityColor(activity.activity_type)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {activity.activity_type}
                    </p>
                    {studentName && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-sm text-muted-foreground truncate">
                          {studentName}
                        </p>
                      </>
                    )}
                  </div>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(activity.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 최근 활동 피드 (Wrapper with Suspense & Error Boundary)
 *
 * 사용법:
 * ```tsx
 * <RecentActivityFeedAsync maxItems={10} />
 * ```
 */
export function RecentActivityFeedAsync({ maxItems = 10 }: { maxItems?: number }) {
  return (
    <WidgetErrorBoundary widgetId="recent-activity-feed" widgetTitle="최근 활동 피드">
      <Suspense fallback={<WidgetSkeleton variant="list" />}>
        <RecentActivityFeedContent maxItems={maxItems} />
      </Suspense>
    </WidgetErrorBoundary>
  )
}
