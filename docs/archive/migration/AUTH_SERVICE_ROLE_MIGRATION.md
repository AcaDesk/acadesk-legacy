# Auth Service Role Migration Guide

> **목표**: RPC 함수와 RLS 정책 기반 인증 시스템을 완전한 server-side + service_role 기반으로 전환

## 📋 Overview

### 기존 아키텍처 (RPC + RLS)
- ✅ 장점: 데이터베이스 레벨 보안, 자동 권한 검증
- ❌ 단점: 복잡한 RLS 정책, RPC 함수 유지보수, 유연성 부족

### 새로운 아키텍처 (Service Role + Application-Level Auth)
- ✅ 장점: 유연한 권한 검증, 간단한 로직, 테스트 용이
- ❌ 단점: 애플리케이션 레벨에서 보안 검증 필수
- ⚠️ **중요**: Service role은 RLS를 우회하므로 모든 권한 검증을 애플리케이션에서 수행해야 함

## 🔐 보안 원칙

### 1. Service Role 사용 규칙

**✅ 허용되는 경우:**
- Server Actions (`'use server'`)
- API Routes (`/api/**`)
- Server Components
- 이메일 인증 콜백 등 시스템 레벨 작업

**❌ 금지:**
- Client Components
- 브라우저에서 접근 가능한 코드
- 환경 변수 노출

### 2. 인증/권한 검증 패턴

모든 Server Action은 다음 순서를 따릅니다:

```typescript
export async function myServerAction(input: Input) {
  // 1. Input 검증 (Zod)
  const validated = schema.parse(input)

  // 2. 사용자 인증 확인
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' }
  }

  // 3. 권한 확인 (service_role로 사용자 정보 조회)
  const serviceClient = createServiceRoleClient()
  const { data: userData, error: userError } = await serviceClient
    .from('users')
    .select('tenant_id, role_code')
    .eq('id', user.id)
    .maybeSingle()

  if (!userData || !userData.tenant_id) {
    return { success: false, error: '권한이 없습니다.' }
  }

  // 4. 비즈니스 로직 실행 (service_role 사용)
  const { data, error: dbError } = await serviceClient
    .from('table')
    .select('*')
    .eq('tenant_id', userData.tenant_id) // ⚠️ 수동 tenant 필터링 필수!

  // 5. 결과 반환
  return { success: true, data }
}
```

### 3. Multi-Tenant 보안

⚠️ **CRITICAL**: Service role은 RLS를 우회하므로 **모든 쿼리에 tenant_id 필터를 수동으로 추가**해야 합니다!

```typescript
// ❌ 위험: 모든 테넌트 데이터 노출
const { data } = await serviceClient
  .from('students')
  .select('*')

// ✅ 안전: tenant_id 필터링
const { data } = await serviceClient
  .from('students')
  .select('*')
  .eq('tenant_id', userData.tenant_id)
```

## 📦 마이그레이션 체크리스트

### Phase 1: Auth Helper 함수 개선 ✅

- [x] `createServiceRoleClient()` 구현 완료
- [x] `createUserProfileServer()` - RPC 제거 완료
- [x] `checkOnboardingStage()` - RPC 제거 완료
- [x] `completeOwnerOnboarding()` - RPC 제거 완료
- [ ] 추가 helper 함수 구현:
  - [ ] `getCurrentUserWithTenant()` - 사용자 + tenant 정보 조회
  - [ ] `verifyTenantAccess()` - tenant 접근 권한 검증
  - [ ] `verifyRolePermission()` - 역할 기반 권한 검증

### Phase 2: 남은 RPC 함수 전환 (진행 중)

#### 2.1. Auth 관련 RPC
- [x] ~~`get_onboarding_state()`~~ → `checkOnboardingStage()`
- [x] ~~`create_user_profile()`~~ → `createUserProfileServer()`
- [x] ~~`complete_owner_onboarding()`~~ → Server Action
- [x] ~~`finish_owner_academy_setup()`~~ → Server Action에 통합
- [x] ~~`get_auth_stage()`~~ → `checkOnboardingStage()`
- [ ] `check_approval_status()` → Server Action 전환 필요

#### 2.2. Kiosk 관련 RPC (보류)
- [ ] `get_student_todos_for_kiosk()` - 키오스크 전용, PIN 검증 포함
  - 옵션 1: 그대로 유지 (security definer, anon 접근)
  - 옵션 2: API route로 전환 (추천)

#### 2.3. Dashboard 관련 RPC
- [ ] `get_dashboard_data()` - Stub 함수, 삭제 가능
  - Action: 마이그레이션 작성하여 제거

### Phase 3: RLS 정책 마이그레이션

**전략**: 단계적 제거 (Zero-downtime)

#### 3.1. 검증 단계
```sql
-- 1. 모든 RLS 정책을 audit 모드로 전환 (실패해도 통과)
-- 2. 애플리케이션 레벨 권한 검증 추가
-- 3. 로깅으로 RLS 정책 위반 사례 모니터링
```

