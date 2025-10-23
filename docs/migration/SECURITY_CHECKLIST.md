# RLS 비활성화 전 보안 체크리스트

> **목적**: Service Role 기반 아키텍처 전환 후 Multi-tenant 보안 검증

**작성일**: 2025-10-23
**상태**: Phase 4 준비 중

---

## 📋 개요

RLS를 비활성화하면 데이터베이스 레벨의 자동 보안이 제거되므로, **애플리케이션 레벨에서 완벽한 보안을 구현**해야 합니다.

### 핵심 원칙

1. **모든 Server Action은 인증/권한 검증 필수**
2. **모든 쿼리는 tenant_id로 필터링 필수**
3. **Service role은 서버 사이드에서만 사용**
4. **클라이언트는 절대 service role에 접근 불가**

---

## ✅ Phase 1: 코드 검증

### 1.1 Server Actions 권한 검증

**확인 항목**: 모든 Server Action이 적절한 권한 검증을 수행하는가?

```typescript
// ✅ GOOD
export async function myAction() {
  const result = await verifyStaffPermission()
  if (!result.success) {
    return { success: false, error: result.error }
  }
  // ... proceed
}

// ❌ BAD - 권한 검증 없음
export async function myAction() {
  const serviceClient = createServiceRoleClient()
  // ... 권한 검증 없이 바로 쿼리
}
```

**검증 방법**:

```bash
# 모든 Server Action 파일 검증
grep -r "export async function" src/app/actions/*.ts | \
  while read line; do
    file=$(echo $line | cut -d: -f1)
    echo "Checking $file..."
    if ! grep -q "verifyStaffPermission\|verifyPermission\|verifyOwnerPermission" "$file"; then
      echo "⚠️  WARNING: No permission check in $file"
    fi
  done
```

#### 체크리스트

- [ ] `src/app/actions/auth.ts` - 권한 검증 확인
- [ ] `src/app/actions/students.ts` - 권한 검증 확인
- [ ] `src/app/actions/student-import.ts` - 권한 검증 확인
- [ ] `src/app/actions/dashboard.ts` - 권한 검증 확인
- [ ] `src/app/actions/attendance.ts` - 권한 검증 확인
- [ ] `src/app/actions/consultations.ts` - 권한 검증 확인
- [ ] `src/app/actions/dashboard-preferences.ts` - 권한 검증 확인
- [ ] `src/app/actions/grades.ts` - 권한 검증 확인
- [ ] `src/app/actions/guardians.ts` - 권한 검증 확인
- [ ] `src/app/actions/invitations.ts` - 권한 검증 확인
- [ ] `src/app/actions/onboarding.ts` - 권한 검증 확인
- [ ] `src/app/actions/reports.ts` - 권한 검증 확인
- [ ] `src/app/actions/todo-templates.ts` - 권한 검증 확인
- [ ] `src/app/actions/todos.ts` - 권한 검증 확인
- [ ] `src/app/actions/approve-user.ts` - 권한 검증 확인

---

### 1.2 Tenant ID 필터링

**확인 항목**: 모든 service_role 쿼리가 tenant_id로 필터링되는가?

```typescript
// ✅ GOOD - tenant_id 필터
const { data } = await serviceClient
  .from('students')
  .select('*')
  .eq('tenant_id', tenant_id)  // ← 필수!

// ❌ BAD - tenant_id 필터 없음
const { data } = await serviceClient
  .from('students')
  .select('*')
  // ← 모든 tenant 데이터 노출!
```

**검증 방법**:

```bash
# service_role 사용하는 모든 파일에서 tenant_id 필터 확인
grep -r "createServiceRoleClient" src/app/actions/*.ts | \
  cut -d: -f1 | uniq | \
  while read file; do
    echo "Checking $file..."
    # .from() 사용하는 줄 찾기
    grep -n "\.from(" "$file" | while read line; do
      line_num=$(echo $line | cut -d: -f1)
      # 해당 함수 블록에서 tenant_id 필터 확인
      if ! awk -v start=$line_num 'NR>=start && NR<=start+10 && /\.eq\(.*tenant_id/ {found=1} END {exit !found}' "$file"; then
        echo "⚠️  WARNING: Missing tenant_id filter at line $line_num in $file"
      fi
    done
  done
```

