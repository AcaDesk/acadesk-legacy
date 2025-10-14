'use client'

import { motion } from 'motion/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  BookOpen,
  Users,
} from 'lucide-react'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useStudentDetail } from '@/contexts/studentDetailContext'
import { StudentPointsWidget } from './StudentPointsWidget'
import { ClassEnrollmentsList } from './ClassEnrollmentsList'

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

export function OverviewTab() {
  const {
    student,
    recentScores,
    recentTodos,
    attendanceRecords,
    consultations,
    onRefresh,
  } = useStudentDetail()

  // 최근 활동 요약
  const recentActivities = [
    ...recentScores.slice(0, 3).map((score) => ({
      type: 'exam' as const,
      date: score.exams?.exam_date || score.created_at,
      title: score.exams?.name || '시험',
      description: `${score.percentage}점`,
      icon: TrendingUp,
    })),
    ...recentTodos.slice(0, 3).map((todo) => ({
      type: 'todo' as const,
      date: todo.due_date,
      title: todo.title,
      description: todo.completed_at ? '완료' : '미완료',
      icon: todo.completed_at ? CheckCircle : Clock,
    })),
    ...attendanceRecords.slice(0, 3).map((record) => ({
      type: 'attendance' as const,
      date: record.attendance_sessions?.session_date || '',
      title: record.attendance_sessions?.classes?.name || '출석',
      description:
        record.status === 'present'
          ? '출석'
          : record.status === 'late'
          ? '지각'
          : '결석',
      icon:
        record.status === 'present'
          ? CheckCircle
          : record.status === 'late'
          ? Clock
          : AlertCircle,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  // 주의 필요 항목
  const alerts = []

  // 미완료 과제
  const incompleteTodos = recentTodos.filter((t) => !t.completed_at)
  if (incompleteTodos.length > 0) {
    alerts.push({
      type: 'warning',
      icon: Clock,
      title: `미완료 과제 ${incompleteTodos.length}개`,
      description: '확인이 필요합니다',
    })
  }

  // 최근 결석
  const recentAbsences = attendanceRecords
    .filter((r) => r.status === 'absent')
    .slice(0, 3)
  if (recentAbsences.length >= 2) {
    alerts.push({
      type: 'alert',
      icon: AlertCircle,
      title: '최근 결석 빈도 높음',
      description: '상담이 필요할 수 있습니다',
    })
  }

  // 최근 상담 없음
  if (consultations.length === 0 ||
      (consultations[0] &&
       new Date().getTime() - new Date(consultations[0].consultation_date).getTime() >
       30 * 24 * 60 * 60 * 1000)) {
    alerts.push({
      type: 'info',
      icon: Users,
      title: '상담 필요',
      description: '최근 30일 내 상담 기록이 없습니다',
    })
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Quick Stats Grid */}
      <motion.div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">수강 중</p>
                <p className="text-2xl font-bold">
                  {(student.class_enrollments as unknown as ClassEnrollment[])?.filter((ce) => ce.status === 'active')
                    .length || 0}
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
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">평균 성적</p>
                <p className="text-2xl font-bold">
                  {recentScores.length > 0
                    ? Math.round(
                        recentScores
                          .slice(0, 5)
                          .reduce((sum, s) => sum + s.percentage, 0) /
                          Math.min(recentScores.length, 5)
                      )
                    : '-'}
                  {recentScores.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      점
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">과제 완료율</p>
                <p className="text-2xl font-bold">
                  {recentTodos.length > 0
                    ? Math.round(
                        (recentTodos.filter((t) => t.completed_at).length /
                          recentTodos.length) *
                          100
                      )
                    : '-'}
                  {recentTodos.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      %
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">등록일</p>
                <p className="text-sm font-semibold">
                  {formatDate(new Date(student.enrollment_date), 'yyyy.MM.dd', {
                    locale: ko,
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.floor(
                    (new Date().getTime() -
                      new Date(student.enrollment_date).getTime()) /
                      (1000 * 60 * 60 * 24)
                  )}
                  일째
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Alerts & Notices */}
      {alerts.length > 0 && (
        <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">주의 사항</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    alert.type === 'alert'
                      ? 'border-destructive/50 bg-destructive/5'
                      : alert.type === 'warning'
                      ? 'border-orange-500/50 bg-orange-500/5'
                      : 'border-blue-500/50 bg-blue-500/5'
                  }`}
                >
                  <alert.icon
                    className={`h-5 w-5 mt-0.5 ${
                      alert.type === 'alert'
                        ? 'text-destructive'
                        : alert.type === 'warning'
                        ? 'text-orange-500'
                        : 'text-blue-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </motion.div>
      )}

      <motion.div className="grid gap-6 lg:grid-cols-2" variants={itemVariants}>
        {/* Points Widget */}
        <StudentPointsWidget studentId={student.id} />

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  최근 활동이 없습니다
                </p>
              ) : (
                recentActivities.map((activity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <activity.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDate(new Date(activity.date), 'M/d', { locale: ko })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Class Enrollments */}
      {student.class_enrollments && student.class_enrollments.length > 0 && (
        <motion.div variants={itemVariants}>
        <ClassEnrollmentsList
          enrollments={student.class_enrollments as unknown as ClassEnrollment[]}
          onUpdate={onRefresh || (() => {})}
        />
        </motion.div>
      )}
    </motion.div>
  )
}
