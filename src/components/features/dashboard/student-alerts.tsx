"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { AlertTriangle, UserX, ListTodo } from "lucide-react"

interface StudentAlert {
  id: string
  student_code: string
  users: {
    name: string
  } | null
  attendance_rate?: number
  pending_count?: number
}

interface StudentAlertsProps {
  longAbsence: StudentAlert[]
  pendingAssignments: StudentAlert[]
}

export function StudentAlerts({ longAbsence, pendingAssignments }: StudentAlertsProps) {
  const hasAlerts = longAbsence.length > 0 || pendingAssignments.length > 0

  if (!hasAlerts) return null

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          학생 이상 징후
        </CardTitle>
        <CardDescription>관심이 필요한 학생들입니다</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Long Absence Students */}
        {longAbsence.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <UserX className="h-4 w-4 text-red-600" />
              장기 결석 의심 (최근 2주 출석률 50% 미만)
            </h4>
            <div className="space-y-2">
              {longAbsence.map((student) => (
                <Link key={student.id} href={`/students/${student.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                        <UserX className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <div className="font-medium">{student.users?.name || '이름 없음'}</div>
                        <div className="text-xs text-muted-foreground">
                          {student.student_code}
                        </div>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      출석률 {student.attendance_rate?.toFixed(0)}%
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Pending Assignments Students */}
        {pendingAssignments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-yellow-600" />
              과제 부진 (미제출 과제 3개 이상)
            </h4>
            <div className="space-y-2">
              {pendingAssignments.map((student) => (
                <Link key={student.id} href={`/students/${student.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors cursor-pointer bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center">
                        <ListTodo className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <div className="font-medium">{student.users?.name || '이름 없음'}</div>
                        <div className="text-xs text-muted-foreground">
                          {student.student_code}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      미제출 {student.pending_count}개
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
