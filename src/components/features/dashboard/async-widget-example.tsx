import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '@/components/ui/error-fallback'
import { Users, TrendingUp, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

/**
 * 예제: 비동기 데이터를 가져오는 Server Component 위젯
 *
 * 이 컴포넌트는 Suspense와 Error Boundary를 활용한 세분화된 에러 처리 예제입니다.
 * 각 위젯이 독립적으로 데이터를 fetch하고, 에러나 로딩 상태를 개별적으로 처리합니다.
 */

// ============================================================================
// 개별 위젯 컴포넌트들 (각각 독립적으로 데이터 fetch)
// ============================================================================

/**
 * 학생 통계 위젯 (비동기)
 */
async function StudentStatsWidget() {
  // 데이터 fetching을 시뮬레이션하기 위한 지연
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const supabase = await createClient()
  const { count, error } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  if (error) {
    throw new Error('학생 데이터를 불러오는데 실패했습니다')
  }

  const totalStudents = count ?? 0

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">전체 학생</p>
            <p className="text-2xl font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">+5.2%</span>
              <span>지난 달 대비</span>
            </p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 최근 활동 위젯 (비동기)
 */
async function RecentActivityWidget() {
  // 데이터 fetching을 시뮬레이션하기 위한 지연
  await new Promise((resolve) => setTimeout(resolve, 1500))

  const supabase = await createClient()
  const { data: activities, error } = await supabase
    .from('student_activity_logs')
    .select('id, activity_type, description, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    throw new Error('활동 로그를 불러오는데 실패했습니다')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 활동</CardTitle>
        <CardDescription>학생들의 최근 활동 내역</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities && activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">{activity.activity_type}</p>
                  <p className="text-xs text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              최근 활동이 없습니다
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// 메인 데모 컴포넌트
// ============================================================================

/**
 * 비동기 위젯 데모 페이지
 *
 * 사용법:
 * ```tsx
 * // 페이지나 레이아웃에서 사용
 * export default function DashboardPage() {
 *   return (
 *     <div className="space-y-6">
 *       <AsyncWidgetDemo />
 *     </div>
 *   )
 * }
 * ```
 */
export function AsyncWidgetDemo() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">비동기 위젯 데모</h2>
        <p className="text-sm text-muted-foreground">
          각 위젯은 독립적으로 데이터를 로드하며, 에러나 로딩 상태를 개별적으로 처리합니다.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 위젯 1: 학생 통계 */}
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorFallback
              error={error}
              resetErrorBoundary={resetErrorBoundary}
              variant="default"
              title="위젯 로딩 실패"
              description="학생 통계를 불러오는 중 문제가 발생했습니다."
            />
          )}
        >
          <Suspense fallback={<WidgetSkeleton variant="stats" />}>
            <StudentStatsWidget />
          </Suspense>
        </ErrorBoundary>

        {/* 위젯 2: 최근 활동 */}
        <ErrorBoundary
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ErrorFallback
              error={error}
              resetErrorBoundary={resetErrorBoundary}
              variant="default"
              title="위젯 로딩 실패"
              description="최근 활동을 불러오는 중 문제가 발생했습니다."
            />
          )}
        >
          <Suspense fallback={<WidgetSkeleton variant="list" />}>
            <RecentActivityWidget />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* 사용 예제 설명 */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">구현 패턴</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">1. Error Boundary로 에러 격리</p>
            <code className="text-xs bg-muted p-2 rounded block">
              {`<ErrorBoundary fallbackRender={...}>`}
            </code>
          </div>
          <div>
            <p className="font-medium mb-1">2. Suspense로 로딩 상태 처리</p>
            <code className="text-xs bg-muted p-2 rounded block">
              {`<Suspense fallback={<WidgetSkeleton />}>`}
            </code>
          </div>
          <div>
            <p className="font-medium mb-1">3. 비동기 Server Component</p>
            <code className="text-xs bg-muted p-2 rounded block">
              {`async function Widget() { const data = await fetch(...) }`}
            </code>
          </div>
          <p className="text-muted-foreground pt-2">
            이 패턴을 사용하면 각 위젯이 독립적으로 로딩/에러 상태를 관리하며,
            하나의 위젯이 실패해도 전체 페이지에 영향을 주지 않습니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
