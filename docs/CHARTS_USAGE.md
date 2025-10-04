# 차트 컴포넌트 사용 가이드

## 개요

Acadesk Web에서 사용할 수 있는 차트 컴포넌트들입니다. shadcn/ui의 chart 컴포넌트와 recharts를 기반으로 구현되었습니다.

## 설치된 차트 컴포넌트

### 1. 성적 시각화

#### GradesLineChart
**용도**: 특정 학생의 시험별 점수 추이 (성적 상승/하락 흐름 파악)

```tsx
import { GradesLineChart } from '@/components/features/charts'

<GradesLineChart
  data={[
    { examName: '1차 모의고사', score: 85, classAverage: 78 },
    { examName: '2차 모의고사', score: 88, classAverage: 80 },
    { examName: '기말고사', score: 92, classAverage: 82 },
  ]}
  title="성적 추이"
  description="시험별 점수 변화"
  showClassAverage={true}
/>
```

#### GradesBarChart
**용도**: 반 평균 / 최고점 / 최저점 비교, 개별 학생 성적 vs 반 평균 성적

```tsx
import { GradesBarChart } from '@/components/features/charts'

<GradesBarChart
  data={[
    { subject: '수학', score: 90, classAverage: 75, highest: 98, lowest: 45 },
    { subject: '영어', score: 85, classAverage: 80, highest: 95, lowest: 60 },
    { subject: '국어', score: 88, classAverage: 82, highest: 96, lowest: 55 },
  ]}
  title="과목별 성적"
  description="과목별 점수 비교"
  showComparison={true}
/>
```

---

### 2. 과제율 시각화

#### TodoCompletionDonut
**용도**: 완료 vs 미완료 비율 (도넛 차트)

```tsx
import { TodoCompletionDonut } from '@/components/features/charts'

<TodoCompletionDonut
  data={{
    completed: 45,
    incomplete: 5,
  }}
  title="과제 완료율"
  description="완료 vs 미완료 비율"
/>
```

#### TodoCompletionBar
**용도**: 월별/주별 과제 완료율 트렌드, 특정 학생 vs 반 평균 비교

```tsx
import { TodoCompletionBar } from '@/components/features/charts'

<TodoCompletionBar
  data={[
    { period: '1주차', completionRate: 90, classAverage: 85 },
    { period: '2주차', completionRate: 85, classAverage: 82 },
    { period: '3주차', completionRate: 95, classAverage: 88 },
    { period: '4주차', completionRate: 92, classAverage: 87 },
  ]}
  title="과제 완료율 추이"
  description="주별 과제 완료율"
  showClassAverage={true}
/>
```

---

### 3. 출석율 시각화

#### AttendanceComboChart
**용도**: 출석 / 지각 / 결석 횟수 + 출석율(%) 라인으로 오버레이

```tsx
import { AttendanceComboChart } from '@/components/features/charts'

<AttendanceComboChart
  data={[
    { period: '1월', present: 20, late: 2, absent: 0, rate: 95 },
    { period: '2월', present: 18, late: 1, absent: 1, rate: 92.5 },
    { period: '3월', present: 22, late: 0, absent: 0, rate: 100 },
  ]}
  title="출석 현황"
  description="출석/지각/결석 횟수 및 출석율"
/>
```

#### AttendanceHeatmap
**용도**: 날짜별 출석 상태를 색상으로 표시 (출석=초록, 지각=노랑, 결석=빨강)

```tsx
import { AttendanceHeatmap } from '@/components/features/charts'

<AttendanceHeatmap
  data={[
    { date: new Date(2025, 9, 1), status: 'present' },
    { date: new Date(2025, 9, 2), status: 'present' },
    { date: new Date(2025, 9, 3), status: 'late', note: '교통 지연' },
    { date: new Date(2025, 9, 4), status: 'absent', note: '병가' },
    { date: new Date(2025, 9, 5), status: 'present' },
    // ... more dates
  ]}
  title="출석 캘린더"
  description="월별 출석 현황"
  year={2025}
  month={10}
/>
```

---

### 4. 종합 대시보드

#### StudentDashboardCharts
**용도**: 학생 개별 페이지 종합 차트 (성적 + 출석 + 과제)

