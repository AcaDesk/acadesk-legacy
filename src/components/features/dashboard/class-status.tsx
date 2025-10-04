"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { GraduationCap, Users, AlertCircle } from "lucide-react"

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
  if (classes.length === 0) return null

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          수업 현황
        </CardTitle>
        <CardDescription>정원 관리가 필요한 수업들</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {classes.map((classInfo) => {
            const enrollmentRate = (classInfo.current_enrollment / classInfo.max_capacity) * 100

            return (
              <Link key={classInfo.id} href={`/classes/${classInfo.id}`}>
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
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
