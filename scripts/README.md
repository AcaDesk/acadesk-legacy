# 학생 데이터 재입력 가이드

## 📋 개요

`student_info.json` 파일을 기반으로 학생 및 보호자 데이터를 재입력하는 가이드입니다.

## ⚠️ 주의사항

**이 작업은 기존 학생 데이터를 완전히 삭제합니다!**

- 반드시 **프로덕션 데이터베이스 백업**을 먼저 수행하세요
- 로컬 환경에서 먼저 테스트 후 프로덕션에 적용하세요
- 작업 전 담당자에게 알려주세요

## 📂 파일 설명

### 1. `student_info.json`
- 올바른 학생 정보 원본 데이터 (53명)
- 학생 이름, 소속 학교/학년, 본인 연락처, 부모님 연락처 포함

### 2. `cleanup-students.sql`
- 기존 학생 데이터 삭제 쿼리
- 삭제 대상:
  - ✅ 학생-보호자 관계 (student_guardians)
  - ✅ 수업 등록 (class_enrollments)
  - ✅ 시험 성적 (exam_scores)
  - ✅ 학생 TODO (todos)
  - ✅ 출석 기록 (attendance_records)
  - ✅ 학생 정보 (students)
  - ✅ 보호자 정보 (guardians)
  - ✅ 학생 사용자 (users with role_code='student')
  - ✅ 보호자 사용자 (users with role_code='parent')

### 3. `insert_students_with_guardians.sql`
- 새로운 학생 및 보호자 데이터 입력 쿼리
- `student_info.json` 기반으로 자동 생성됨
- 특징:
  - ✅ 부모님 전화번호가 `guardians.phone_number`에 제대로 저장됨
  - ✅ 중복 보호자 자동 감지 (같은 전화번호면 재사용)
  - ✅ 여러 보호자 지원 (배열로 처리)
  - ✅ 학생 키오스크 PIN: 1234 (bcrypt 해시)

## 🚀 실행 순서

### 1단계: 데이터베이스 백업

**프로덕션 환경 (Supabase Dashboard)**
1. Settings → Database → Database backups
2. "Create backup" 버튼 클릭
3. 백업 완료 확인

**로컬 환경**
```bash
supabase db dump -f backup_before_migration_$(date +%Y%m%d_%H%M%S).sql
```

### 2단계: 기존 데이터 삭제

**Supabase SQL Editor**에서 실행:

1. `scripts/cleanup-students.sql` 파일 열기
2. 전체 내용 복사
3. Supabase Dashboard → SQL Editor → New query
4. 붙여넣기 후 "Run" 클릭

**실행 결과 예시:**
```
NOTICE: Starting cleanup for tenant: cf5ba30f-4081-494f-952f-45a7264a0c5d
NOTICE: Students to delete: 53
NOTICE: Guardians to delete: 42
NOTICE: Student users to delete: 53
NOTICE: Deleted student-guardian relationships
NOTICE: Deleted class enrollments
NOTICE: Deleted exam scores
NOTICE: Deleted student todos
NOTICE: Deleted attendance records
NOTICE: Deleted students
NOTICE: Deleted guardians
NOTICE: Deleted student users
NOTICE: Deleted parent users
NOTICE: Cleanup completed successfully
```

### 3단계: 새 데이터 입력

**Supabase SQL Editor**에서 실행:

1. `scripts/insert_students_with_guardians.sql` 파일 열기
2. 전체 내용 복사
3. Supabase Dashboard → SQL Editor → New query
4. 붙여넣기 후 "Run" 클릭

**실행 결과 예시:**
```
NOTICE: Starting student and guardian insertion...
NOTICE: Tenant ID: cf5ba30f-4081-494f-952f-45a7264a0c5d
NOTICE: Total students to insert: 53
  → Created new guardian with phone: +821075425617
NOTICE: ✅ Successfully inserted student 1/53 : 박규빈
  → Created new guardian with phone: +821085714200
NOTICE: ✅ Successfully inserted student 2/53 : 박다빈
...
NOTICE: ✅ Successfully inserted student 53/53 : 방서영
NOTICE: 🎉 All 53 students inserted successfully!
```

