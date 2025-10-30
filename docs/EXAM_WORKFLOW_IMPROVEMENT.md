# 시험 관리 및 월말 리포트 개선 방안

## 📋 현재 시스템 분석

### 기존 데이터 모델
```
과목 (subjects)
├── id, name, code, color
├── description
└── sort_order

시험 (exams)
├── id, name, exam_type, exam_date
├── category_code (ref_exam_categories)
├── class_id (수업 연결)
├── total_questions, passing_score
├── is_recurring ✅ (이미 있음)
├── recurring_schedule ✅ (이미 있음)
└── description

시험 성적 (exam_scores)
├── exam_id, student_id
├── score, total_points, percentage
├── is_retest ✅ (이미 있음)
├── retest_count ✅ (이미 있음)
└── feedback

시험 분류 (ref_exam_categories)
├── midterm (중간고사)
├── final (기말고사)
├── quiz (퀴즈)
├── mock (모의고사)
└── practice (연습시험)
```

### 문제점

#### 1. **과목 vs 시험 분류의 혼란**
- 영어 학원의 경우:
  - 과목: Voca, Reading, Speaking, Grammar, Writing
  - 시험 유형: 단어시험, 퀴즈, 월말평가 등
- 현재 시스템:
  - 과목(subjects)은 있지만 수업(classes)과만 연결
  - 시험(exams)은 수업에 연결되지만 과목과 직접 연결 없음
  - **⇒ 과목별 성적 집계가 어려움**

#### 2. **단어 시험 특성 미반영**
- 매일 또는 정기적으로 반복되는 단어 시험
- 80% 미달 시 자동 재시험 처리 필요
- 미응시 처리 및 보충 시험 일정 관리 필요
- **⇒ 현재는 수동으로 관리해야 함**

#### 3. **월말 리포트 데이터 부족**
월말 리포트 요구사항:
- ✅ 5과목(Reading, Speaking, Grammar/Writing, Voca, 기타) 점수
- ✅ 과목별 평균 및 전체 평균
- ✅ 성적 추이 그래프
- ✅ 과제 성취율, 출석률
- ✅ 한 달 전 대비 변화
- ❌ **핵심 요약 뱃지**: 데이터는 있지만 UI 없음
- ❌ **AI 코멘트 자동 생성**: 기능 없음

---

## 🎯 개선 방안

### Phase 1: 시험-과목 연결 강화

#### 1.1. 시험에 과목(subject_id) 추가
```sql
-- Migration: Add subject_id to exams
ALTER TABLE exams
  ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

CREATE INDEX idx_exams_subject ON exams(subject_id) WHERE deleted_at IS NULL;
```

**효과:**
- 과목별 성적 집계 가능
- 월말 리포트에서 과목별 점수 자동 산출

#### 1.2. 시험 유형에 "단어시험" 추가
```typescript
// src/components/features/exams/ExamForm.tsx
<SelectItem value="vocabulary">단어시험</SelectItem>
```

#### 1.3. 시험 상태 추가
```sql
-- Migration: Add exam status tracking
ALTER TABLE exams
  ADD COLUMN status TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'));

ALTER TABLE exam_scores
  ADD COLUMN status TEXT DEFAULT 'submitted'
    CHECK (status IN ('absent', 'pending', 'submitted', 'retest_required', 'retest_waived'));
```

**상태 정의:**
- `absent`: 미응시
- `pending`: 대기 (다른 날로 연기)
- `submitted`: 제출 완료
- `retest_required`: 재시험 대상 (80% 미달)
- `retest_waived`: 재시험 면제 (강사가 경고 넘김)

---

### Phase 2: 단어 시험 워크플로 자동화

#### 2.1. 정기 시험 자동 생성
```typescript
// src/app/actions/exams.ts

/**
 * 정기 시험 템플릿 생성
 * 예: 월수금 단어시험
 */
export async function createRecurringExamTemplate(input: {
  name: string
  subject_id: string
  exam_type: 'vocabulary'
  recurring_schedule: 'daily' | 'weekly_mon_wed_fri' | 'weekly_tue_thu' | 'custom'
  custom_days?: number[] // [1, 3, 5] = 월수금
  time: string // "09:00"
  total_questions: number
  passing_score: number // 80
  class_id?: string
}) {
  // 1. 템플릿 생성
  // 2. 다음 4주치 시험 자동 생성
  // 3. Cron job으로 매주 새로운 시험 생성
}
```

