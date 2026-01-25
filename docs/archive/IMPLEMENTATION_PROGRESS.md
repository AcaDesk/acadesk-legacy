# 시험 관리 개선 구현 진행 상황

**날짜**: 2025-01-30
**문서**: 구현 완료 및 다음 단계 가이드

---

## ✅ 완료된 작업

### 1. **SQL 마이그레이션 파일 작성** ✅
**파일**: `supabase/migrations/20250130000001_add_exam_improvements.sql`

**추가된 기능:**
- `exams.subject_id` - 과목 연결 (Voca, Reading, Speaking 등)
- `exams.status` - 시험 상태 (scheduled, in_progress, completed, cancelled)
- `exam_scores.status` - 성적 상태 (absent, pending, submitted, retest_required, retest_waived)
- 자동 재시험 판정 트리거 함수 (`check_and_mark_retest`)
- 재시험 대상 학생 뷰 (`students_requiring_retest`)
- 월별 과목 성적 함수 (`get_monthly_subject_scores`)

**적용 방법:**
```bash
# 로컬 DB에 적용
supabase db reset

# 또는 프로덕션에 직접 적용
supabase db push
```

### 2. **시험 유형에 "단어시험" 추가** ✅
**파일**: `src/components/features/exams/ExamForm.tsx:250`

```typescript
<SelectItem value="vocabulary">단어시험</SelectItem>
```

### 3. **반복 주기 필드 UI 추가** ✅
**파일**: `src/components/features/exams/ExamForm.tsx:382-441`

**추가된 옵션:**
- 매일
- 매주 월수금
- 매주 화목
- 매주 (같은 요일)
- 격주
- 매월

### 4. **과목 선택 필드 추가** ✅
**변경된 파일:**
- `src/app/actions/subjects.ts` - `getSubjects()` 함수 추가
- `src/components/features/exams/ExamForm.tsx` - 과목 선택 UI 추가
- `src/app/actions/exams.ts` - `subject_id` 스키마 및 저장 로직 추가

**UI 위치**: 시험명 바로 아래
- 과목 색상 칩과 함께 표시
- 코드가 있으면 함께 표시 (예: Voca (VOC))

---

## 🔧 사용 방법

### SQL 마이그레이션 적용하기

1. **로컬 환경에 적용**:
```bash
cd /Users/lee/Developer/personal/acadesk-web
supabase db reset
```

2. **프로덕션에 적용**:
```bash
supabase db push
```

3. **확인**:
```sql
-- 컬럼이 추가되었는지 확인
\d exams
\d exam_scores

-- 함수가 생성되었는지 확인
\df check_and_mark_retest
\df get_monthly_subject_scores

-- 뷰가 생성되었는지 확인
\dv students_requiring_retest
```

### 시험 생성 워크플로

1. 과목 관리에서 과목 생성 (Voca, Reading, Speaking 등)
2. 시험 생성 시:
   - 과목 선택
   - 시험 유형 선택 (단어시험 등)
   - 합격 점수 설정 (예: 80%)
   - 반복 주기 설정 (정기 시험인 경우)

### 자동 재시험 판정

성적 입력 시 자동으로 판정됩니다:

1. 성적 입력 (예: 15/20 = 75%)
2. 합격 점수 확인 (시험의 `passing_score`)
3. 75% < 80% → 자동으로 `status = 'retest_required'`
4. 재시험 대상 뷰에 자동 표시

---

## 📊 새로 추가된 데이터 구조

### 1. exams 테이블
```sql
exams
├── subject_id UUID (과목 연결)
├── status TEXT (시험 상태)
├── is_recurring BOOLEAN (반복 여부)
├── recurring_schedule TEXT (반복 주기)
└── passing_score NUMERIC (합격 점수)
```

### 2. exam_scores 테이블
```sql
exam_scores
├── status TEXT (absent, pending, submitted, retest_required, retest_waived)
├── is_retest BOOLEAN (재시험 여부)
└── retest_count INT (재시험 횟수)
```

### 3. 뷰: students_requiring_retest
```sql
SELECT
  exam_score_id,
  exam_name,
  student_name,
  student_score,
  passing_score,
  status,
  retest_count
FROM students_requiring_retest
WHERE tenant_id = '...'
```

### 4. 함수: get_monthly_subject_scores
```sql
SELECT *
FROM get_monthly_subject_scores(
  'student_id',
  '2025-01'  -- 년-월
);

-- 결과:
-- subject_name | avg_score | total_exams | improvement_from_prev_month
-- Voca         | 85.5      | 12          | +3.2
-- Reading      | 78.0      | 8           | -1.5
```

---

## 🎯 다음 구현 단계

### Priority 2-A: 재시험 관리 페이지 (1-2시간)
**경로**: `/grades/retests/page.tsx`

**기능:**
- 재시험 대상 학생 목록 표시 (`students_requiring_retest` 뷰 사용)
- 액션:
  - ✅ 재시험에 배정
  - ✅ 재시험 면제 (경고 넘김)
  - ✅ 다른 날로 연기