### 4단계: 데이터 검증

**Supabase SQL Editor**에서 실행:

```sql
-- 1. 학생 수 확인 (예상: 53명)
SELECT COUNT(*) as student_count
FROM students
WHERE tenant_id = 'cf5ba30f-4081-494f-952f-45a7264a0c5d'
  AND deleted_at IS NULL;

-- 2. 보호자 수 확인 (예상: 약 42명 - 일부 보호자는 여러 자녀 담당)
SELECT COUNT(*) as guardian_count
FROM guardians
WHERE tenant_id = 'cf5ba30f-4081-494f-952f-45a7264a0c5d'
  AND deleted_at IS NULL;

-- 3. 학생-보호자 관계 수 확인 (예상: 약 55개 - 일부 학생은 보호자 2명)
SELECT COUNT(*) as relationship_count
FROM student_guardians
WHERE tenant_id = 'cf5ba30f-4081-494f-952f-45a7264a0c5d';

-- 4. 보호자 전화번호 확인 (NULL이 없어야 함)
SELECT COUNT(*) as guardians_without_phone
FROM guardians
WHERE tenant_id = 'cf5ba30f-4081-494f-952f-45a7264a0c5d'
  AND phone_number IS NULL
  AND deleted_at IS NULL;
-- 예상: 0

-- 5. 학생 목록 확인
SELECT
  s.student_code,
  u.name as student_name,
  s.grade,
  u.phone_number as student_phone,
  COUNT(sg.guardian_id) as guardian_count
FROM students s
JOIN users u ON s.user_id = u.id
LEFT JOIN student_guardians sg ON s.id = sg.student_id
WHERE s.tenant_id = 'cf5ba30f-4081-494f-952f-45a7264a0c5d'
  AND s.deleted_at IS NULL
GROUP BY s.id, s.student_code, u.name, s.grade, u.phone_number
ORDER BY s.student_code;

-- 6. 보호자 정보 확인 (전화번호 확인)
SELECT
  g.id,
  u.name as guardian_name,
  g.phone_number,
  u.phone_number as user_phone,
  COUNT(sg.student_id) as student_count
FROM guardians g
JOIN users u ON g.user_id = u.id
LEFT JOIN student_guardians sg ON g.id = sg.guardian_id
WHERE g.tenant_id = 'cf5ba30f-4081-494f-952f-45a7264a0c5d'
  AND g.deleted_at IS NULL
GROUP BY g.id, u.name, g.phone_number, u.phone_number
ORDER BY student_count DESC, g.phone_number;
```

## 🔍 주요 개선사항

### 이전 문제점
- ❌ 보호자 테이블의 `phone_number` 컬럼이 NULL로 저장됨
- ❌ 일부 학생 이름/학교 정보 오류

### 현재 개선사항
- ✅ 보호자 `phone_number`가 제대로 저장됨 (guardians 테이블)
- ✅ 보호자 users 테이블에도 `phone_number` 저장됨
- ✅ 중복 보호자 자동 감지 및 재사용
- ✅ `student_info.json` 기준으로 모든 정보 정확히 반영
- ✅ 전화번호 E.164 형식 (+82...)으로 통일

## 🔄 롤백 방법

문제가 발생한 경우:

**Supabase Dashboard**
1. Settings → Database → Database backups
2. 백업 파일 선택
3. "Restore" 클릭

**로컬 환경**
```bash
# 백업 파일 복원
psql -h <host> -U postgres -d postgres -f backup_before_migration_YYYYMMDD_HHMMSS.sql
```

## 📞 문의사항

데이터 마이그레이션 중 문제가 발생하면:
1. 즉시 작업 중단
2. 백업 파일을 이용해 롤백
3. 개발팀에 문의

---

**작성일**: 2025-11-01
**대상 테넌트**: cf5ba30f-4081-494f-952f-45a7264a0c5d
