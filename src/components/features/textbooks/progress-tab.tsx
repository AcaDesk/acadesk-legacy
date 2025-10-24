'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ExternalLink, TrendingUp } from 'lucide-react'
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
import { WidgetSkeleton } from '@/components/ui/widget-skeleton'
import { showErrorToast } from '@/lib/toast-helpers'
import { getRecentProgress } from '@/app/actions/textbook-progress'

type ProgressRecord = {
  id: string
  date: string
  pages_done: number | null
  percent_done: number | null
  memo: string | null
  students: {
    id: string
    name: string
  } | null
  textbook_units: {
    id: string
    unit_order: number
    unit_code: string | null
    unit_title: string
  } | null
  users: {
    id: string
    name: string | null
  } | null
}

export function ProgressTab({ textbookId }: { textbookId: string }) {
  const [progressRecords, setProgressRecords] = useState<ProgressRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProgress()
  }, [textbookId])

  async function loadProgress() {
    try {
      setLoading(true)
      const result = await getRecentProgress({
        textbookId,
        limit: 50,
        days: 90, // Last 90 days
      })

      if (!result.success || !result.data) {
        showErrorToast(
          '진도 기록 로드 실패',
          new Error(result.error || '진도 기록을 불러올 수 없습니다'),
          'ProgressTab.loadProgress'
        )
        return
      }

      setProgressRecords(result.data as any)
    } catch (error) {
      showErrorToast('진도 기록 로드 실패', error, 'ProgressTab.loadProgress')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <WidgetSkeleton variant="table" />
  }

  if (progressRecords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>진도 기록</CardTitle>
          <CardDescription>최근 90일간의 진도 기록</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              등록된 진도 기록이 없습니다
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              학생별로 진도를 기록하면 여기에 표시됩니다
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group records by student
  const studentGroups = progressRecords.reduce((acc, record) => {
    if (!record.students) return acc

    const studentId = record.students.id
    if (!acc[studentId]) {
      acc[studentId] = {
        student: record.students,
        records: [],
      }
    }
    acc[studentId].records.push(record)
    return acc
  }, {} as Record<string, { student: { id: string; name: string }; records: ProgressRecord[] }>)

  return (
    <Card>
      <CardHeader>
        <CardTitle>진도 기록</CardTitle>
        <CardDescription>
          최근 90일간 {progressRecords.length}건의 진도 기록
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.values(studentGroups).map(({ student, records }) => {
          // Calculate summary
          const totalPages = records.reduce(
            (sum, r) => sum + (r.pages_done || 0),
            0
          )
          const latestRecord = records[0] // Already sorted by date DESC
          const latestPercent = latestRecord?.percent_done

          return (
            <div key={student.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/students/${student.id}`}
                    className="font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    {student.name}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <Badge variant="secondary">
                    {records.length}건 기록
                  </Badge>
                  {totalPages > 0 && (
                    <Badge variant="outline">
                      총 {totalPages}페이지
                    </Badge>
                  )}
                  {latestPercent && (
                    <Badge>
                      {latestPercent}% 완료
                    </Badge>
                  )}
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">날짜</TableHead>
                    <TableHead>단원</TableHead>
                    <TableHead className="w-32 text-right">페이지</TableHead>
                    <TableHead className="w-32 text-right">진도율</TableHead>
                    <TableHead>메모</TableHead>
                    <TableHead className="w-32">기록자</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm">
                        {new Date(record.date).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {record.textbook_units ? (
                          <div className="text-sm">
                            <span className="font-mono text-xs text-muted-foreground mr-1">
                              {record.textbook_units.unit_code ||
                                `U${record.textbook_units.unit_order}`}
                            </span>
                            {record.textbook_units.unit_title}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.pages_done ? (
                          `${record.pages_done}p`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.percent_done ? (
                          `${record.percent_done}%`
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {record.memo || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.users?.name || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
