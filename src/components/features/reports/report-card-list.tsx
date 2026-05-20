'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { Eye, Send, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Checkbox } from '@ui/checkbox'
import type { Row } from '@tanstack/react-table'
import type { ReportWithStudent } from '@/core/types/report.types'

interface ReportCardListProps {
  rows: Row<ReportWithStudent>[]
  mode: 'browse' | 'select'
  onSendClick: (reportId: string, studentName: string, reportType: string) => void
  onDeleteClick: (reportId: string, studentName: string) => void
}

export function ReportCardList({ rows, mode, onSendClick, onDeleteClick }: ReportCardListProps) {
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row, idx) => {
        const report = row.original
        const student = report.students
        const studentName = student?.users?.name || '이름 없음'

        return (
          <motion.div
            key={row.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.03 }}
            className="rounded-lg border bg-card p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {mode === 'select' && (
                  <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="행 선택"
                    className="mt-0.5"
                  />
                )}
                <div>
                  <Link
                    href={`/reports/${report.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {studentName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{student?.student_code}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant={report.report_type === 'weekly' ? 'secondary' : 'default'}>
                  {report.report_type === 'weekly' ? '주간' : report.report_type === 'monthly' ? '월간' : '분기'}
                </Badge>
                {report.sent_at ? (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                    전송됨
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                    미전송
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {(() => {
                if (!report.generated_at) return '-'
                const d = new Date(report.generated_at)
                return isNaN(d.getTime()) ? '-' : format(d, 'yyyy-MM-dd')
              })()} 생성
            </div>

            {mode === 'browse' && (
              <div className="flex items-center gap-2 pt-1 border-t">
                <Button variant="ghost" size="sm" asChild className="gap-1.5 h-8">
                  <Link href={`/reports/${report.id}`}>
                    <Eye className="h-3.5 w-3.5" />
                    보기
                  </Link>
                </Button>
                {!report.sent_at && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSendClick(report.id, studentName, report.report_type)}
                    className="gap-1.5 h-8 text-info"
                  >
                    <Send className="h-3.5 w-3.5" />
                    전송
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteClick(report.id, studentName)}
                  className="gap-1.5 h-8 text-destructive ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  삭제
                </Button>
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
