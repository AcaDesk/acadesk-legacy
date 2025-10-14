import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, FileText, Calendar, CheckCircle2, User } from 'lucide-react'
import { getTodos } from '@/services/todo-list.service'
import { TodosClient } from './todos-client'

/**
 * TODO 관리 페이지 (Server Component)
 * - 서버에서 데이터 페칭 및 통계 계산
 * - 클라이언트 컴포넌트에 데이터 전달하여 필터링/인터랙션 처리
 */
export default async function TodosPage() {
  // Server-side data fetching
  const todos = await getTodos()

  return (
    <div className="space-y-6">
      {/* Header */}
      <section
        aria-label="페이지 헤더"
        className="animate-in fade-in-50 slide-in-from-top-2 duration-500"
      >
        <PageHeader
          title="TODO 관리"
          description="학생별 과제 및 TODO를 관리합니다"
          action={
            <div className="flex gap-2">
              <Link href="/todos/templates">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  템플릿 관리
                </Button>
              </Link>
              <Link href="/todos/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  TODO 생성
                </Button>
              </Link>
            </div>
          }
        />
      </section>

      {/* Quick Navigation Cards */}
      <section
        aria-label="빠른 탐색"
        className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: '100ms' }}
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
      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="h-24 bg-muted rounded-lg mb-4" />
              <div className="h-96 bg-muted rounded-lg" />
            </div>
          </div>
        }
      >
        <TodosClient initialTodos={todos} />
      </Suspense>
    </div>
  )
}
