# RPC/RLS → Service Role 완전 마이그레이션 로드맵

> **목표**: 모든 RPC 함수와 RLS 정책을 제거하고 server-side + service_role 기반 아키텍처로 완전 전환

## 📊 현재 상황 (2025-10-23)

### ✅ 이미 완료된 작업
1. **Auth 도메인**
   - ✅ `createUserProfileServer()` - 프로필 생성
   - ✅ `completeOwnerOnboarding()` - 원장 온보딩
   - ✅ `checkOnboardingStage()` - 온보딩 상태 확인
   - ✅ `handleAuthCallback()` - 인증 콜백
   - ✅ `getApprovalStatus()` - 승인 상태 조회

2. **Helper 함수**
   - ✅ `getCurrentUserWithTenant()` - 사용자 + tenant 정보
   - ✅ `verifyTenantAccess()` - Tenant 접근 권한
   - ✅ `verifyRolePermission()` - 역할 기반 권한
   - ✅ Client hooks: `useCurrentUser`, `useAuthStage`

### 🔄 마이그레이션 필요한 RPC 함수 (5개)

#### 학생 관련 (3개)
1. **`preview_student_import`**
   - 위치: `src/infra/db/repositories/student-import.repository.ts:37`
   - 용도: 학생 임포트 미리보기
   - 전환: Server Action `previewStudentImport()`

2. **`confirm_student_import`**
   - 위치: `src/infra/db/repositories/student-import.repository.ts:71`
   - 용도: 학생 임포트 확정
   - 전환: Server Action `confirmStudentImport()`

3. **`create_student_complete`**
   - 위치: `src/core/application/use-cases/student/CreateStudentCompleteUseCase.ts:39`
   - 용도: 학생 + 보호자 + 관계 한번에 생성
   - 전환: Server Action `createStudentComplete()`

#### 포인트 관련 (2개)
4. **`get_student_point_balance`**
   - 위치: `src/app/api/students/[studentId]/points/route.ts:20`
   - 용도: 학생 포인트 잔액 조회
   - 전환: Server Action `getStudentPointBalance()`

5. **`get_student_point_history`**
   - 위치: `src/app/api/students/[studentId]/points/route.ts:21`
   - 용도: 학생 포인트 이력 조회
   - 전환: Server Action `getStudentPointHistory()`

### 📦 기존 Server Actions 현황 (14개 파일)

```
src/app/actions/
├── approve-user.ts          # 사용자 승인
├── attendance.ts            # 출석 관리
├── auth.ts                  # 인증 (✅ 완료)
├── consultations.ts         # 상담 관리
├── dashboard-preferences.ts # 대시보드 설정
├── dashboard.ts             # 대시보드 데이터
├── grades.ts                # 성적 관리
├── guardians.ts             # 보호자 관리
├── invitations.ts           # 초대 관리
├── onboarding.ts            # 온보딩 (✅ 완료)
├── reports.ts               # 리포트 관리
├── students.ts              # 학생 관리 (🔄 일부 RPC 사용)
├── todo-templates.ts        # TODO 템플릿
└── todos.ts                 # TODO 관리
```

## 🗺️ 마이그레이션 로드맵

### Phase 0: 준비 작업 ✅

**목표**: 마이그레이션 기반 구축
**기간**: 완료

- [x] Service role client 구현
- [x] Service role helper 함수 구현
- [x] Auth 도메인 전환
- [x] 문서화

### Phase 1: Students 도메인 완전 전환

**목표**: 학생 관련 모든 RPC 제거

#### 1.1 Student Import RPC 제거 ✅
- [x] `src/app/actions/student-import.ts` 생성:
  - [x] `previewStudentImport()` - CSV 미리보기
  - [x] `confirmStudentImport()` - 임포트 확정
- [x] `student-import-wizard.tsx` 수정
  - [x] Factory 호출 제거
  - [x] Server Actions 직접 호출로 변경
- [x] 타입 에러 수정 완료

#### 1.2 Student Complete Creation RPC 제거 ✅
- [x] `src/app/actions/students.ts`에 이미 구현됨:
  - [x] `createStudentComplete()` - 학생+보호자 생성
