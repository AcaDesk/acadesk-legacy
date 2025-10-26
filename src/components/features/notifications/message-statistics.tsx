'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Calendar } from '@ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@ui/popover'
import { CalendarIcon, TrendingUp, Send, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { getMessageStatistics } from '@/app/actions/messages'
import { useToast } from '@/hooks/use-toast'

interface MessageStatisticsProps {
  className?: string
}

export function MessageStatistics({ className }: MessageStatisticsProps) {
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState<any>(null)
  const [dateRange, setDateRange] = useState<{
    from: Date
    to: Date
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })

  const { toast } = useToast()

  useEffect(() => {
    loadStatistics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadStatistics() {
    setLoading(true)
    try {
      const result = await getMessageStatistics({
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to, 'yyyy-MM-dd'),
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || '통계 조회 실패')
      }

      setStatistics(result.data)
    } catch (error) {
      console.error('Error loading statistics:', error)
      toast({
        title: '통계 조회 실패',
        description: error instanceof Error ? error.message : '통계를 불러올 수 없습니다',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // 통계 데이터가 없으면 기본값 설정
  const stats = statistics || {
    total: 0,
    success: 0,
    pending: 0,
    failed: 0,
  }

  const successRate =
    stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '0.0'

  return (
    <div className={cn('space-y-4', className)}>
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">발송 통계</h3>
          <p className="text-sm text-muted-foreground">
            {format(dateRange.from, 'PPP', { locale: ko })} -{' '}
            {format(dateRange.to, 'PPP', { locale: ko })}
          </p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              기간 선택
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setDateRange({
                    from: new Date(new Date().setDate(new Date().getDate() - 7)),
                    to: new Date(),
                  })
                  loadStatistics()
                }}
              >
                최근 7일
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setDateRange({
                    from: new Date(new Date().setDate(new Date().getDate() - 30)),
                    to: new Date(),
                  })
                  loadStatistics()
                }}
              >
                최근 30일
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setDateRange({
                    from: new Date(new Date().setDate(new Date().getDate() - 90)),
                    to: new Date(),
                  })
                  loadStatistics()
                }}
              >
                최근 90일
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Messages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-600" />
              총 발송
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : stats.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">전체 발송 건수</p>
          </CardContent>
        </Card>

        {/* Success */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              성공
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {loading ? '-' : stats.success.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              성공률: {successRate}%
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              대기중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {loading ? '-' : stats.pending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">발송 대기 또는 처리 중</p>
          </CardContent>
        </Card>

        {/* Failed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              실패
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {loading ? '-' : stats.failed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              실패율: {stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : '0.0'}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      {statistics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              상세 정보
            </CardTitle>
            <CardDescription>발송 통계 세부 내역</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">일평균 발송:</span>
                <span className="font-medium">
                  {Math.round(
                    stats.total /
                      Math.max(
                        1,
                        Math.ceil(
                          (dateRange.to.getTime() - dateRange.from.getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )
                  ).toLocaleString()}
                  건
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">성공 건수:</span>
                <span className="font-medium text-green-600">{stats.success.toLocaleString()}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">대기 건수:</span>
                <span className="font-medium text-orange-600">{stats.pending.toLocaleString()}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">실패 건수:</span>
                <span className="font-medium text-red-600">{stats.failed.toLocaleString()}건</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
