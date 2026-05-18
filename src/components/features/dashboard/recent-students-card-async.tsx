import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { Avatar, AvatarFallback } from '@ui/avatar'
import Link from 'next/link'
import {
  ArrowRight,
  UserPlus,
  GraduationCap,
  CalendarDays,
} from 'lucide-react'
import { getRecentStudents } from '@/app/actions/dashboard'
import { WidgetErrorBoundary } from '@/components/features/dashboard/widget-error-boundary'
import { WidgetSkeleton } from '@ui/widget-skeleton'
import { getGuardianDisplayName } from '@/lib/constants'

/**
 * 비동기 최근 등록 학생 카드 (Server Component)
 *
 * 독립적으로 데이터를 fetch하고 Suspense로 스트리밍됩니다.
 */

interface Student {
  id: string
  enrollment_date: string
  users: {
    name: string
  } | null
  ref_grade_levels?: {
    grade_level_name: string
  } | null
  student_guardians?: Array<{
    guardians: {
      relationship: string | null
      users: {
        name: string
      } | null
    } | null
  }>
}

function getStudentInitials(name: string) {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) {
    return name.slice(0, 2).toUpperCase()
  }
  return parts.map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays <= 7) return `${diffDays}일 전`
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

async function RecentStudentsCardContent({ maxDisplay = 5 }: { maxDisplay?: number }) {
  const result = await getRecentStudents(maxDisplay)
  if (!result.success) {
    throw new Error(result.error || '최근 등록 학생 데이터를 불러오는데 실패했습니다')
  }

  const students = result.data as unknown as Student[]

  if (!students || students.length === 0) {
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
            <Button asChild size="sm" variant="outline">
              <Link href="/students">
                <UserPlus className="h-4 w-4 mr-2" />
                학생 등록
              </Link>
            </Button>
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
              최근 등록된 {students.length}명의 학생
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {students.map((student: Student) => {
            const studentName = student.users?.name || '이름 없음'
            const gradeLevel = student.ref_grade_levels?.grade_level_name
            const firstGuardian = student.student_guardians?.[0]?.guardians
            const guardianDisplayName = firstGuardian ? getGuardianDisplayName(
              student.users?.name,
              firstGuardian.relationship,
              firstGuardian.users?.name
            ) : null

            return (
              <div
                key={student.id}
                className="flex items-center space-x-4 p-2 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-sm">
                    {getStudentInitials(studentName)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-1 min-w-0">
                  <Link
                    href={`/students/${student.id}`}
                    className="block hover:underline"
                  >
                    <p className="text-sm font-medium leading-none truncate">
                      {studentName}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {gradeLevel && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {gradeLevel}
                      </span>
                    )}
                    {guardianDisplayName && (
                      <>
                        <span>•</span>
                        <span className="truncate">{guardianDisplayName}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    {formatDate(student.enrollment_date)}
                  </Badge>
                </div>

                <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <Link href={`/students/${student.id}`}>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Button asChild variant="outline" className="w-full" size="sm">
            <Link href="/students">
              전체 학생 보기
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 최근 등록 학생 카드 (Wrapper with Suspense & Error Boundary)
 *
 * 사용법:
 * ```tsx
 * <RecentStudentsCardAsync maxDisplay={5} />
 * ```
 */
export function RecentStudentsCardAsync({ maxDisplay = 5 }: { maxDisplay?: number }) {
  return (
    <WidgetErrorBoundary widgetId="recent-students" widgetTitle="최근 등록 학생">
      <Suspense fallback={<WidgetSkeleton variant="list" />}>
        <RecentStudentsCardContent maxDisplay={maxDisplay} />
      </Suspense>
    </WidgetErrorBoundary>
  )
}
