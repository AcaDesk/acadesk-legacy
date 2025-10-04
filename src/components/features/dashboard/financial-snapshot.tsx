"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react"

interface FinancialData {
  currentMonthRevenue: number
  previousMonthRevenue: number
  unpaidTotal: number
  unpaidCount: number
}

interface FinancialSnapshotProps {
  data: FinancialData
}

export function FinancialSnapshot({ data }: FinancialSnapshotProps) {
  const revenueChange = data.currentMonthRevenue - data.previousMonthRevenue
  const revenueChangePercent = data.previousMonthRevenue > 0 
    ? ((revenueChange / data.previousMonthRevenue) * 100).toFixed(1)
    : "0"
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
            <span className="text-2xl font-bold">
              {data.currentMonthRevenue.toLocaleString()}원
            </span>
            <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
              {isPositive ? "+" : ""}{revenueChangePercent}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            지난 달 대비 {Math.abs(revenueChange).toLocaleString()}원 {isPositive ? "증가" : "감소"}
          </p>
        </div>

        {/* Unpaid Amount */}
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

        {/* Monthly Trend - Simple Bar Chart */}
        <div className="space-y-2">
          <span className="text-sm font-medium">월별 추이</span>
          <div className="flex items-end gap-2 h-20">
            <div className="flex-1 bg-primary/20 rounded-t" style={{ height: "60%" }} />
            <div className="flex-1 bg-primary/30 rounded-t" style={{ height: "70%" }} />
            <div className="flex-1 bg-primary/40 rounded-t" style={{ height: "80%" }} />
            <div className="flex-1 bg-primary rounded-t" style={{ height: "100%" }} />
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
