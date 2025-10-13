"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { GraduationCap, Users, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"

interface ClassInfo {
  id: string
  name: string
  current_enrollment: number
  max_capacity: number
  status: 'full' | 'near_full' | 'under_enrolled' | 'normal'
}

interface ClassStatusProps {
  classes: ClassInfo[]
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'full': return 'destructive'
      case 'near_full': return 'secondary'
      case 'under_enrolled': return 'outline'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'full': return '정원 마감'
      case 'near_full': return '정원 임박'
      case 'under_enrolled': return '미달'
      default: return '정상'
    }
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
            const enrollmentRate = (classInfo.current_enrollment / classInfo.max_capacity) * 100

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
                        <span className="text-muted-foreground">현재 인원</span>
                        <span className="font-medium">
                          {classInfo.current_enrollment} / {classInfo.max_capacity}명
                        </span>
                      </div>
                      <Progress value={enrollmentRate} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {enrollmentRate.toFixed(0)}% 등록
                      </p>
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
