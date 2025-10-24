'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UserPlus, ExternalLink } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers'
import {
  getTextbookDistributions,
  updateStudentTextbook,
} from '@/app/actions/textbooks'

type Distribution = {
  id: string
  issue_date: string
  paid: boolean
  status: 'in_use' | 'completed' | 'returned'
  notes: string | null
  students: {
    id: string
    name: string
    grade: string | null
    class: string | null
  } | null
}

const statusLabels = {
  in_use: '사용 중',
  completed: '완료',
  returned: '반납',
} as const

const statusVariants = {
  in_use: 'default',
  completed: 'secondary',
  returned: 'outline',
} as const

export function DistributionTab({ textbookId }: { textbookId: string }) {
  const [distributions, setDistributions] = useState<Distribution[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadDistributions()
  }, [textbookId])

  async function loadDistributions() {
    try {
      setLoading(true)
      const result = await getTextbookDistributions(textbookId)

      if (!result.success || !result.data) {
        showErrorToast(
          '배부 현황 로드 실패',
          new Error(result.error || '배부 현황을 불러올 수 없습니다'),
          'DistributionTab.loadDistributions'
        )
        return
      }

      setDistributions(result.data as any)
    } catch (error) {
      showErrorToast('배부 현황 로드 실패', error, 'DistributionTab.loadDistributions')
    } finally {
      setLoading(false)
    }
  }

  async function togglePaid(distributionId: string, currentPaid: boolean) {
    try {
      setUpdating(distributionId)

      const result = await updateStudentTextbook({
        id: distributionId,
        paid: !currentPaid,
      })

      if (!result.success) {
        showErrorToast('결제 상태 변경 실패', new Error(result.error || '변경 실패'), 'DistributionTab.togglePaid')
        return
      }

      // Update local state
      setDistributions((prev) =>
        prev.map((d) =>
          d.id === distributionId ? { ...d, paid: !currentPaid } : d
        )
      )

      showSuccessToast('결제 상태 변경', `결제 상태가 ${!currentPaid ? '완료' : '미완료'}로 변경되었습니다`)
    } catch (error) {
      showErrorToast('결제 상태 변경 실패', error, 'DistributionTab.togglePaid')
    } finally {
      setUpdating(null)
    }
  }

  async function changeStatus(
    distributionId: string,
    newStatus: 'in_use' | 'completed' | 'returned'
  ) {
    try {
      setUpdating(distributionId)

      const result = await updateStudentTextbook({
        id: distributionId,
        status: newStatus,
      })

      if (!result.success) {
        showErrorToast('상태 변경 실패', new Error(result.error || '변경 실패'), 'DistributionTab.changeStatus')
        return
      }

      // Update local state
      setDistributions((prev) =>
        prev.map((d) =>
          d.id === distributionId ? { ...d, status: newStatus } : d
        )
      )

      showSuccessToast('상태 변경', `상태가 ${statusLabels[newStatus]}로 변경되었습니다`)
    } catch (error) {
      showErrorToast('상태 변경 실패', error, 'DistributionTab.changeStatus')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return <WidgetSkeleton variant="table" />
  }

  if (distributions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>배부 현황</CardTitle>
              <CardDescription>
                이 교재를 배부받은 학생 목록
              </CardDescription>
            </div>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              학생에게 배부
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            아직 이 교재를 배부받은 학생이 없습니다
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>배부 현황</CardTitle>
            <CardDescription>
              총 {distributions.length}명의 학생에게 배부
            </CardDescription>
          </div>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            학생에게 배부
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>학생</TableHead>
              <TableHead>학년/반</TableHead>
              <TableHead>배부일</TableHead>
              <TableHead>결제</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>비고</TableHead>
              <TableHead className="text-right">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {distributions.map((dist) => (
              <TableRow key={dist.id}>
                <TableCell className="font-medium">
                  {dist.students ? (
                    <Link
                      href={`/students/${dist.students.id}`}
                      className="hover:underline inline-flex items-center gap-1"
                    >
                      {dist.students.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {dist.students?.grade && dist.students?.class
                    ? `${dist.students.grade}학년 ${dist.students.class}반`
                    : '-'}
                </TableCell>
                <TableCell>
                  {new Date(dist.issue_date).toLocaleDateString('ko-KR')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`paid-${dist.id}`}
                      checked={dist.paid}
                      onCheckedChange={() => togglePaid(dist.id, dist.paid)}
                      disabled={updating === dist.id}
                    />
                    <label
                      htmlFor={`paid-${dist.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {dist.paid ? '완료' : '미완료'}
                    </label>
                  </div>
                </TableCell>
                <TableCell>
                  <select
                    value={dist.status}
                    onChange={(e) =>
                      changeStatus(
                        dist.id,
                        e.target.value as 'in_use' | 'completed' | 'returned'
                      )
                    }
                    disabled={updating === dist.id}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="in_use">사용 중</option>
                    <option value="completed">완료</option>
                    <option value="returned">반납</option>
                  </select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {dist.notes || '-'}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    수정
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
