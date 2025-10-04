'use client'

import { GradesLineChart } from './grades-line-chart'
import { TodoCompletionDonut } from './todo-completion-donut'
import { AttendanceHeatmap } from './attendance-heatmap'

interface StudentDashboardChartsProps {
  studentId: string
  // Grades data
  gradesData: Array<{
    examName: string
    score: number
    classAverage?: number
    date?: string
  }>
  // Todo data
  todoData: {
    completed: number
    incomplete: number
  }
  // Attendance data
  attendanceData: Array<{
    date: Date
    status: 'present' | 'late' | 'absent' | 'none'
    note?: string
  }>
  year?: number
  month?: number
}

export function StudentDashboardCharts({
  gradesData,
  todoData,
  attendanceData,
  year,
  month,
}: StudentDashboardChartsProps) {
  return (
    <div className="space-y-6">
      {/* 성적 추세 */}
      <div className="w-full">
        <GradesLineChart
          data={gradesData}
          title="성적 추세"
          description="시험별 점수 및 반 평균 비교"
          showClassAverage
        />
      </div>

      {/* 출석율 & 과제율 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 출석 히트맵 */}
        <AttendanceHeatmap
          data={attendanceData}
          title="출석 현황"
          description="월별 출석 캘린더"
          year={year}
          month={month}
        />

        {/* 과제 완료율 도넛 차트 */}
        <TodoCompletionDonut
          data={todoData}
          title="과제 완료율"
          description="완료 vs 미완료 비율"
        />
      </div>
    </div>
  )
}
