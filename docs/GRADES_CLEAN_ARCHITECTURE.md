# Grades 도메인 Clean Architecture

Grades (시험 성적) 도메인을 Clean Architecture로 리팩토링한 문서입니다.

## 완료된 작업

### 1. Domain Layer (도메인 레이어)

#### Value Objects
- **`Score`** src/domain/value-objects/Score.ts
  - 점수 (맞은 문항 수 / 전체 문항 수) 관리
  - 30/32 형식 파싱 지원
  - 득점률 자동 계산 (백분율, 정수)
  - 합격 여부 판정
  - 등급 (A/B/C/D/F) 계산

#### Entities
- **`ExamScore`** - src/domain/entities/ExamScore.ts
  - 시험 성적 엔티티
  - 비즈니스 로직: 득점률, 합격 여부, 등급, 재시험 처리
  - 불변성 보장

- **`Exam`** - src/domain/entities/Exam.ts
  - 시험 엔티티
  - 비즈니스 로직: 시험까지 남은 일수, 지난 시험 여부
  - 시험 정보 업데이트

#### Repository Interfaces
- **`IExamScoreRepository`** - src/domain/repositories/IExamScoreRepository.ts
  - 성적 데이터 접근 계약
  - 통계 조회, 저성취자 조회 등

- **`IExamRepository`** - src/domain/repositories/IExamRepository.ts
  - 시험 데이터 접근 계약
  - 임박한 시험, 지난 시험 조회 등

### 2. Infrastructure Layer (인프라 레이어)

- **`SupabaseExamScoreRepository`** - src/infrastructure/database/SupabaseExamScoreRepository.ts
  - IExamScoreRepository 구현
  - 시험별/학생별 통계 계산
  - 일괄 저장 지원

- **`SupabaseExamRepository`** - src/infrastructure/database/SupabaseExamRepository.ts
  - IExamRepository 구현
  - 카테고리별, 기간별 조회
  - 소프트 삭제

## 주요 비즈니스 로직

### 1. Score Value Object
```typescript
// 30/32 형식 파싱
const score = Score.fromString("30/32")

// 득점률 자동 계산
console.log(score.getPercentage())      // 93.75
console.log(score.getPercentageInt())   // 94

// 합격 여부 (기본 70점)
console.log(score.isPassed())           // true

// 등급
console.log(score.getGrade())           // 'A'
```

### 2. ExamScore Entity
```typescript
const examScore = ExamScore.create({
  tenantId: 'tenant-id',
  examId: 'exam-id',
  studentId: 'student-id',
  score: Score.create(30, 32),
  feedback: '잘했습니다',
})

// 비즈니스 로직
console.log(examScore.getPercentage())  // 94
console.log(examScore.isPassed())       // true
console.log(examScore.getGrade())       // 'A'

// 재시험 처리
const retestScore = examScore.markAsRetest()
```

### 3. 성적 통계
```typescript
const stats = await repository.getStatsByExam(examId)
// {
//   total: 25,
//   passed: 20,
//   failed: 5,
//   averagePercentage: 82,
//   gradeDistribution: {
//     A: 10,
//     B: 8,
//     C: 5,
//     D: 2,
//     F: 0
//   }
// }
```

## 데이터베이스 매핑

### exam_scores 테이블
```
id                  → ExamScore.id
tenant_id           → ExamScore.tenantId
exam_id             → ExamScore.examId
student_id          → ExamScore.studentId
score               → Score.correct
total_points        → Score.total
percentage          → (계산값, Score에서 자동 생성)
feedback            → ExamScore.feedback
is_retest           → ExamScore.isRetest
retest_count        → ExamScore.retestCount
```

### exams 테이블
```
id                  → Exam.id
tenant_id           → Exam.tenantId
class_id            → Exam.classId
name                → Exam.name
category_code       → Exam.categoryCode
exam_date           → Exam.examDate
total_questions     → Exam.totalQuestions
description         → Exam.description
```

## 사용 예시

