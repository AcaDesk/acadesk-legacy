'use client'

import { GradesBarChart } from './grades-bar-chart'
import { TodoCompletionBar } from './todo-completion-bar'
import { AttendanceComboChart } from './attendance-combo-chart'

interface ClassDashboardChartsProps {
  classId: string
  // 반별 성적 데이터
  gradesData: Array<{
    subject: string
    score: number
    classAverage?: number
    highest?: number
    lowest?: number
  }>
  // 반별 과제 완료율 추이
  todoTrendData: Array<{
    period: string
    completionRate: number
    classAverage?: number
  }>
  // 반별 출석 현황
  attendanceData: Array<{
    period: string
    present: number
    late: number
    absent: number
    rate: number
  }>
}

export function ClassDashboardCharts({
  gradesData,
  todoTrendData,
  attendanceData,
}: ClassDashboardChartsProps) {
  return (
    <div className="space-y-6">
      {/* 반별 성적 분포 */}
      <div className="w-full">
        <GradesBarChart
          data={gradesData}
          title="과목별 성적 분포"
          description="반 평균 및 최고/최저점 비교"
          showComparison
        />
      </div>

      {/* 과제 완료율 & 출석 현황 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 과제 완료율 추이 */}
        <TodoCompletionBar
          data={todoTrendData}
          title="과제 완료율 추이"
          description="월별 과제 완료율 변화"
          showClassAverage={false}
        />

        {/* 출석 현황 */}
        <AttendanceComboChart
          data={attendanceData}
          title="출석 현황"
          description="월별 출석/지각/결석 및 출석율"
        />
      </div>
    </div>
  )
}