#### 체크리스트

**Students 도메인**:
- [ ] `students.ts::createStudentComplete()` - tenant_id 필터
- [ ] `students.ts::updateStudent()` - tenant_id 필터
- [ ] `students.ts::deleteStudent()` - tenant_id 필터
- [ ] `students.ts::getStudentDetailData()` - tenant_id 필터
- [ ] `students.ts::getStudentPointBalance()` - tenant_id 필터
- [ ] `students.ts::getStudentPointHistory()` - tenant_id 필터
- [ ] `student-import.ts::previewStudentImport()` - tenant_id 필터
- [ ] `student-import.ts::confirmStudentImport()` - tenant_id 필터

**Dashboard 도메인**:
- [ ] `dashboard.ts::getDashboardData()` - 모든 쿼리에 tenant_id 필터
- [ ] `dashboard.ts::fetchStats()` - 모든 쿼리에 tenant_id 필터

**기타 도메인**:
- [ ] `attendance.ts` - 모든 쿼리에 tenant_id 필터
- [ ] `consultations.ts` - 모든 쿼리에 tenant_id 필터
- [ ] `grades.ts` - 모든 쿼리에 tenant_id 필터
- [ ] `guardians.ts` - 모든 쿼리에 tenant_id 필터
- [ ] `todos.ts` - 모든 쿼리에 tenant_id 필터

---

### 1.3 SQL Injection 방지

**확인 항목**: Parameterized queries를 사용하는가?

```typescript
// ✅ GOOD - Parameterized query
await serviceClient
  .from('students')
  .select('*')
  .eq('id', studentId)

// ❌ BAD - String interpolation
await serviceClient.rpc('custom_query', {
  query: `SELECT * FROM students WHERE id = '${studentId}'`
})
```

#### 체크리스트

- [ ] 모든 쿼리가 Supabase 클라이언트 메서드 사용 (`.select()`, `.insert()`, `.update()`, `.delete()`)
- [ ] Raw SQL 사용 시 반드시 parameterized queries 사용
- [ ] User input이 직접 SQL에 삽입되지 않음

---

## ✅ Phase 2: 테스트 계획

### 2.1 Multi-Tenant 격리 테스트

**목표**: Tenant A가 Tenant B의 데이터에 접근할 수 없음을 검증

#### 테스트 시나리오

1. **학생 조회 격리**
   - Tenant A로 로그인
   - Tenant B의 학생 조회 시도 → 404 또는 403
   - Tenant A의 학생만 조회 가능

2. **학생 생성 격리**
   - Tenant A로 학생 생성
   - 생성된 학생이 Tenant A에만 속함
   - Tenant B에서 해당 학생 조회 불가

3. **대시보드 격리**
   - Tenant A 대시보드 → Tenant A 데이터만
   - Tenant B 대시보드 → Tenant B 데이터만

4. **크로스 테넌트 업데이트 차단**
   - Tenant A로 로그인
   - Tenant B의 학생 ID로 업데이트 시도 → 실패

#### 체크리스트

- [ ] 학생 조회 격리 테스트
- [ ] 학생 생성 격리 테스트
- [ ] 학생 수정 격리 테스트
- [ ] 학생 삭제 격리 테스트
- [ ] 대시보드 격리 테스트
- [ ] 출석 격리 테스트
- [ ] 성적 격리 테스트
- [ ] TODO 격리 테스트

---

### 2.2 권한 기반 테스트

**목표**: 역할별로 적절한 권한만 가짐을 검증

#### 테스트 시나리오

1. **Owner 권한**
   - ✅ 모든 기능 접근 가능
   - ✅ Tenant 설정 변경 가능

2. **Instructor 권한**
   - ✅ 학생 관리 가능
   - ✅ 출석/성적 관리 가능
   - ❌ Tenant 설정 변경 불가

3. **Assistant 권한**
   - ✅ 학생 조회 가능
   - ❌ 학생 삭제 불가
   - ❌ Tenant 설정 변경 불가