#### 2.2. 성적 입력 시 자동 재시험 판정
```typescript
// src/app/actions/exam-scores.ts

export async function submitExamScore(input: {
  exam_id: string
  student_id: string
  score: number
  total_points: number
}) {
  const percentage = (score / total_points) * 100

  // 1. 성적 저장
  const scoreData = await insertExamScore({
    ...input,
    percentage,
    status: percentage < 80 ? 'retest_required' : 'submitted'
  })

  // 2. 80% 미달 시 자동으로 재시험 생성 및 배정
  if (percentage < 80) {
    await createRetestAndAssign(exam_id, student_id)
  }

  return scoreData
}
```

#### 2.3. 재시험 관리 페이지
```typescript
// src/app/(dashboard)/grades/retests/page.tsx

/**
 * 재시험 대상 학생 목록
 * - 80% 미달 학생 자동 표시
 * - 액션:
 *   ✅ 재시험에 배정
 *   ✅ 재시험 면제 (경고 넘김)
 *   ✅ 다른 날로 연기
 */
```

---

### Phase 3: 성적 입력 개선

#### 3.1. 일괄 입력 페이지 개선
```typescript
// 학생 정보에 학년 추가
interface StudentForBulkInput {
  id: string
  name: string
  student_code: string
  grade: string // ⭐ 추가
  class_name: string
  score?: number
  status?: 'absent' | 'pending' | 'submitted'
}
```

**UI 개선:**
- 학생 목록에 학년 컬럼 추가
- 학년별 필터링 기능
- 미응시 체크박스
- 키보드 단축키 (Tab, Enter로 빠른 입력)

#### 3.2. 과목별 직접 성적 입력
```typescript
// src/app/(dashboard)/grades/subject-scores/page.tsx

/**
 * 과목별 성적 직접 입력
 * - 과목 선택 (Voca, Reading, Speaking, etc.)
 * - 기간 선택 (월말평가 용)
 * - 학생별 점수 입력
 * - 시험 없이도 성적 기록 가능
 */
export async function createDirectSubjectScore(input: {
  student_id: string
  subject_id: string
  score: number
  total_points: number
  score_date: string
  note?: string
}) {
  // subject_scores 테이블에 직접 저장
  // (시험과 독립적)
}
```

---

### Phase 4: 월말 리포트 개선

#### 4.1. 과목별 성적 집계 함수
```sql
-- Function: 월별 과목 성적 평균
CREATE OR REPLACE FUNCTION get_monthly_subject_scores(
  p_student_id UUID,
  p_year_month TEXT -- '2025-01'
) RETURNS TABLE (
  subject_id UUID,
  subject_name TEXT,
  avg_score NUMERIC,
  total_exams INT,
  improvement_from_prev_month NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH current_month AS (
    SELECT
      s.id AS subject_id,
      s.name AS subject_name,
      AVG(es.percentage) AS avg_score,
      COUNT(es.id) AS total_exams
    FROM subjects s
    LEFT JOIN exams e ON e.subject_id = s.id
    LEFT JOIN exam_scores es ON es.exam_id = e.id AND es.student_id = p_student_id
    WHERE
      TO_CHAR(e.exam_date, 'YYYY-MM') = p_year_month
      AND es.deleted_at IS NULL
    GROUP BY s.id, s.name
  ),
  prev_month AS (
    SELECT
      s.id AS subject_id,
      AVG(es.percentage) AS avg_score
    FROM subjects s
    LEFT JOIN exams e ON e.subject_id = s.id
    LEFT JOIN exam_scores es ON es.exam_id = e.id AND es.student_id = p_student_id
    WHERE
      TO_CHAR(e.exam_date, 'YYYY-MM') = TO_CHAR((p_year_month || '-01')::DATE - INTERVAL '1 month', 'YYYY-MM')
      AND es.deleted_at IS NULL
    GROUP BY s.id
  )
  SELECT
    cm.subject_id,
    cm.subject_name,
    cm.avg_score,
    cm.total_exams,
    cm.avg_score - COALESCE(pm.avg_score, 0) AS improvement_from_prev_month
  FROM current_month cm
  LEFT JOIN prev_month pm ON pm.subject_id = cm.subject_id;
END;
$$ LANGUAGE plpgsql;
```