### 성적 입력 (기존 코드에서)
```typescript
// Before - 직접 Supabase 호출
const { error } = await supabase.from('exam_scores').insert({
  tenant_id: tenantId,
  exam_id: examId,
  student_id: studentId,
  score: 30,
  total_points: 32,
  percentage: 93.75,  // 수동 계산
  feedback: feedback,
})

// After - Clean Architecture
import { SupabaseExamScoreRepository } from '@/infrastructure/database/SupabaseExamScoreRepository'
import { Score } from '@/domain/value-objects/Score'
import { ExamScore } from '@/domain/entities/ExamScore'

const repository = new SupabaseExamScoreRepository(supabase)
const score = Score.fromString("30/32")  // 자동 파싱
const examScore = ExamScore.create({
  tenantId,
  examId,
  studentId,
  score,  // 퍼센트 자동 계산됨
  feedback,
})

await repository.save(examScore)
```

### 성적 일괄 입력
```typescript
const repository = new SupabaseExamScoreRepository(supabase)

const examScores = studentsData.map(student => {
  const score = Score.fromString(student.scoreInput, exam.totalQuestions)

  return ExamScore.create({
    tenantId,
    examId,
    studentId: student.id,
    score,
    feedback: student.feedback,
  })
})

// 일괄 저장
await repository.saveBulk(examScores)

// 통계 조회
const stats = await repository.getStatsByExam(examId)
console.log(`평균: ${stats.averagePercentage}점`)
console.log(`합격: ${stats.passed}명`)
```

## 장점

### 1. 타입 안정성
- Score Value Object로 점수 형식 검증
- 득점률 계산 자동화 (수동 계산 에러 방지)
- 등급 자동 산출

### 2. 비즈니스 로직 캡슐화
- 30/32 형식 파싱 로직이 Score에 집중
- 합격/불합격, 등급 판정이 명확
- 재시험 처리 로직이 Entity에 캡슐화

### 3. 테스트 용이성
```typescript
// Score 단위 테스트
test('30/32 should calculate 93.75%', () => {
  const score = Score.fromString("30/32")
  expect(score.getPercentage()).toBe(93.75)
  expect(score.getPercentageInt()).toBe(94)
  expect(score.getGrade()).toBe('A')
})

// ExamScore 단위 테스트 (Mock Repository)
test('should create exam score with auto-calculated percentage', () => {
  const score = Score.create(28, 30)
  const examScore = ExamScore.create({
    tenantId: 'test',
    examId: 'test',
    studentId: 'test',
    score,
    feedback: null,
  })

  expect(examScore.getPercentage()).toBe(93)
  expect(examScore.isPassed()).toBe(true)
  expect(examScore.getGrade()).toBe('A')
})
```

### 4. 유지보수성
- 점수 계산 로직 변경 시 Score 한 곳만 수정
- 등급 기준 변경 시 `getGrade()` 메서드만 수정
- 데이터베이스 교체 시 Repository만 교체

## 다음 단계

### Use Cases 생성 (선택사항)
Student/Todo와 동일한 패턴으로 Use Cases 작성:

```
src/application/use-cases/exam-score/
├── CreateExamScoreUseCase.ts
├── CreateBulkExamScoresUseCase.ts
├── UpdateExamScoreUseCase.ts
├── GetExamScoreStatsUseCase.ts
└── FindLowPerformersUseCase.ts

src/application/use-cases/exam/
├── CreateExamUseCase.ts
├── UpdateExamUseCase.ts
├── GetUpcomingExamsUseCase.ts
└── GetExamWithScoresUseCase.ts
```

### Factory Functions
```typescript
// src/application/factories/examScoreUseCaseFactory.ts
export async function createCreateExamScoreUseCase() {
  const supabase = await createClient()
  const repository = new SupabaseExamScoreRepository(supabase)
  return new CreateExamScoreUseCase(repository)
}
```

### 기존 페이지 마이그레이션
- `/grades/page.tsx` - Repository 직접 사용 또는 Use Case 사용
- `/grades/exams/[examId]/bulk-entry/page.tsx` - Bulk 입력 Use Case 사용

## 참고

- Student/Todo 리팩토링과 동일한 패턴
- `docs/CLEAN_ARCHITECTURE_MIGRATION.md` 참조
- `src/application/README.md` 사용 가이드 참조