**구현 포인트:**
```typescript
// 1. 재시험 대상 조회
const { data } = await supabase
  .from('students_requiring_retest')
  .select('*')
  .order('exam_date', { ascending: false })

// 2. 재시험 면제 처리
await supabase
  .from('exam_scores')
  .update({ status: 'retest_waived' })
  .eq('id', examScoreId)

// 3. 재시험 생성 및 배정
const { data: retestExam } = await supabase
  .from('exams')
  .insert({
    name: `${originalExam.name} - 재시험`,
    ...originalExamData,
    is_retest: true
  })

await supabase
  .from('exam_scores')
  .insert({
    exam_id: retestExam.id,
    student_id,
    is_retest: true,
    retest_count: original_retest_count + 1
  })
```

### Priority 2-B: 성적 일괄 입력 개선 (30분)
**파일**: `src/app/(dashboard)/grades/exams/[id]/bulk-score-entry/page.tsx` (추정)

**변경사항:**
- 학생 목록 테이블에 `grade` 컬럼 추가
- 학년별 필터링 옵션
- 미응시 체크박스 (status='absent')

```typescript
// 학생 정보 쿼리 수정
const { data: students } = await supabase
  .from('students')
  .select('id, student_code, grade, users!inner(name)') // grade 추가
  .eq('class_id', classId)

// 미응시 처리
await supabase
  .from('exam_scores')
  .insert({
    exam_id,
    student_id,
    score: 0,
    total_points: 100,
    percentage: 0,
    status: 'absent'  // 미응시 상태
  })
```

### Priority 2-C: 월말 리포트 개선 (2-3시간)

**1. 과목별 성적 집계 컴포넌트**
```typescript
// src/components/features/reports/MonthlySubjectScores.tsx
async function MonthlySubjectScores({ studentId, yearMonth }: Props) {
  const { data } = await supabase
    .rpc('get_monthly_subject_scores', {
      p_student_id: studentId,
      p_year_month: yearMonth
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>월별 과목 성적</CardTitle>
      </CardHeader>
      <CardContent>
        {data.map(subject => (
          <div key={subject.subject_id}>
            <span>{subject.subject_name}</span>
            <Badge>{subject.avg_score}점</Badge>
            {subject.improvement_from_prev_month > 0 && (
              <Badge variant="success">
                +{subject.improvement_from_prev_month}점 📈
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

**2. 핵심 요약 뱃지**
```typescript
// src/components/features/reports/InsightBadges.tsx
export function InsightBadges({ scoreChange, vsClassAvg, homeworkRate }) {
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

---

## 📝 테스트 체크리스트

### 시험 생성
- [ ] 과목 없이 시험 생성 가능
- [ ] 과목 선택하여 시험 생성
- [ ] 단어시험 유형 선택
- [ ] 반복 주기 설정 (매일, 월수금)
- [ ] 합격 점수 설정 (80%)

### 성적 입력 및 재시험 판정
- [ ] 합격 점수 이상 입력 → status='submitted'
- [ ] 합격 점수 미만 입력 → status='retest_required'
- [ ] 재시험 대상 뷰에 표시 확인
- [ ] 미응시 처리 → status='absent'

### 과목별 성적 조회
- [ ] `get_monthly_subject_scores` 함수 호출
- [ ] 과목별 평균 계산 확인
- [ ] 전월 대비 변화 확인

---

## 🎬 즉시 테스트 가능한 기능

### 1. 과목 생성
```
1. http://localhost:3001/settings/subjects 접속
2. "과목 추가" 클릭
3. Voca, Reading, Speaking 과목 생성
```

### 2. 시험 생성 (과목 연결)
```
1. http://localhost:3001/grades/exams 접속
2. "시험 추가" 클릭
3. 과목 선택: Voca
4. 시험 유형: 단어시험
5. 합격 점수: 80
6. 반복 설정: 매일 또는 매주 월수금
```

### 3. 성적 입력 (자동 재시험 판정)
```
1. 시험 상세 페이지 접속
2. 학생 점수 입력: 15/20 (75%)
3. 저장 → 자동으로 재시험 대상 마킹됨
```

---

## 🐛 알려진 이슈 / 제한사항

1. **정기 시험 자동 생성**: 아직 구현되지 않음
   - 현재: 수동으로 시험 생성
   - 향후: Cron job으로 자동 생성

2. **재시험 자동 생성**: 아직 구현되지 않음
   - 현재: 재시험 판정만 자동
   - 향후: 재시험 시험 자동 생성 및 배정

3. **월말 리포트 UI**: 아직 통합되지 않음
   - 현재: RPC 함수만 사용 가능
   - 향후: 컴포넌트로 통합

---

## 📚 참고 문서

- [전체 개선 방안](./EXAM_WORKFLOW_IMPROVEMENT.md)
- [데이터베이스 스키마](../db/schema/03_academy/038_exams.sql)
- [마이그레이션 파일](../supabase/migrations/20250130000001_add_exam_improvements.sql)

---

**작성자**: Claude Code
**최종 업데이트**: 2025-01-30
