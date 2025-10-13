"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangle, UserX, ListTodo, ChevronLeft, ChevronRight } from "lucide-react"

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
  const [absencePage, setAbsencePage] = useState(0)
  const [assignmentPage, setAssignmentPage] = useState(0)
  const itemsPerPage = 3

  if (!hasAlerts) return null

  const paginatedAbsence = longAbsence.slice(
    absencePage * itemsPerPage,
    (absencePage + 1) * itemsPerPage
  )
  const paginatedAssignments = pendingAssignments.slice(
    assignmentPage * itemsPerPage,
    (assignmentPage + 1) * itemsPerPage
  )

  const absencePages = Math.ceil(longAbsence.length / itemsPerPage)
  const assignmentPages = Math.ceil(pendingAssignments.length / itemsPerPage)

  return (
    <Card className="h-full border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-600" />
                장기 결석 의심 (최근 2주 출석률 50% 미만)
              </h4>
              <span className="text-xs text-muted-foreground">
                총 {longAbsence.length}명
              </span>
            </div>
            <div className="space-y-2.5">
              {paginatedAbsence.map((student) => (
                <div key={student.id} className="block">
                  <Link href={`/students/${student.id}`}>
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
                </div>
              ))}
            </div>
            {absencePages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAbsencePage(p => Math.max(0, p - 1))}
                  disabled={absencePage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {absencePage + 1} / {absencePages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAbsencePage(p => Math.min(absencePages - 1, p + 1))}
                  disabled={absencePage === absencePages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Pending Assignments Students */}
        {pendingAssignments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-yellow-600" />
                과제 부진 (미제출 과제 3개 이상)
              </h4>
              <span className="text-xs text-muted-foreground">
                총 {pendingAssignments.length}명
              </span>
            </div>
            <div className="space-y-2.5">
              {paginatedAssignments.map((student) => (
                <div key={student.id} className="block">
                  <Link href={`/students/${student.id}`}>
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
                </div>
              ))}
            </div>
            {assignmentPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignmentPage(p => Math.max(0, p - 1))}
                  disabled={assignmentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {assignmentPage + 1} / {assignmentPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignmentPage(p => Math.min(assignmentPages - 1, p + 1))}
                  disabled={assignmentPage === assignmentPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
