# Acadesk Web - 완전한 데이터베이스 스키마

## 개요

Acadesk Web 학원 관리 시스템의 완전한 데이터베이스 스키마입니다. 처음부터 모든 테이블과 관계를 정의합니다.

## 마이그레이션 파일

```
supabase/migrations/
├── 20250101000001_initial_schema.sql    # 전체 스키마 생성
├── 20250101000002_rls_policies.sql      # RLS 보안 정책
└── 20250101000003_sample_data.sql       # 샘플 데이터 (개발용)
```

## 빠른 시작

### 1. Supabase 대시보드에서 적용

1. https://supabase.com/dashboard 접속
2. 프로젝트 선택 (mzftcusxsvwbzobmlwpm)
3. SQL Editor 열기
4. 각 마이그레이션 파일 내용을 순서대로 복사/붙여넣기 후 실행

### 2. CLI로 적용 (연결 문제 해결 시)

```bash
supabase link --project-ref mzftcusxsvwbzobmlwpm
supabase db push
```

## 데이터베이스 구조

### 핵심 엔티티

#### 1. **Tenants** (멀티테넌시)
- 학원별 데이터 격리
- 각 학원은 독립된 tenant_id 보유

#### 2. **Users** (통합 사용자)
- 역할: admin(원장), instructor(강사), assistant(조교), student(학생), guardian(학부모)
- 모든 사용자는 users 테이블에 통합 관리

#### 3. **Students** (학생)
- 학생 기본 정보
- 학년, 학교, 입회일 등
- `student_schedules`: 요일별 등원 시간 관리

#### 4. **Guardians** (학부모)
- 학부모 정보
- `student_guardians`: 학생-학부모 관계 (1:N)

#### 5. **Classes** (수업 클래스)
- 수업 정보 및 시간표
- `class_enrollments`: 수업-학생 등록 관계

#### 6. **Attendance** (출결)
- `attendance_sessions`: 수업 세션
- `attendance`: 학생별 출결 기록
- 상태: present, late, absent, excused

#### 7. **Exams & Scores** (시험 & 성적)
- `exams`: 시험 정보
  - 카테고리: vocabulary, listening, speaking, grammar, writing, reading
  - 반복 시험 지원: weekly_mon_wed_fri, weekly_fri, monthly
- `exam_scores`: 성적 기록
  - **자동 계산**: `correct_answers/total_questions` → `percentage`
  - 예: 30/32 입력 → 자동으로 93.75% 계산
  - 재시험 추적 (`is_retest`, `retest_count`)

#### 8. **Materials** (교재 관리)
- `materials`: 교재 정보 (카테고리, ISBN, 가격, 단원 수)
- `material_distributions`: 학생별 배부 및 결제 상태
- `material_progress`: 단원별 진도 관리

#### 9. **Books** (원서 대여)
- `books`: 원서 재고 관리
- `book_lendings`: 대여 기록
- **자동 기능**: 대여/반납 시 `available_copies` 자동 업데이트

#### 10. **Consultations** (상담)
- 학부모-강사 상담 기록
- 캘린더 뷰 지원
- 후속 상담 일정 관리

#### 11. **Student Todos** (학생 할일)
- 학생별 개인화된 과제 목록
- 강사 검증 기능
- `todo_templates`: 재사용 가능한 템플릿

#### 12. **Notifications** (알림)
- SMS/카카오톡 발송 추적
- 종류:
  - 출석 지각 알림 (30분 후)
  - 원서 반납 알림
  - 교재비 미납 알림
  - 리포트 발송 확인

#### 13. **Reports** (성적표)
- 주간/월간 리포트 자동 생성
- JSON 형태로 저장
- 학부모 발송 추적

## 주요 기능

### 📊 성적 입력 자동화

```sql
-- 30/32 입력
INSERT INTO exam_scores (exam_id, student_id, correct_answers, total_questions)
VALUES ('exam_id', 'student_id', 30, 32);

-- percentage가 자동으로 93.75%로 계산됨
```

### 📚 원서 대여 자동 재고 관리

```sql
-- 책 대여
INSERT INTO book_lendings (book_id, student_id, borrowed_at, due_date)
VALUES ('book_id', 'student_id', CURRENT_DATE, CURRENT_DATE + 7);

-- books.available_copies가 자동으로 -1

-- 책 반납
UPDATE book_lendings SET returned_at = CURRENT_DATE WHERE id = 'lending_id';

-- books.available_copies가 자동으로 +1
```

### 🔔 알림 발송 추적

```sql
-- 지각 알림 생성
INSERT INTO notifications (
  tenant_id, notification_type, student_id, guardian_id,
  recipient_phone, message_body, send_method
)
VALUES (
  'tenant_id', 'attendance_missing', 'student_id', 'guardian_id',
  '010-1234-5678', '학생이 30분이 지나도 등원하지 않았습니다.', 'sms'
);
```

### ✅ 학생 TODO 워크플로우

1. 원장이 주말에 다음 주 TODO 생성
2. 학생이 앱에서 본인 TODO 확인
3. 학생이 완료 시 `completed_at` 업데이트
4. 강사가 검증 (`verified_by`, `verified_at`)
5. 검증 완료 시 조기 퇴실 가능

## 데이터 모델 다이어그램

### 핵심 관계

