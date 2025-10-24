import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { PageHeader } from '@ui/page-header'
import { Calendar, CheckCircle2, User } from 'lucide-react'
import { TodosClient } from './todos-client'
import { TodoPageActions } from '@/components/features/todos/todo-page-actions'
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'
import { getTodosWithStudent } from '@/app/actions/todos'
import type { StudentTodoWithStudent } from '@/core/types/todo.types'
import { PAGE_ANIMATIONS } from '@/lib/animation-config'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'

// Force dynamic rendering (uses cookies for authentication)
export const dynamic = 'force-dynamic'

/**
 * TODO 관리 페이지 (Server Component)
 * - 서버에서 데이터 페칭 및 통계 계산
 * - 클라이언트 컴포넌트에 데이터 전달하여 필터링/인터랙션 처리
 */
export default async function TodosPage() {
  // Server-side data fetching using Server Action
  const result = await getTodosWithStudent()

  if (!result.success || !result.data) {
    console.error('Error fetching todos:', result.error)
  }

  const todosWithStudent = (result.data || []) as StudentTodoWithStudent[]

  return (
    <PageErrorBoundary pageName="TODO 관리">
      <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <section
        aria-label="페이지 헤더"
        className={PAGE_ANIMATIONS.header}
      >
        <PageHeader
          title="TODO 관리"
          description="학생별 과제 및 TODO를 관리합니다"
          action={<TodoPageActions />}
        />
      </section>

      {/* Quick Navigation Cards */}
      <section
        aria-label="빠른 탐색"
        {...PAGE_ANIMATIONS.getSection(0)}
      >
        <div className="grid gap-4 md:grid-cols-4">
          <Link href="/todos/planner">
            <Card className="hover:bg-accent transition-colors cursor-pointer border-2 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  주간 학습 플래너
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">드래그 앤 드롭으로 주간 과제 배정</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/todos/verify">
            <Card className="hover:bg-accent transition-colors cursor-pointer border-2 border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  검증 대기 목록
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">완료된 과제 일괄 검증</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/kiosk">
            <Card className="hover:bg-accent transition-colors cursor-pointer border-2 border-green-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  학생 키오스크
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">학생용 과제 확인 모드</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/todos/stats">
            <Card className="hover:bg-accent transition-colors cursor-pointer border-2 border-orange-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  통계 대시보드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">과제 완료 현황 분석</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* Client Component - Stats, Filtering, and Interactions */}
      <SectionErrorBoundary sectionName="TODO 목록">
        <Suspense
          fallback={
            <div className="space-y-6">
              <WidgetSkeleton variant="stats" />
              <WidgetSkeleton variant="list" />
            </div>
          }
        >
          <TodosClient initialTodos={todosWithStudent} />
        </Suspense>
      </SectionErrorBoundary>
    </div>
    </PageErrorBoundary>
  )
}
