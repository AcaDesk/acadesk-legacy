'use client'

import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Minus, Plus, BarChart3, LineChart as LineChartIcon } from 'lucide-react'
import { GradesLineChart } from '@/components/features/charts/grades-line-chart'
import { SubjectBarChart } from '@/components/features/charts/subject-bar-chart'
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

export function GradesTab() {
  const router = useRouter()
  const { recentScores, classAverages, student } = useStudentDetail()

  const getTrendIcon = (score: number, classAvg: number) => {
    const diff = score - classAvg
    if (diff > 5) return <TrendingUp className="h-4 w-4 text-foreground" />
    if (diff < -5) return <TrendingDown className="h-4 w-4 text-muted-foreground" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  // 차트 데이터 변환
  const gradesChartData = recentScores.map((score) => ({
    examName: score.exams?.name || '시험',
    score: score.percentage,
    classAverage: classAverages[score.exam_id] || undefined,
    date: score.exams?.exam_date,
  }))

  // 과목별 성적 분석 (최근 점수 기준)
  const subjectScores = recentScores.reduce((acc: Record<string, number[]>, score) => {
    const subject = score.exams?.class_id || 'unknown'
    if (!acc[subject]) {
      acc[subject] = []
    }
    acc[subject].push(score.percentage)
    return acc
  }, {} as Record<string, number[]>)

  // 레이더 차트 데이터 (최신 성적 기준으로 과목별 평균)
  const radarChartData = Object.entries(subjectScores).map(([subject, scores]: [string, number[]]) => ({
    subject: subject.substring(0, 10), // 과목명 축약
    score: Math.round(scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length),
  }))

  // 성적 통계
  const totalScores = recentScores.length
  const avgScore = totalScores > 0
    ? Math.round(recentScores.reduce((sum, s) => sum + s.percentage, 0) / totalScores)
    : 0
  const highestScore = totalScores > 0
    ? Math.max(...recentScores.map(s => s.percentage))
    : 0
  const lowestScore = totalScores > 0
    ? Math.min(...recentScores.map(s => s.percentage))
    : 0

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Quick Stats */}
      <motion.div className="grid gap-4 md:grid-cols-4" variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">시험 횟수</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold">{totalScores}</p>
                <span className="text-sm text-muted-foreground">회</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">평균 점수</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold">{avgScore}</p>
                <span className="text-sm text-muted-foreground">점</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">최고 점수</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold text-foreground">{highestScore}</p>
                <span className="text-sm text-muted-foreground">점</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">최저 점수</p>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-bold">{lowestScore}</p>
                <span className="text-sm text-muted-foreground">점</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts */}
      {recentScores.length > 0 ? (
        <motion.div className="space-y-6" variants={itemVariants}>
          <GradesLineChart
            data={gradesChartData}
            title="성적 추세"
            description="시험별 점수 및 반 평균 비교"
            showClassAverage
          />

          {radarChartData.length > 0 && (
            <SubjectBarChart
              data={radarChartData}
              title="과목별 성적 분포"
              description="과목별 평균 점수 및 비교 분석"
            />
          )}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">아직 시험 성적이 없습니다</p>
            <Button
              size="sm"
              onClick={() => router.push('/grades/exams')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              첫 성적 입력하기
            </Button>
          </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Detailed Exam Scores */}
      <motion.div variants={itemVariants}>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">시험 성적 목록</CardTitle>
            <Button
              size="sm"
              onClick={() => router.push('/grades/exams')}
              className="gap-2 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              성적 입력
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentScores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              성적 기록이 없습니다
            </p>
          ) : (
            <div className="space-y-2">
              {recentScores.map((score) => {
                const classAvg = classAverages[score.exam_id] || 0
                return (
                  <div
                    key={score.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm break-words">
                        {score.exams?.name || '시험'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {score.exams?.exam_date &&
                            formatDate(new Date(score.exams.exam_date), 'yyyy.MM.dd', {
                              locale: ko,
                            })}
                        </p>
                        {score.exams?.category_code && (
                          <Badge variant="outline" className="text-xs">
                            {score.exams.category_code}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      {classAvg > 0 && (
                        <div className="text-center shrink-0">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">학급 평균</p>
                          <p className="text-sm font-medium">{classAvg}점</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 shrink-0">
                        {classAvg > 0 && getTrendIcon(score.percentage, classAvg)}
                        <div className="text-right">
                          <p className="text-2xl font-bold">{score.percentage}</p>
                          <p className="text-xs text-muted-foreground">점</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {recentScores.length > 10 && (
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => router.push('/grades/list')}
                >
                  전체 성적 보기 ({recentScores.length}개)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  )
}
