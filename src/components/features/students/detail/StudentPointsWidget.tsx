'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Skeleton } from '@ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Award, TrendingUp, TrendingDown, History, Plus } from 'lucide-react'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'

interface PointHistory {
  id: string
  point_type: string
  point_label: string
  points: number
  reason: string | null
  awarded_date: string
  awarded_by_name: string | null
  created_at: string
}

interface StudentPointsWidgetProps {
  studentId: string
}

export function StudentPointsWidget({ studentId }: StudentPointsWidgetProps) {
  const [balance, setBalance] = useState<number | null>(null)
  const [history, setHistory] = useState<PointHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [addPointDialogOpen, setAddPointDialogOpen] = useState(false)
  // Fetch from server API (service_role), no direct RPC from client

  useEffect(() => {
    loadPointData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  async function loadPointData() {
    try {
      setLoading(true)

      const res = await fetch(`/api/students/${studentId}/points`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || `Failed to load points (${res.status})`)
      }

      const payload = (await res.json()) as { balance: number; history: PointHistory[] }
      setBalance(payload.balance)
      setHistory(payload.history || [])
    } catch (error) {
      console.error('Error loading point data:', error)
      setBalance(0)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4" />
            상벌점
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-24" />
        </CardContent>
      </Card>
    )
  }

  const recentRewards = history.filter((h) => h.points > 0).slice(0, 3)
  const recentPenalties = history.filter((h) => h.points < 0).slice(0, 3)

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              상벌점
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddPointDialogOpen(true)}
                className="h-8 gap-1"
              >
                <Plus className="h-3 w-3" />
                <span className="text-xs">포인트 추가</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHistoryDialogOpen(true)}
                className="h-8 gap-1"
              >
                <History className="h-3 w-3" />
                <span className="text-xs">상세 내역</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{balance}</span>
            <span className="text-sm text-muted-foreground">점</span>
          </div>

          {/* Recent activity summary */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {recentRewards.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>최근 상점</span>
                </div>
                {recentRewards.map((reward) => (
                  <div key={reward.id} className="text-xs">
                    <Badge variant="outline" className="text-xs">
                      +{reward.points}
                    </Badge>
                    <span className="ml-1 text-muted-foreground">
                      {reward.point_label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {recentPenalties.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3" />
                  <span>최근 벌점</span>
                </div>
                {recentPenalties.map((penalty) => (
                  <div key={penalty.id} className="text-xs">
                    <Badge variant="outline" className="text-xs">
                      {penalty.points}
                    </Badge>
                    <span className="ml-1 text-muted-foreground">
                      {penalty.point_label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>상벌점 상세 내역</DialogTitle>
            <DialogDescription>
              현재 잔액: <span className="font-bold text-lg">{balance}점</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>아직 상벌점 기록이 없습니다</p>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                      item.points > 0 ? 'bg-muted' : 'bg-muted'
                    }`}
                  >
                    {item.points > 0 ? (
                      <TrendingUp className="h-5 w-5 text-foreground" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{item.point_label}</p>
                      <Badge
                        variant={item.points > 0 ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {item.points > 0 ? '+' : ''}
                        {item.points}점
                      </Badge>
                    </div>

                    {item.reason && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.reason}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>
                        {formatDate(new Date(item.awarded_date), 'yyyy.MM.dd', {
                          locale: ko,
                        })}
                      </span>
                      {item.awarded_by_name && (
                        <>
                          <span>•</span>
                          <span>{item.awarded_by_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
