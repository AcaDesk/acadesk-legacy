# RLS 403 에러 방지 가이드

## 문제 상황

**증상**: "겉보기엔 그럴듯한데 가끔 403이 튀는" 현상

**원인**:
```
요청 → 익명(anon) 세션 → DB SELECT → RLS 정책 체크 → 권한 없음 → 403 Forbidden
```

## 핵심 원인 (2가지 축)

### 1. 서버/클라이언트 Supabase 클라이언트 혼용

**문제 코드**:
```typescript
// ❌ 두 파일 모두 같은 이름 export
// src/lib/supabase/client.ts
export function createClient() { ... }

// src/lib/supabase/server.ts
export function createClient() { ... }

// 사용처에서 실수로 잘못된 것 import
import { createClient } from '@/lib/supabase/client' // 서버에서 사용 시 문제!
```

**결과**:
- 브라우저에서 서버 클라이언트를 사용 → 익명 요청
- 서버에서 브라우저 클라이언트를 사용 → 세션 쿠키 누락
- 빌드 타이밍/트리쉐이킹에 따라 간헐적 발생

**해결책** ✅:
```typescript
// src/lib/supabase/client.ts
export function createSupabaseBrowserClient() { ... }

// src/lib/supabase/server.ts
export function createServerClient() { ... }

// 사용처
import { createSupabaseBrowserClient } from '@/lib/supabase/client' // 명확!
import { createServerClient } from '@/lib/supabase/server' // 명확!
```

### 2. 미들웨어에서 DB 직접 SELECT

**문제 코드**:
```typescript
// ❌ middleware.ts
const { data: { user } } = await supabase.auth.getUser()

// 세션이 일시적으로 anon이면 이 SELECT가 RLS에 막힘!
const { data: userData } = await supabase
  .from("users")
  .select("approval_status, onboarding_completed, role_code")
  .eq("id", user.id)
  .single() // ← 403 Forbidden
```

**문제점**:
- 미들웨어는 모든 요청마다 실행
- 세션 갱신 타이밍에 따라 일시적으로 anon 상태 가능
- DB SELECT 시 RLS 정책 체크 → 권한 없음 → 403

**해결책** ✅:
```typescript
// ✅ middleware.ts - DB 접근 제거
const { data: { user } } = await supabase.auth.getUser()

// 세션 상태만 확인, DB 접근 X
if (!user && !isPublicPath) {
  return NextResponse.redirect('/auth/login')
}

// 온보딩/승인 상태는 페이지에서 RPC로 확인
```

```typescript
// ✅ onboarding/page.tsx
const { data: state } = await onboardingService.checkOnboardingStatus(user.id)
// → RPC: get_onboarding_state (SECURITY DEFINER)
// → RLS 우회, 항상 성공
```

## 구현된 해결책

### 1. 명확한 함수 이름 분리 ✅

**client.ts**:
```typescript
/**
 * 브라우저 클라이언트용 Supabase 클라이언트
 * ⚠️ 반드시 클라이언트 컴포넌트('use client')에서만 사용!
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 하위 호환성
export const createClient = createSupabaseBrowserClient
```

**server.ts**:
```typescript
/**
 * 서버 컴포넌트/액션용 Supabase 클라이언트
 * ⚠️ 반드시 서버 컴포넌트, API Route, Server Action에서만 사용!
 */
export async function createServerClient() {
  const cookieStore = await cookies()
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { ... } }
  )
}
```

### 2. 미들웨어 최소화 ✅

**역할 한정**:
- ✅ 세션 쿠키 유지/갱신
- ✅ 인증 상태 확인 (auth.getUser)
- ✅ 기본 라우팅 (로그인 여부, 이메일 인증만)
- ❌ DB SELECT (절대 금지)

**코드**:
```typescript
export async function updateSession(request: NextRequest) {
  // 세션만 확인 (DB 접근 X)
  const { data: { user } } = await supabase.auth.getUser()

  // 최소한의 라우팅
  if (!user && !isPublicPath) {
    return NextResponse.redirect('/auth/login')
  }

  if (user && !user.email_confirmed_at) {
    return NextResponse.redirect('/auth/verify-email')
  }

  // ⚠️ 온보딩/승인 상태는 페이지에서 RPC로 확인
  return supabaseResponse
}
```

### 3. RLS Self 정책 추가 ✅

**마이그레이션**: `10_UsersSelfRLSPolicies.sql`