#### 4.2. 핵심 요약 뱃지 컴포넌트
```typescript
// src/components/features/reports/InsightBadges.tsx

export function InsightBadges({
  scoreChange,
  vsClassAvg,
  homeworkRate
}: InsightProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {scoreChange > 0 && (
        <Badge variant="success">
          지난 시험 대비 +{scoreChange}점 📈
        </Badge>
      )}
      {vsClassAvg > 0 && (
        <Badge variant="info">
          반 평균 대비 +{vsClassAvg}점 👍
        </Badge>
      )}
      {homeworkRate > 20 && (
        <Badge variant="accent">
          과제 완료율 {homeworkRate}% 상승 🚀
        </Badge>
      )}
    </div>
  )
}
```

#### 4.3. AI 코멘트 자동 생성 (선택사항)
```typescript
// src/lib/ai/generate-report-comment.ts

/**
 * OpenAI API를 사용하여 데이터 기반 코멘트 자동 생성
 *
 * 입력 데이터:
 * - 출석률, 과제 완료율
 * - 과목별 점수 및 추이
 * - 반 평균 대비 위치
 *
 * 출력:
 * - 자연스러운 한국어 코멘트 (강사 톤)
 * - 강사가 수정/보완 가능
 */
export async function generateInstructorComment(data: ReportData) {
  const prompt = `
  다음 학생의 이번 달 성적 데이터를 바탕으로 학부모에게 보낼 강사 코멘트를 작성해주세요:

  - 출석률: ${data.attendance.rate}%
  - 과제 완료율: ${data.homework.rate}%
  - Reading: ${data.scores.reading} (전월 대비 ${data.scores.reading_change})
  - Speaking: ${data.scores.speaking} (전월 대비 ${data.scores.speaking_change})
  - Voca: ${data.scores.voca} (전월 대비 ${data.scores.voca_change})

  톤: 따뜻하고 전문적인 강사
  길이: 3-5 문장
  구조: 긍정적 변화 강조 → 구체적 데이터 언급 → 다음 목표 제시
  `

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  })

  return response.choices[0].message.content
}
```

---

## 📊 데이터베이스 마이그레이션 요약

```sql
-- 1. 시험-과목 연결
ALTER TABLE exams ADD COLUMN subject_id UUID REFERENCES subjects(id);

-- 2. 시험 상태
ALTER TABLE exams ADD COLUMN status TEXT DEFAULT 'scheduled';

-- 3. 성적 상태 (미응시/재시험)
ALTER TABLE exam_scores ADD COLUMN status TEXT DEFAULT 'submitted';

-- 4. 시험 유형에 "vocabulary" 추가 (코드 레벨)

-- 5. 과목별 직접 성적 입력 테이블 (선택)
CREATE TABLE subject_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  student_id UUID NOT NULL REFERENCES students(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  score NUMERIC(5,2) NOT NULL,
  total_points INT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  score_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎬 구현 우선순위

### ⭐ Priority 1 (즉시 적용 가능)
1. ✅ **시험 유형에 "단어시험" 추가** → ExamForm.tsx 수정만
2. ✅ **성적 일괄 입력에 학년 표시** → UI 수정만
3. ✅ **핵심 요약 뱃지** → 컴포넌트 추가

### ⭐⭐ Priority 2 (DB 마이그레이션 필요)
4. **시험-과목 연결** → subject_id 컬럼 추가
5. **성적 상태 관리** → status 컬럼 추가
6. **자동 재시험 판정** → 로직 구현

### ⭐⭐⭐ Priority 3 (장기 과제)
7. 정기 시험 자동 생성 (Cron job)
8. 과목별 직접 성적 입력
9. AI 코멘트 자동 생성

---

## 💡 즉시 적용 가능한 Quick Wins

### 1. 단어시험 추가 (5분)
```typescript
// src/components/features/exams/ExamForm.tsx:244
<SelectItem value="vocabulary">단어시험</SelectItem>
```

### 2. 일괄 입력 학년 표시 (10분)
성적 일괄 입력 페이지에서 학생 정보 쿼리에 `grade` 추가

### 3. 핵심 요약 뱃지 (30분)
월말 리포트에 InsightBadges 컴포넌트 추가

---

## 📝 다음 단계

1. **우선순위 확인**: 어떤 기능부터 구현할지 결정
2. **DB 마이그레이션 작성**: subject_id, status 컬럼 추가
3. **UI 구현**: 재시험 관리 페이지, 개선된 일괄 입력
4. **로직 구현**: 자동 재시험 판정, 과목별 집계
5. **리포트 개선**: 뱃지, 그래프, AI 코멘트

---

**작성일**: 2025-01-30
**버전**: 1.0
