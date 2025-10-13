"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import {
  Users,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Clock,
  GraduationCap,
  AlertCircle,
  CalendarDays
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Student {
  id: string
  student_code: string
  created_at: string
  users?: {
    name: string
    email?: string
  }
  class_enrollments?: Array<{
    classes?: {
      name: string
    }
  }>
}

interface RecentStudentsCardProps {
  students: Student[]
  maxDisplay?: number
}

export function RecentStudentsCard({ students, maxDisplay = 5 }: RecentStudentsCardProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = maxDisplay

  const totalPages = Math.ceil(students.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const displayedStudents = students.slice(startIdx, startIdx + itemsPerPage)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '오늘'
    if (diffDays === 1) return '어제'
    if (diffDays <= 7) return `${diffDays}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  }

  const getStudentInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length === 1) {
      return name.slice(0, 2).toUpperCase()
    }
    return parts.map(part => part[0]).join('').slice(0, 2).toUpperCase()
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>최근 등록 학생</CardTitle>
          <CardDescription>새로 등록된 학생이 없습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <UserPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">학생이 없습니다</p>
            <p className="text-xs text-muted-foreground mb-4">첫 번째 학생을 등록해보세요</p>
            <Link href="/students/new">
              <Button size="sm" variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                학생 등록
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>최근 등록 학생</CardTitle>
            <CardDescription>
              총 {students.length}명의 학생
            </CardDescription>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayedStudents.map((student) => {
            const hasClasses = student.class_enrollments && student.class_enrollments.length > 0
            const enrolledClass = student.class_enrollments?.[0]?.classes?.name

            return (
              <div
                key={student.id}
                className="flex items-center space-x-4"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm">
                    {getStudentInitials(student.users?.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1">
                  <Link
                    href={`/students/${student.id}`}
                    className="block hover:underline"
                  >
                    <p className="text-sm font-medium leading-none">
                      {student.users?.name || '이름 없음'}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{student.student_code}</span>
                    {enrolledClass && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {enrolledClass}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    {formatDate(student.created_at)}
                  </Badge>
                  {!hasClasses && (
                    <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 dark:border-orange-800 dark:text-orange-400">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      미배정
                    </Badge>
                  )}
                </div>

                <Link href={`/students/${student.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>

        {students.length > itemsPerPage && (
          <div className="mt-4 pt-4 border-t">
            <Link href="/students">
              <Button variant="outline" className="w-full" size="sm">
                전체 학생 보기
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}