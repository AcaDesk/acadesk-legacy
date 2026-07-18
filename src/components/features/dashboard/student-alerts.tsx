"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card"
import { Badge } from "@ui/badge"
import { Button } from "@ui/button"
import Link from "next/link"
import { AlertTriangle, ChevronLeft, ChevronRight, ShieldAlert, UserX } from "lucide-react"
import type { RiskStudentAlert } from "@/core/types/dashboard"

interface StudentAlertsProps {
  atRisk: RiskStudentAlert[]
}

/**
 * 위험 학생 조기 경보 위젯
 *
 * 최근 28일 vs 이전 28일의 출결 변화 + 성적 하락 + 과제 미제출을
 * 규칙 기반으로 합산한 스코어를 위험(danger)/주의(warning)로 표시한다.
 */
export function StudentAlerts({ atRisk }: StudentAlertsProps) {
  const [page, setPage] = useState(0)
  const itemsPerPage = 4

  if (atRisk.length === 0) return null

  const totalPages = Math.ceil(atRisk.length / itemsPerPage)
  const paginated = atRisk.slice(page * itemsPerPage, (page + 1) * itemsPerPage)
  const dangerCount = atRisk.filter((s) => s.level === "danger").length

  return (
    <Card className="h-full border-warning/20 bg-warning/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            위험 학생 조기 경보
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            위험 {dangerCount}명 · 주의 {atRisk.length - dangerCount}명
          </span>
        </div>
        <CardDescription>
          최근 4주간 출결 변화·성적 하락·과제 미제출을 종합한 결과입니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {paginated.map((student) => {
          const isDanger = student.level === "danger"
          const Icon = isDanger ? ShieldAlert : UserX
          return (
            <Link key={student.id} href={`/students/${student.id}`} className="block">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer bg-white dark:bg-gray-900">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
                      isDanger ? "bg-destructive/10" : "bg-warning/10"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isDanger ? "text-destructive" : "text-warning"}`}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {student.name}
                      {student.grade && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          {student.grade}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {student.reasons.join(" · ")}
                    </div>
                  </div>
                </div>
                <Badge variant={isDanger ? "destructive" : "secondary"} className="shrink-0">
                  {isDanger ? "위험" : "주의"}
                </Badge>
              </div>
            </Link>
          )
        })}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
