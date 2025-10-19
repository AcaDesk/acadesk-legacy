"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { GraduationCap, Users, ChevronLeft, ChevronRight } from "lucide-react"
import type { ClassStatus as ClassStatusType } from "@/hooks/use-dashboard-data"

interface ClassStatusProps {
  classes: ClassStatusType[]
}

export function ClassStatus({ classes }: ClassStatusProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const itemsPerPage = 3

  if (classes.length === 0) return null

  const paginatedClasses = classes.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  )
  const totalPages = Math.ceil(classes.length / itemsPerPage)

  const getStatusColor = (status: 'active' | 'inactive') => {
    return status === 'active' ? 'default' : 'secondary'
  }

  const getStatusLabel = (status: 'active' | 'inactive') => {
    return status === 'active' ? '활성' : '비활성'
  }

  const getEnrollmentStatus = (studentCount: number, activeStudents: number) => {
    if (activeStudents === 0) return { label: '수강생 없음', variant: 'outline' as const }
    const activeRate = (activeStudents / studentCount) * 100
    if (activeRate >= 90) return { label: '우수', variant: 'default' as const }
    if (activeRate >= 70) return { label: '양호', variant: 'secondary' as const }
    return { label: '관리 필요', variant: 'destructive' as const }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-purple-600" />
            수업 현황
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            총 {classes.length}개
          </span>
        </CardTitle>
        <CardDescription>정원 관리가 필요한 수업들</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paginatedClasses.map((classInfo) => {
            const enrollmentStatus = getEnrollmentStatus(classInfo.student_count, classInfo.active_students)
            const activeRate = classInfo.student_count > 0
              ? (classInfo.active_students / classInfo.student_count) * 100
              : 0

            return (
              <div key={classInfo.id} className="block">
                <Link href={`/classes/${classInfo.id}`}>
                  <div className="p-4 rounded-lg border hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{classInfo.name}</span>
                      </div>
                      <Badge variant={getStatusColor(classInfo.status)}>
                        {getStatusLabel(classInfo.status)}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">활동 학생</span>
                        <span className="font-medium">
                          {classInfo.active_students} / {classInfo.student_count}명
                        </span>
                      </div>
                      <Progress value={activeRate} className="h-2" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {activeRate.toFixed(0)}% 활동 중
                        </span>
                        <Badge variant={enrollmentStatus.variant} className="text-xs">
                          {enrollmentStatus.label}
                        </Badge>
                      </div>
                      {classInfo.attendance_rate !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          출석률: {classInfo.attendance_rate.toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
