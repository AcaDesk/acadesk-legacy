'use client'

import { Card, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { FileText, Calendar, Send, Clock } from 'lucide-react'
import type { ReportWithStudent } from '@/core/types/report.types'

interface ReportStatCardsProps {
  allReports: ReportWithStudent[]
}

export function ReportStatCards({ allReports }: ReportStatCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription>총 리포트 수</CardDescription>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl">{allReports.length}개</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription>이번 달 생성</CardDescription>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl">
            {allReports.filter((r) => {
              const genDate = new Date(r.generated_at)
              const now = new Date()
              return (
                genDate.getMonth() === now.getMonth() &&
                genDate.getFullYear() === now.getFullYear()
              )
            }).length}개
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription>전송 완료</CardDescription>
            <Send className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl text-green-600">
            {allReports.filter((r) => r.sent_at !== null).length}개
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardDescription>미전송</CardDescription>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl text-amber-600">
            {allReports.filter((r) => r.sent_at === null).length}개
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}