```
tenants (학원)
  ↓
users (사용자)
  ├─→ students (학생)
  │     ├─→ student_schedules (요일별 등원시간)
  │     ├─→ class_enrollments (수업 등록)
  │     ├─→ attendance (출결)
  │     ├─→ exam_scores (성적)
  │     ├─→ material_distributions (교재 배부)
  │     ├─→ book_lendings (원서 대여)
  │     ├─→ student_todos (할일)
  │     └─→ reports (리포트)
  │
  ├─→ guardians (학부모)
  │     └─→ student_guardians (학생-학부모 관계)
  │
  └─→ instructors (강사)
        └─→ classes (담당 수업)
```

## Reference Tables (코드 테이블)

모든 상태 코드와 카테고리는 별도 테이블로 관리:

- `ref_roles`: 사용자 역할
- `ref_status_codes`: 통합 상태 코드
- `ref_material_categories`: 교재 카테고리
- `ref_book_categories`: 원서 카테고리
- `ref_exam_categories`: 시험 카테고리
- `ref_consultation_types`: 상담 유형
- `ref_notification_types`: 알림 유형

## 보안 (Row Level Security)

모든 테이블에 RLS 활성화:

### 기본 원칙
1. **Tenant Isolation**: 각 사용자는 자신의 tenant 데이터만 접근
2. **Role-Based Access**: 역할에 따른 권한 차등
3. **Data Privacy**: 학생/학부모는 본인 데이터만 조회

### 예시

```sql
-- 강사/관리자는 자신의 tenant 내 모든 학생 조회 가능
CREATE POLICY "Staff can view all students"
ON students FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  )
);

-- 학생은 본인 데이터만 조회 가능
CREATE POLICY "Students can view own data"
ON students FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);
```

## 샘플 데이터

`20250101000003_sample_data.sql`에 포함된 테스트 데이터:

- 1개 학원 (Demo Academy)
- 3명 강사 (원장, 송이, 써니)
- 4명 학생 + 학부모
- 2개 클래스
- 교재 4종
- 원서 4종
- 시험 및 성적 샘플

## 다음 단계

### 1단계: 스키마 적용 ✅
```bash
# 대시보드에서 SQL 실행
1. 20250101000001_initial_schema.sql
2. 20250101000002_rls_policies.sql
3. 20250101000003_sample_data.sql (선택)
```

### 2단계: TypeScript 타입 생성
```bash
supabase gen types typescript --local > src/types/database.types.ts
```

### 3단계: UI 구현
- [ ] 학생 관리 페이지
- [ ] 출결 관리 페이지
- [ ] 성적 입력/조회 페이지
- [ ] 교재/원서 관리 페이지
- [ ] TODO 관리 페이지
- [ ] 상담 관리 페이지

### 4단계: 리포트 자동화 (최우선!)
- [ ] 월간 성적표 템플릿
- [ ] 성취율 그래프 생성
- [ ] PDF 변환
- [ ] 자동 발송 기능

### 5단계: 알림 시스템
- [ ] SMS API 연동 (Solapi/Aligo)
- [ ] 카카오톡 API 연동
- [ ] 자동 알림 스케줄러

## 성능 최적화

### 인덱스
모든 외래키와 자주 조회되는 컬럼에 인덱스 생성됨:
- Foreign Keys
- tenant_id (모든 테이블)
- deleted_at (소프트 삭제)
- 날짜 필드 (검색용)

### JSONB 활용
유연한 메타데이터 저장:
- `meta` 컬럼 (students, classes, exams, materials, books 등)
- `settings` 컬럼 (tenants, users)
- `content` 컬럼 (reports)

## 트리거 & 함수

### 자동 업데이트 트리거
- `update_updated_at_column()`: 모든 테이블의 `updated_at` 자동 갱신

### 계산 트리거
- `calculate_exam_percentage()`: 시험 점수 자동 계산
- `update_book_availability()`: 원서 재고 자동 업데이트

## 마이그레이션 확인

### 테이블 생성 확인
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

예상 테이블 수: **약 25개**

### 인덱스 확인
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

### RLS 활성화 확인
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

## 데이터 임포트

### Excel → Database
1. Excel 템플릿 다운로드 (추후 제공)
2. 데이터 입력
3. CSV 변환
4. Supabase 대시보드에서 Import

### 기존 데이터 마이그레이션
```sql
-- 예: 기존 학생 데이터 임포트
INSERT INTO students (tenant_id, user_id, student_code, grade, school, enrollment_date)
SELECT
  'your_tenant_id',
  user_id,
  old_student_code,
  grade_level,
  school_name,
  enrollment_date
FROM legacy_students;
```

## 문제 해결

### Q: RLS로 인해 데이터가 안 보여요
```sql
-- 임시로 정책 비활성화 (개발 중에만!)
ALTER TABLE students DISABLE ROW LEVEL SECURITY;

-- 확인 후 다시 활성화
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
```

### Q: 외래키 제약 위반 오류
```sql
-- 부모 데이터부터 먼저 입력
-- 순서: tenants → users → students → ...
```

### Q: 마이그레이션 중 오류 발생
1. 오류 메시지 확인
2. 문제가 되는 SQL 라인 찾기
3. 기존 객체 존재 여부 확인 (`IF NOT EXISTS` 사용)

## 관련 문서

- `/internal/tech/ERD.md` - 상세 ERD 다이어그램
- `/internal/tech/Architecture.md` - 시스템 아키텍처
- `/internal/product/PRD.md` - 제품 요구사항

## 지원

문의사항이나 문제가 있으면:
1. 마이그레이션 로그 확인
2. Supabase 대시보드 > Database > Logs 확인
3. GitHub Issues에 질문 등록

---

**작성일**: 2025-01-01
**버전**: 1.0.0
**상태**: Production Ready ✅