```tsx
import { StudentDashboardCharts } from '@/components/features/charts/student-dashboard-charts'

<StudentDashboardCharts
  studentId="student-123"
  gradesData={[
    { examName: '1차 모의고사', score: 85, classAverage: 78 },
    { examName: '2차 모의고사', score: 88, classAverage: 80 },
  ]}
  todoData={{
    completed: 45,
    incomplete: 5,
  }}
  attendanceData={[
    { date: new Date(2025, 9, 1), status: 'present' },
    { date: new Date(2025, 9, 2), status: 'late' },
    // ... more dates
  ]}
  year={2025}
  month={10}
/>
```

#### ClassDashboardCharts
**용도**: 반 단위 페이지 종합 차트 (반별 성적 분포 + 과제율 + 출석)

```tsx
import { ClassDashboardCharts } from '@/components/features/charts/class-dashboard-charts'

<ClassDashboardCharts
  classId="class-123"
  gradesData={[
    { subject: '수학', score: 90, classAverage: 75 },
    { subject: '영어', score: 85, classAverage: 80 },
  ]}
  todoTrendData={[
    { period: '1주차', completionRate: 90 },
    { period: '2주차', completionRate: 85 },
  ]}
  attendanceData={[
    { period: '1월', present: 20, late: 2, absent: 0, rate: 95 },
    { period: '2월', present: 18, late: 1, absent: 1, rate: 92.5 },
  ]}
/>
```

---

## 리포트에 차트 통합하기

### 예시: 월간 리포트 페이지에 차트 추가

```tsx
// src/app/reports/page.tsx

import { StudentDashboardCharts } from '@/components/features/charts/student-dashboard-charts'

export default function ReportsPage() {
  // ... 기존 코드 ...

  return (
    <DashboardLayout>
      {/* ... 기존 리포트 생성 UI ... */}

      {reportData && (
        <div className="space-y-6">
          {/* 학생 정보 카드 */}
          <Card>...</Card>

          {/* 차트 추가 */}
          <StudentDashboardCharts
            studentId={reportData.student.id}
            gradesData={reportData.gradesChartData}
            todoData={{
              completed: reportData.homework.completed,
              incomplete: reportData.homework.total - reportData.homework.completed,
            }}
            attendanceData={reportData.attendanceChartData}
            year={selectedYear}
            month={selectedMonth}
          />

          {/* 기존 출석/과제 통계 카드들 */}
          {/* 기존 영역별 성적 카드 */}
          {/* 기존 강사 코멘트 카드 */}
        </div>
      )}
    </DashboardLayout>
  )
}
```

---

## 데이터 형식

### ReportGenerator에서 차트 데이터 추가 필요

`src/services/report-generator.ts`에서 다음 데이터를 추가로 생성해야 합니다:

```typescript
export interface ReportData {
  // ... 기존 필드들 ...

  // 차트용 데이터 추가
  gradesChartData: Array<{
    examName: string
    score: number
    classAverage?: number
    date?: string
  }>

  attendanceChartData: Array<{
    date: Date
    status: 'present' | 'late' | 'absent' | 'none'
    note?: string
  }>
}
```

---

## 스타일 커스터마이징

차트 색상은 Tailwind CSS 변수를 사용합니다:

```css
/* globals.css */
:root {
  --chart-1: 220 70% 50%;  /* 파랑 */
  --chart-2: 160 60% 45%;  /* 초록 */
  --chart-3: 30 80% 55%;   /* 주황 */
  --chart-4: 280 65% 60%;  /* 보라 */
  --chart-5: 340 75% 55%;  /* 빨강 */
}
```

---

## 주의사항

1. **데이터 포맷**: 모든 날짜는 JavaScript `Date` 객체여야 합니다
2. **퍼센트 값**: 0-100 사이의 숫자로 입력 (`%` 기호 제외)
3. **responsive**: 모든 차트는 반응형으로 설계되어 있습니다
4. **서버 컴포넌트**: 차트 컴포넌트는 'use client'이므로 서버 컴포넌트에서 import 시 주의

---

## 다음 단계

1. `ReportGenerator`에 차트 데이터 생성 로직 추가
2. 리포트 페이지에 차트 컴포넌트 통합
3. PDF 내보내기 기능 구현 시 차트 이미지 포함