4. **Parent 권한**
   - ✅ 자녀 정보 조회 가능
   - ❌ 타 학생 정보 조회 불가

#### 체크리스트

- [ ] Owner 권한 테스트
- [ ] Instructor 권한 테스트
- [ ] Assistant 권한 테스트
- [ ] Parent 권한 테스트
- [ ] 권한 없는 작업 차단 테스트

---

### 2.3 E2E 테스트

**목표**: 주요 사용자 플로우 정상 작동 검증

#### 체크리스트

- [ ] 회원가입 및 온보딩 플로우
- [ ] 학생 등록 플로우
- [ ] 학생 임포트 플로우
- [ ] 출석 체크 플로우
- [ ] 성적 입력 플로우
- [ ] 리포트 생성 플로우
- [ ] 대시보드 로딩

---

## ✅ Phase 3: 보안 감사

### 3.1 코드 리뷰 체크리스트

- [ ] 모든 Server Actions에 `'use server'` 디렉티브 존재
- [ ] `createServiceRoleClient()` 사용은 서버 사이드만
- [ ] 클라이언트 컴포넌트에서 service role 접근 없음
- [ ] 환경변수 `SUPABASE_SERVICE_ROLE_KEY` 노출 안됨
- [ ] Error 메시지에 민감한 정보 포함 안됨

### 3.2 환경 검증

- [ ] `.env.local`에 service role key 존재
- [ ] `.env.example`에 service role key 미포함 (placeholder만)
- [ ] `.gitignore`에 `.env.local` 포함
- [ ] Production 환경변수 설정 완료

---

## ✅ Phase 4: Staging 배포 및 검증

### 4.1 Staging RLS 비활성화

```sql
-- Staging 환경에서만 실행
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_todos DISABLE ROW LEVEL SECURITY;
-- ... 모든 테이블
```

#### 체크리스트

- [ ] Staging DB 백업
- [ ] RLS 비활성화 SQL 실행
- [ ] 애플리케이션 정상 작동 확인
- [ ] Multi-tenant 격리 테스트 실행
- [ ] E2E 테스트 실행
- [ ] 성능 테스트

### 4.2 Rollback 계획

**문제 발생 시**:

```sql
-- RLS 재활성화
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ... 모든 테이블
```

- [ ] Rollback SQL 준비
- [ ] Rollback 테스트

---

## ✅ Phase 5: Production 배포

### 5.1 배포 전 체크리스트

- [ ] Staging 테스트 모두 통과
- [ ] 보안 감사 완료
- [ ] Production DB 백업
- [ ] Rollback 계획 준비
- [ ] 배포 시간대 결정 (트래픽 적은 시간)
- [ ] 모니터링 준비

### 5.2 배포 절차

1. [ ] Production DB 백업
2. [ ] RLS 비활성화 실행
3. [ ] 애플리케이션 배포
4. [ ] Smoke 테스트 (핵심 기능)
5. [ ] 모니터링 (에러 로그 확인)
6. [ ] Multi-tenant 격리 검증

### 5.3 모니터링

**확인 항목**:
- [ ] Error rate 정상
- [ ] Response time 정상
- [ ] Cross-tenant 접근 시도 없음 (로그 확인)

---

## 🚨 긴급 대응 계획

### 보안 이슈 발견 시

1. **즉시 조치**:
   - Production RLS 재활성화
   - 영향받은 데이터 확인
   - 사용자 알림 (필요시)

2. **근본 원인 분석**:
   - 코드 리뷰
   - 로그 분석
   - 테스트 추가

3. **재배포**:
   - 수정 후 Staging 재테스트
   - Production 재배포

---

## 📊 진행 상황

- [ ] Phase 1: 코드 검증 (0%)
- [ ] Phase 2: 테스트 계획 (0%)
- [ ] Phase 3: 보안 감사 (0%)
- [ ] Phase 4: Staging 배포 (0%)
- [ ] Phase 5: Production 배포 (0%)

**다음 단계**: Phase 1 코드 검증 시작
