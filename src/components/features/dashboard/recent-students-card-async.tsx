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
import { createClient } from '@/lib/supabase/server'
import { WidgetErrorBoundary } from '@/components/features/dashboard/widget-error-boundary'
import { WidgetSkeleton } from '@ui/widget-skeleton'

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
  const supabase = await createClient()

  const { data: rawStudents, error } = await supabase
    .from('students')
    .select(`
      id,
      enrollment_date,
      users (
        name
      ),
      ref_grade_levels (
        grade_level_name
      ),
      student_guardians (
        guardians (
          users (
            name
          )
        )
      )
    `)
    .order('enrollment_date', { ascending: false })
    .limit(maxDisplay)

  if (error) {
    console.error('Failed to fetch recent students:', error)
    throw new Error('최근 등록 학생 데이터를 불러오는데 실패했습니다')
  }

  // Type cast to match our Student interface
  const students = rawStudents as unknown as Student[]

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
            <Link href="/students">
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
            const guardianName = student.student_guardians?.[0]?.guardians?.users?.name

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
                    {guardianName && (
                      <>
                        <span>•</span>
                        <span className="truncate">{guardianName}</span>
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

                <Link href={`/students/${student.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Link href="/students">
            <Button variant="outline" className="w-full" size="sm">
              전체 학생 보기
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
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
