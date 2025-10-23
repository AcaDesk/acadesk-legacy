'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { BookOpen, GraduationCap, Target } from 'lucide-react'
import { ClassEnrollmentsList } from '@/components/features/students/detail/ClassEnrollmentsList'
import { ClassProgressCard } from '@/components/features/students/detail/ClassProgressCard'
import { useStudentDetail } from '@/hooks/use-student-detail'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
    },
  },
}

interface ClassEnrollment {
  id: string
  class_id: string
  status: string
  enrolled_at: string
  end_date: string | null
  withdrawal_reason: string | null
  notes: string | null
  classes: {
    id: string
    name: string
  } | null
}

export function LearningStatusTab() {
  const router = useRouter()
  const { student, onRefresh } = useStudentDetail()

  // 수강 중인 과목 수
  const activeEnrollments = (student.class_enrollments as unknown as ClassEnrollment[])?.filter((ce) => ce.status === 'active') || []
  const totalEnrollments = student.class_enrollments?.length || 0
  const completedEnrollments = (student.class_enrollments as unknown as ClassEnrollment[])?.filter((ce) => ce.status === 'completed').length || 0

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Quick Stats */}
      <motion.div className="grid gap-4 md:grid-cols-3" variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">수강 중</p>
                <p className="text-2xl font-bold">
                  {activeEnrollments.length}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    과목
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">수강 완료</p>
                <p className="text-2xl font-bold">
                  {completedEnrollments}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    과목
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Target className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">전체 수강 이력</p>
                <p className="text-2xl font-bold">
                  {totalEnrollments}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    과목
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Class Enrollments */}
      {student.class_enrollments && student.class_enrollments.length > 0 ? (
        <motion.div variants={itemVariants}>
        <ClassEnrollmentsList
          enrollments={student.class_enrollments as unknown as ClassEnrollment[]}
          onUpdate={onRefresh || (() => {})}
        />
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">등록된 수업이 없습니다</p>
            <Button
              size="sm"
              onClick={() => router.push('/classes')}
              className="gap-2"
            >
              수업 등록하기
            </Button>
          </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Class Progress for each enrolled class */}
      <motion.div variants={itemVariants}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">과목별 학습 진도</CardTitle>
        </CardHeader>
        <CardContent>
          {activeEnrollments.length > 0 ? (
            <div className="space-y-4">
              {activeEnrollments.map((ce) => (
                <ClassProgressCard
                  key={ce.id}
                  studentId={student.id}
                  classId={ce.class_id}
                  className={ce.classes?.name || '수업'}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              현재 수강 중인 과목이 없습니다
            </p>
          )}
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  )
}
