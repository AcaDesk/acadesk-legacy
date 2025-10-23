import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import Link from 'next/link'
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { WidgetErrorBoundary } from '@/components/features/dashboard/widget-error-boundary'
import { WidgetSkeleton } from '@ui/widget-skeleton'

/**
 * 비동기 재무 현황 위젯 (Server Component)
 *
 * 독립적으로 재무 데이터를 fetch하고 Suspense로 스트리밍됩니다.
 */

interface FinancialData {
  currentMonthRevenue: number
  previousMonthRevenue: number
  unpaidTotal: number
  unpaidCount: number
}

async function FinancialSnapshotContent() {
  const supabase = await createClient()

  // Get current month's revenue
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7) // YYYY-MM

  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .slice(0, 7)

  // Fetch current month revenue
  const { data: currentPayments, error: currentError } = await supabase
    .from('payments')
    .select('amount')
    .gte('payment_date', `${currentMonth}-01`)
    .lt('payment_date', `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`)
    .eq('payment_status', 'paid')

  if (currentError) {
    console.error('Failed to fetch current month payments:', currentError)
    throw new Error('이번 달 수납 데이터를 불러오는데 실패했습니다')
  }

  // Fetch previous month revenue
  const { data: previousPayments, error: previousError } = await supabase
    .from('payments')
    .select('amount')
    .gte('payment_date', `${previousMonth}-01`)
    .lt('payment_date', `${currentMonth}-01`)
    .eq('payment_status', 'paid')

  if (previousError) {
    console.error('Failed to fetch previous month payments:', previousError)
    // Don't throw, just use 0
  }

  // Fetch unpaid amounts
  const { data: unpaidPayments, error: unpaidError } = await supabase
    .from('payments')
    .select('amount, student_id')
    .eq('payment_status', 'pending')

  if (unpaidError) {
    console.error('Failed to fetch unpaid payments:', unpaidError)
    // Don't throw, just use empty array
  }

  // Calculate totals
  const currentMonthRevenue = currentPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  const previousMonthRevenue = previousPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  const unpaidTotal = unpaidPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
  const unpaidCount = unpaidPayments?.length || 0

  const data: FinancialData = {
    currentMonthRevenue,
    previousMonthRevenue,
    unpaidTotal,
    unpaidCount,
  }

  const revenueChange = data.currentMonthRevenue - data.previousMonthRevenue
  const revenueChangePercent =
    data.previousMonthRevenue > 0
      ? ((revenueChange / data.previousMonthRevenue) * 100).toFixed(1)
      : '0'
  const isPositive = revenueChange >= 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          재무 현황
        </CardTitle>
        <CardDescription>이번 달 수납 및 미납 현황</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Month Revenue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">이번 달 수납액</span>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{data.currentMonthRevenue.toLocaleString()}원</span>
            <Badge variant={isPositive ? 'default' : 'destructive'} className="text-xs">
              {isPositive ? '+' : ''}
              {revenueChangePercent}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            지난 달 대비 {Math.abs(revenueChange).toLocaleString()}원 {isPositive ? '증가' : '감소'}
          </p>
        </div>

        {/* Unpaid Amount */}
        {data.unpaidCount > 0 ? (
          <Link href="/payments?filter=unpaid">
            <div className="p-4 rounded-lg border hover:bg-muted transition-colors cursor-pointer bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">미납 총액</span>
                </div>
                <Badge variant="secondary">{data.unpaidCount}명</Badge>
              </div>
              <div className="text-xl font-bold text-orange-600">
                {data.unpaidTotal.toLocaleString()}원
              </div>
            </div>
          </Link>
        ) : (
          <div className="p-4 rounded-lg border bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-600">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">미납 없음</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">모든 수납이 완료되었습니다</p>
          </div>
        )}

        {/* Monthly Trend - Simple Bar Chart */}
        <div className="space-y-2">
          <span className="text-sm font-medium">월별 추이</span>
          <div className="flex items-end gap-2 h-20">
            <div className="flex-1 bg-primary/20 rounded-t" style={{ height: '60%' }} />
            <div className="flex-1 bg-primary/30 rounded-t" style={{ height: '70%' }} />
            <div className="flex-1 bg-primary/40 rounded-t" style={{ height: '80%' }} />
            <div className="flex-1 bg-primary rounded-t" style={{ height: '100%' }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>3개월 전</span>
            <span>이번 달</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 재무 현황 위젯 (Wrapper with Suspense & Error Boundary)
 *
 * 사용법:
 * ```tsx
 * <FinancialSnapshotAsync />
 * ```
 */
export function FinancialSnapshotAsync() {
  return (
    <WidgetErrorBoundary widgetId="financial-snapshot" widgetTitle="재무 현황">
      <Suspense fallback={<WidgetSkeleton variant="default" />}>
        <FinancialSnapshotContent />
      </Suspense>
    </WidgetErrorBoundary>
  )
}