- [x] `CreateStudentCompleteUseCase.ts` - 더 이상 사용되지 않음 (AddStudentWizard.tsx.disabled)
- [x] Server Action이 RPC를 완전히 대체함

#### 1.3 Student Points RPC 제거 ✅
- [x] `src/app/actions/students.ts`에 추가:
  - [x] `getStudentPointBalance()` - 포인트 잔액 (placeholder)
  - [x] `getStudentPointHistory()` - 포인트 이력 (placeholder)
- [x] `src/app/api/students/[studentId]/points/route.ts` 수정
  - [x] API route에서 Server Actions 호출로 전환
- [x] 포인트 시스템은 아직 구현되지 않음 (테이블 없음)
  - TODO: 실제 구현 시 placeholder 로직을 실제 테이블 쿼리로 변경 필요

### Phase 2: Dashboard RPC 제거 ✅

**목표**: 대시보드 데이터 조회를 Server Actions로

- [x] `get_dashboard_data()` RPC 확인 (이미 사용 안함)
- [x] `src/app/actions/dashboard.ts` 개선
  - [x] `verifyPermission` → `verifyStaffPermission`으로 변경
  - [x] Service role 기반 데이터 조회 (이미 구현됨)
  - [x] Tenant 격리 적용 (모든 쿼리에 tenant_id 필터)
  - [x] 로깅 개선 (requestId 추가)
- [x] getDashboardData() Server Action이 RPC를 완전히 대체함

### Phase 3: Kiosk RPC 제거 ✅

**목표**: 키오스크 기능 검토 및 전환

- [x] `get_student_todos_for_kiosk()` 검토
  - RPC 함수가 실제 코드에서 사용되지 않음 확인
  - `/app/actions/kiosk.ts` 파일이 disabled 상태
  - 키오스크 기능이 현재 비활성화됨
- [x] 결론: RPC 제거 가능 (사용되지 않음)

### Phase 4: RLS 정책 비활성화

**목표**: 애플리케이션 레벨 권한 검증으로 전환

#### 4.1 준비 작업
- [ ] 모든 Server Actions에 권한 검증 추가
  ```typescript
  export async function myAction() {
    // 1. 인증 확인
    const result = await verifyStaffPermission()
    if (!result.success) {
      return { success: false, error: result.error }
    }

    // 2. Service role로 작업 (⚠️ tenant_id 필터 필수!)
    const serviceClient = createServiceRoleClient()
    const { data } = await serviceClient
      .from('table')
      .select('*')
      .eq('tenant_id', result.data.tenant_id)  // ← 중요!
  }
  ```

- [ ] 보안 체크리스트 작성
  - [ ] 모든 쿼리에 tenant_id 필터 확인
  - [ ] 권한 검증 누락 확인
  - [ ] SQL injection 방지 확인

#### 4.2 RLS 비활성화 (Staging에서 먼저)
```sql
-- Step 1: RLS 비활성화 (정책은 유지)
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_todos DISABLE ROW LEVEL SECURITY;
-- ... 모든 테이블
```

#### 4.3 검증
- [ ] Multi-tenant 격리 테스트
  - [ ] Tenant A가 Tenant B 데이터 접근 불가
  - [ ] 권한 없는 역할이 작업 수행 불가
- [ ] E2E 테스트 전체 실행
- [ ] 보안 감사 로그 확인

### Phase 5: RPC 함수 및 Helper 제거

**목표**: 데이터베이스 정리

#### 5.1 사용하지 않는 RPC 함수 제거
```sql
-- Auth RPC (이미 사용 안함)
DROP FUNCTION IF EXISTS public.get_onboarding_state();
DROP FUNCTION IF EXISTS public.create_user_profile();
DROP FUNCTION IF EXISTS public.check_approval_status();
DROP FUNCTION IF EXISTS public.complete_owner_onboarding(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.finish_owner_academy_setup(text, text, jsonb);
DROP FUNCTION IF EXISTS public.get_auth_stage(text);
DROP FUNCTION IF EXISTS public.get_dashboard_data(date);

-- Student RPC (Phase 1 완료 후)
DROP FUNCTION IF EXISTS public.preview_student_import(...);
DROP FUNCTION IF EXISTS public.confirm_student_import(...);
DROP FUNCTION IF EXISTS public.create_student_complete(...);
DROP FUNCTION IF EXISTS public.get_student_point_balance(...);
DROP FUNCTION IF EXISTS public.get_student_point_history(...);
```