#### 3.2. 제거 단계 (마이그레이션 작성)
```sql
-- Step 1: RLS를 비활성화하되, 정책은 유지 (롤백 가능)
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_todos DISABLE ROW LEVEL SECURITY;

-- Step 2: 충분한 검증 후 정책 제거 (새 마이그레이션)
-- DROP POLICY IF EXISTS tenants_select_own ON public.tenants;
-- DROP POLICY IF EXISTS users_select_self ON public.users;
-- ...
```

#### 3.3. Helper 함수 제거
```sql
-- RLS 정책에서만 사용되는 함수들 제거
DROP FUNCTION IF EXISTS public.current_user_tenant_id();
DROP FUNCTION IF EXISTS public.current_user_role();
```

### Phase 4: 코드 정리

- [ ] 사용하지 않는 RPC 함수 제거
- [ ] 중복된 helper 함수 정리
- [ ] 마이그레이션 파일 정리
- [ ] 문서 업데이트

### Phase 5: 테스트 및 검증

- [ ] 단위 테스트: Helper 함수들
- [ ] 통합 테스트: 전체 인증 플로우
- [ ] E2E 테스트:
  - [ ] 회원가입 → 이메일 인증 → 온보딩
  - [ ] 로그인 → 권한 확인 → 대시보드 접근
  - [ ] Multi-tenant 격리 테스트
- [ ] 보안 테스트:
  - [ ] 다른 tenant 데이터 접근 시도
  - [ ] 권한 없는 작업 시도
  - [ ] SQL injection 테스트

## 🛡️ 보안 체크리스트

### 배포 전 필수 확인

- [ ] 모든 Server Action에 인증 검증 추가
- [ ] 모든 DB 쿼리에 tenant_id 필터 추가
- [ ] Service role key가 클라이언트에 노출되지 않는지 확인
- [ ] 환경 변수 검증 (`src/lib/env.ts`)
- [ ] 감사 로그 구현 (`src/lib/audit-logger.ts`)
- [ ] 에러 메시지에 민감한 정보 미포함

## 📚 Helper 함수 설계

### getCurrentUserWithTenant()

```typescript
/**
 * 현재 사용자 및 tenant 정보 조회
 *
 * @returns 사용자 정보 + tenant 정보 또는 null
 */
export async function getCurrentUserWithTenant() {
  // 1. 인증 확인
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: '인증되지 않은 사용자입니다.', data: null }
  }

  // 2. 사용자 정보 조회 (service_role)
  const serviceClient = createServiceRoleClient()
  const { data: userData, error: userError } = await serviceClient
    .from('users')
    .select(`
      id,
      tenant_id,
      role_code,
      approval_status,
      onboarding_completed,
      tenants (
        id,
        name,
        slug,
        settings
      )
    `)
    .eq('id', user.id)
    .maybeSingle()

  if (userError || !userData) {
    return { success: false, error: '사용자 정보를 찾을 수 없습니다.', data: null }
  }

  return { success: true, data: userData }
}
```

### verifyTenantAccess()

```typescript
/**
 * Tenant 접근 권한 검증
 *
 * @param tenantId - 확인할 tenant ID
 * @returns 접근 가능 여부
 */
export async function verifyTenantAccess(tenantId: string) {
  const result = await getCurrentUserWithTenant()

  if (!result.success || !result.data) {
    return { success: false, error: result.error }
  }

  if (result.data.tenant_id !== tenantId) {
    return { success: false, error: '접근 권한이 없습니다.' }
  }

  return { success: true, data: result.data }
}
```

### verifyRolePermission()

```typescript
/**
 * 역할 기반 권한 검증
 *
 * @param allowedRoles - 허용된 역할 목록
 * @returns 권한 여부
 */
export async function verifyRolePermission(allowedRoles: string[]) {
  const result = await getCurrentUserWithTenant()

  if (!result.success || !result.data) {
    return { success: false, error: result.error }
  }

  if (!result.data.role_code || !allowedRoles.includes(result.data.role_code)) {
    return { success: false, error: '권한이 없습니다.' }
  }

  return { success: true, data: result.data }
}
```

## 🚀 다음 단계

1. **Helper 함수 구현** (`src/lib/auth/helpers.ts`)
   - getCurrentUserWithTenant()
   - verifyTenantAccess()
   - verifyRolePermission()

2. **남은 RPC 전환**
   - check_approval_status() → Server Action
   - get_student_todos_for_kiosk() → API route 검토

3. **RLS 정책 비활성화 마이그레이션 작성**

4. **테스트 작성 및 실행**

5. **배포 전 보안 검증**

## 📝 참고 문서

- [CLAUDE.md](../CLAUDE.md) - 프로젝트 아키텍처
- [DATASOURCE_ABSTRACTION.md](../DATASOURCE_ABSTRACTION.md) - DataSource 패턴
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - 배포 가이드
- [Supabase Service Role Docs](https://supabase.com/docs/guides/auth/service-role)