```sql
-- 본인 조회 정책
CREATE POLICY users_self_select
  ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- 본인 업데이트 정책
CREATE POLICY users_self_update
  ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

**효과**:
- ✅ 온보딩 전 (tenant_id NULL)에도 본인 데이터 접근 가능
- ✅ 승인 대기 중 (approval_status = 'pending')에도 조회/수정 가능
- ✅ 403 에러 근본 원인 차단

### 4. 정적 리소스 제외 ✅

**middleware.ts** - matcher 설정:
```typescript
export const config = {
  matcher: [
    // 정적 리소스 제외
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

**효과**:
- ✅ 이미지, 폰트 등에 세션 체크 안 함
- ✅ 성능 개선
- ✅ 불필요한 에러 로그 방지

## RLS 정책 우선순위

### users 테이블 정책 순서

| 순위 | 정책 이름 | 목적 | 적용 시점 |
|-----|----------|------|----------|
| **1** | `users_self_select` | **본인 조회** | **온보딩 전/후 항상** |
| **2** | `users_self_update` | **본인 업데이트** | **온보딩 중** |
| 3 | `users_same_tenant_select` | 같은 테넌트 조회 | 일반 운영 |
| 4 | `users_owner_insert` | 원장 사용자 추가 | 초대 기능 |
| 5 | `users_owner_update` | 원장 사용자 수정 | 관리 기능 |
| 6 | `users_owner_delete` | 원장 사용자 삭제 | 관리 기능 |

**핵심**: 1번, 2번 정책이 **안전망** 역할
- tenant_id NULL → self 정책으로 접근 가능
- tenant_id 있음 → same_tenant 정책으로 접근 가능

## 테스트 시나리오

### 1. 온보딩 전 본인 조회 (tenant_id NULL)

```sql
-- 사용자: 회원가입 직후, tenant_id = NULL
SELECT * FROM users WHERE id = auth.uid();

-- 예상 결과: ✅ 성공 (users_self_select)
-- 실제 쿼리: SELECT ... WHERE id = 'user-uuid'
```

### 2. 온보딩 중 본인 업데이트

```sql
-- 사용자: 온보딩 진행 중
UPDATE users
SET name = 'Test',
    onboarding_completed = true,
    tenant_id = 'tenant-uuid'
WHERE id = auth.uid();

-- 예상 결과: ✅ 성공 (users_self_update)
```

### 3. 다른 사용자 조회 시도

```sql
-- 사용자: 일반 사용자
SELECT * FROM users WHERE id != auth.uid();

-- 예상 결과:
-- - tenant_id NULL: ❌ 빈 결과
-- - tenant_id 있음: ✅ 같은 테넌트만 조회 (users_same_tenant_select)
```

### 4. 미들웨어 DB SELECT 제거 확인

```typescript
// Before (문제)
const { data: userData } = await supabase
  .from("users")
  .select("...")
  .eq("id", user.id) // ← 403 위험

// After (해결)
// DB SELECT 없음!
// 페이지에서 RPC로 확인
```

## 체크리스트

### 배포 전 필수 확인

- [x] **client.ts** → `createSupabaseBrowserClient()` export
- [x] **server.ts** → `createServerClient()` export
- [x] **middleware.ts** → DB SELECT 제거
- [x] **RLS 정책** → `users_self_select`, `users_self_update` 추가
- [x] **matcher** → 정적 리소스 제외

### 마이그레이션 적용

```bash
# 로컬 테스트
supabase migration up

# 또는 Supabase Dashboard SQL Editor에서 실행
# supabase/migrations/10_UsersSelfRLSPolicies.sql
```

### 검증 쿼리

```sql
-- 1. RLS 정책 확인
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users'
ORDER BY policyname;

-- 예상 출력:
-- users_self_select     | SELECT | (id = auth.uid())
-- users_self_update     | UPDATE | (id = auth.uid()) | (id = auth.uid())
-- users_same_tenant_... | SELECT | (tenant_id = get_current_tenant_id())

-- 2. RLS 활성화 확인
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- 예상: rowsecurity = true
```

## 문제 발생 시 디버깅

### 증상: 여전히 403 에러

**체크 포인트**:

1. **클라이언트 확인**:
```typescript
// 브라우저 콘솔에서 확인
console.log('Client type:', supabase.constructor.name)
// 예상: 클라이언트 컴포넌트는 'SupabaseBrowserClient'
```

2. **세션 확인**:
```typescript
const { data: { user } } = await supabase.auth.getUser()
console.log('User:', user?.id, 'Anon:', user === null)
// Anon이 true면 세션 문제
```

3. **RLS 정책 확인**:
```sql
-- Supabase Dashboard → SQL Editor
SELECT * FROM users WHERE id = auth.uid();
-- 에러 발생 시 RLS 정책 문제
```

4. **로그 확인**:
```bash
# 서버 로그
tail -f .next/server/app/...

# Supabase 로그
# Dashboard → Logs → Postgres
```

### 증상: 간헐적 403 에러

**원인**: Import 혼동 가능성

**해결**:
```bash
# 전체 코드베이스에서 잘못된 import 검색
grep -r "from '@/lib/supabase/client'" src/app/**/page.tsx
grep -r "from '@/lib/supabase/server'" src/components/**/*.tsx

# 서버 컴포넌트는 server, 클라이언트 컴포넌트는 client
```

## 모범 사례

### DO ✅

```typescript
// ✅ 클라이언트 컴포넌트
'use client'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// ✅ 서버 컴포넌트
import { createServerClient } from '@/lib/supabase/server'

// ✅ 페이지에서 RPC 사용
const { data } = await supabase.rpc('get_onboarding_state')

// ✅ Self 정책으로 본인 데이터 접근
SELECT * FROM users WHERE id = auth.uid()
```

### DON'T ❌

```typescript
// ❌ 같은 이름 export
export function createClient() { ... }

// ❌ 미들웨어에서 DB SELECT
const { data } = await supabase.from('users').select(...)

// ❌ 클라이언트에서 서버 함수 import
import { createClient } from '@/lib/supabase/server' // 에러!

// ❌ tenant_id로만 접근 (온보딩 전 차단됨)
SELECT * FROM users WHERE tenant_id = get_current_tenant_id()
```

## 결론

**"가끔 403이 튀는" 문제는 다음 3축으로 완전히 해결**:

1. **명확한 이름** → Import 혼동 방지
2. **미들웨어 최소화** → DB SELECT 제거
3. **Self RLS 정책** → 온보딩 전에도 본인 접근 가능

이제 **모든 인증 플로우에서 403 에러 없이** 안정적으로 작동합니다! 🎉

---

**작성일**: 2025-10-15
**작성자**: Acadesk Team
**참고**: `supabase/migrations/10_UsersSelfRLSPolicies.sql`
