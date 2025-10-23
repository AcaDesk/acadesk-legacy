'use client'

import { useState } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Card } from '@ui/card'
import { Button } from '@ui/button'
import { Badge } from '@ui/badge'
import { Separator } from '@ui/separator'
import {
  Download,
  TrendingUp,
  Calendar,
  Award,
  CheckCircle2,
  BookOpen,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import type { Report } from '@core/domain/entities/Report'
import { ReportGrowthChart } from './ReportGrowthChart'
import { getStudentAvatar } from '@/lib/avatar'

interface ReportViewerContentProps {
  report: Report
}

export function ReportViewerContent({ report }: ReportViewerContentProps) {
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)
  const { data } = report

  const handleDownloadPDF = async () => {
    setIsDownloadingPDF(true)
    try {
      // TODO: PDF 생성 및 다운로드 API 호출
      alert('PDF 다운로드 기능은 준비 중입니다.')
    } catch (error) {
      console.error('PDF download failed:', error)
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  const monthLabel = data.reportMonth
    ? `${data.reportMonth.split('-')[0]}년 ${data.reportMonth.split('-')[1]}월`
    : format(new Date(data.startDate), 'yyyy년 M월', { locale: ko })

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {data.academyName || 'Acadesk'}
                </div>
                <h1 className="text-lg font-bold">학습 리포트</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Student Info Card */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-border flex-shrink-0">
              <Image
                src={getStudentAvatar(
                  data.profileImageUrl,
                  report.studentId || 'unknown',
                  data.studentName
                )}
                alt={data.studentName}
                width={64}
                height={64}
                className="object-cover"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{data.studentName}</h2>
                <Badge variant="outline">{data.grade}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                <span>{monthLabel} 학습 리포트</span>
                {data.instructorName && (
                  <>
                    <span>•</span>
                    <span>담임: {data.instructorName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Award className="h-4 w-4" />
              <span>평균 성적</span>
            </div>
            <div className="text-3xl font-bold">{Math.round(data.avgScore)}</div>
            <div className="text-xs text-muted-foreground">점</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>출석률</span>
            </div>
            <div className="text-3xl font-bold">
              {Math.round(data.attendanceRate)}
            </div>
            <div className="text-xs text-muted-foreground">%</div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <BookOpen className="h-4 w-4" />
              <span>과제 완료율</span>
            </div>
            <div className="text-3xl font-bold">
              {Math.round(data.homeworkRate)}
            </div>
            <div className="text-xs text-muted-foreground">%</div>
          </Card>

          {data.achievementRate !== undefined && (
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                <TrendingUp className="h-4 w-4" />
                <span>목표 달성률</span>
              </div>
              <div className="text-3xl font-bold">
                {Math.round(data.achievementRate)}
              </div>
              <div className="text-xs text-muted-foreground">%</div>
            </Card>
          )}
        </div>

        {/* Growth Chart */}
        {data.chartPoints && data.chartPoints.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              성장 추이
            </h3>
            <ReportGrowthChart chartPoints={data.chartPoints} />
          </Card>
        )}

        {/* Subject Details */}
        {data.subjects && data.subjects.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">과목별 상세</h3>
            <div className="space-y-4">
              {data.subjects.map((subject, index) => (
                <div key={index}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{subject.name}</h4>
                        <Badge variant="secondary">{subject.score}점</Badge>
                      </div>
                      {subject.comment && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {subject.comment}
                        </p>
                      )}
                      {subject.nextGoal && (
                        <div className="text-sm text-primary flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" />
                          <span>다음 목표: {subject.nextGoal}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Exam Results */}
        {data.exams && data.exams.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">시험 결과</h3>
            <div className="space-y-3">
              {data.exams.slice(0, 5).map((exam, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <div className="font-medium">{exam.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(exam.date), 'yyyy.MM.dd', { locale: ko })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{exam.percentage}%</div>
                    {exam.rank && (
                      <div className="text-xs text-muted-foreground">
                        {exam.rank}등
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Attendance Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">출석 현황</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.presentDays}
              </div>
              <div className="text-xs text-muted-foreground">출석</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {data.lateDays}
              </div>
              <div className="text-xs text-muted-foreground">지각</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {data.absentDays}
              </div>
              <div className="text-xs text-muted-foreground">결석</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{data.totalDays}</div>
              <div className="text-xs text-muted-foreground">총 수업일</div>
            </div>
          </div>
        </Card>

        {/* Consultations */}
        {data.consultations && data.consultations.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              상담 기록
            </h3>
            <div className="space-y-3">
              {data.consultations.map((consult, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(consult.date), 'yyyy.MM.dd', {
                        locale: ko,
                      })}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {consult.type}
                    </Badge>
                  </div>
                  <p className="text-sm">{consult.summary}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Overall Comment */}
        {data.overallComment && (
          <Card className="p-6 bg-primary/5 border-primary/20">
            <h3 className="text-lg font-semibold mb-3">담임 선생님 코멘트</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {data.overallComment}
            </p>
          </Card>
        )}

        {/* Next Actions */}
        {data.nextActions && data.nextActions.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">추천 액션</h3>
            <div className="space-y-2">
              {data.nextActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-between"
                  asChild={!!action.url}
                >
                  {action.url ? (
                    <a href={action.url} target="_blank" rel="noopener noreferrer">
                      <span>{action.title}</span>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  ) : (
                    <>
                      <span>{action.title}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-8 text-sm text-muted-foreground">
          <p>{data.academyName || 'Acadesk'}</p>
          {data.academyPhone && <p className="mt-1">문의: {data.academyPhone}</p>}
          <p className="mt-2 text-xs">
            {format(report.createdAt, 'yyyy년 M월 d일 발행', { locale: ko })}
          </p>
        </div>
      </main>
    </div>
  )
}