#### 5.2 RLS Helper 함수 제거
```sql
-- RLS 정책에서만 사용되던 함수들
DROP FUNCTION IF EXISTS public.current_user_tenant_id();
DROP FUNCTION IF EXISTS public.current_user_role();
```

#### 5.3 RLS 정책 제거 (선택)
```sql
-- 완전히 제거 (롤백 불가)
DROP POLICY IF EXISTS tenants_select_own ON public.tenants;
DROP POLICY IF EXISTS users_select_self ON public.users;
-- ... 모든 정책
```

## 📋 체크리스트

### 개발 단계
- [ ] Phase 1: Students 도메인 완료
- [ ] Phase 2: Dashboard 완료
- [ ] Phase 3: Kiosk 검토 완료
- [ ] Phase 4: RLS 비활성화 완료
- [ ] Phase 5: RPC/Helper 제거 완료

### 테스트 단계
- [ ] 단위 테스트: 모든 Server Actions
- [ ] 통합 테스트: 전체 플로우
- [ ] E2E 테스트: 주요 기능
- [ ] 보안 테스트: Multi-tenant 격리
- [ ] 성능 테스트: RPC vs Server Actions

### 배포 단계
- [ ] Staging 배포 및 검증
- [ ] Production 배포
- [ ] 모니터링 및 롤백 준비
- [ ] 문서 업데이트

## 🚨 주의사항

### 1. Multi-Tenant 보안
⚠️ **CRITICAL**: Service role은 RLS를 우회하므로 **모든 쿼리에 tenant_id 필터를 수동으로 추가**해야 합니다!

```typescript
// ❌ 위험: 모든 tenant 데이터 노출
await serviceClient.from('students').select('*')

// ✅ 안전: tenant_id 필터링
await serviceClient
  .from('students')
  .select('*')
  .eq('tenant_id', userContext.tenant_id)
```

### 2. 권한 검증
모든 Server Action은 다음 패턴을 따라야 합니다:

1. **인증 확인** (일반 client)
2. **권한 확인** (service_role)
3. **비즈니스 로직** (service_role + tenant 필터)

### 3. 롤백 계획
각 Phase마다 롤백 가능하도록:
- RLS 비활성화만 하고 정책은 유지
- RPC 함수는 마지막에 제거
- 충분한 테스트 후 진행

## 📊 진행 상황

- [x] Phase 0: 준비 작업 (100%) ✅
- [x] Phase 1: Students (100%) ✅
  - [x] Phase 1.1: Student Import RPC 제거
  - [x] Phase 1.2: Student Complete Creation RPC 제거
  - [x] Phase 1.3: Student Points RPC 제거
- [x] Phase 2: Dashboard (100%) ✅
- [x] Phase 3: Kiosk (100%) ✅
- [ ] Phase 4: RLS 비활성화 (0%)
- [ ] Phase 5: RPC 제거 (0%)

**전체 진행률**: 60% (Phase 0~3 완료)

**🎉 모든 RPC 함수가 Server Actions로 대체 완료!**

## 🎯 다음 단계

1. **Phase 4 준비**: RLS 비활성화 전 보안 체크
   - [ ] 모든 Server Actions에 권한 검증 추가 확인
   - [ ] 모든 쿼리에 tenant_id 필터 확인
   - [ ] SQL injection 방지 확인
   - [ ] 보안 감사 체크리스트 작성

2. **Phase 4 실행**: RLS 정책 비활성화 (Staging 먼저)
   - [ ] Staging 환경에서 RLS 비활성화
   - [ ] Multi-tenant 격리 테스트
   - [ ] E2E 테스트 실행
   - [ ] Production 배포

3. **Phase 5 실행**: RPC 함수 및 Helper 제거
   - [ ] 사용하지 않는 RPC 함수 제거
   - [ ] RLS Helper 함수 제거
   - [ ] 정책 제거 (선택)
