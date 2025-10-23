# 실전 안정화 개선 사항

마이그레이션 완료 후 실전 배포를 위한 안정성 개선 작업 내역입니다.

## 개선 완료 항목

### ✅ 1. 콜백 라우트 개선 (`src/app/(auth)/auth/callback/route.ts`)

#### 1.1 에러 분류 강화

**BEFORE:**
```typescript
function classifyAuthError(error): string {
  if (m.includes("expired")) return "expired"
  if (m.includes("invalid")) return "invalid"
  return "unknown"
}
```

**AFTER:**
```typescript
function classifyAuthError(error): string {
  if (m.includes("expired")) return "expired"
  if (m.includes("invalid")) return "invalid"
  if (m.includes("rate limit") || m.includes("too many")) return "rate_limit"
  if (m.includes("provider")) return "provider_error"
  return "unknown"
}
```

**효과:**
- Rate limit 에러 구분 가능 → 봇/스팸 대응 개선
- Provider 에러 구분 가능 → OAuth 이슈 디버깅 용이

#### 1.2 리다이렉트 로직 함수화

**BEFORE:**
```typescript
// 인라인 분기 로직
if (nextUrl) {
  return NextResponse.redirect(`${origin}${nextUrl}`)
}
if (stageCode === 'READY') {
  return NextResponse.redirect(`${origin}/dashboard`)
}
return NextResponse.redirect(`${origin}/auth/login?verified=true&email=...`)
```

**AFTER:**
```typescript
// 단일 함수로 계산
function getRedirectUrl(origin, stageCode, nextUrl, userEmail): string {
  if (nextUrl) return `${origin}${nextUrl}`
  if (stageCode === 'READY') return `${origin}/dashboard`
  // ... fallback logic
}

const redirectUrl = getRedirectUrl(origin, stageCode, nextUrl, userEmail)
return NextResponse.redirect(redirectUrl)
```

**효과:**
- 리다이렉트 규칙 변경 시 한 곳만 수정
- 테스트 가능한 순수 함수
- 코드 중복 제거

#### 1.3 로깅 개선 (요청 ID, 사용자 ID 포함)

**BEFORE:**
```typescript
console.log("[auth/callback] exchange success")
console.error("[auth/callback] Profile creation failed:", profileResult.error)
```

**AFTER:**
```typescript
const requestId = crypto.randomUUID()
console.log("[auth/callback] Session exchange success", { requestId })
console.error("[auth/callback] Profile creation failed:", {
  requestId,
  userId,
  error: profileResult.error,
})
```

**효과:**
- 요청 단위로 로그 추적 가능
- 사용자별 이슈 디버깅 용이
- 구조화된 로그로 검색 개선

#### 1.4 이메일 인증 확인 추가

**BEFORE:**
```typescript
const { user } = await supabase.auth.getUser()
if (!user) return redirect('/auth/login')
// 바로 프로필 생성
```

**AFTER:**
```typescript
const { user } = await supabase.auth.getUser()
if (!user) return redirect('/auth/login')

// ✅ 이메일 인증 확인
const emailConfirmedAt = user.email_confirmed_at ?? user.confirmed_at
if (!emailConfirmedAt) {
  return redirect(`/auth/verify-email?email=${email}`)
}
// 인증 확인 후 프로필 생성
```

**효과:**
- 미인증 사용자 접근 차단
- Supabase v1/v2 호환성 고려

---

### ✅ 2. onboarding.ts 개선 (`src/app/actions/onboarding.ts`)

#### 2.1 RLS 경로 통일 (SERVICE ROLE)

**BEFORE:**
```typescript
// 일반 client로 users 테이블 읽기 (RLS 적용)
const supabase = await createServerClient()
const { data } = await supabase.from('users').select('*').eq('id', userId)
```

**AFTER:**
```typescript
// 인증 확인 후 service_role로 읽기 (RLS 우회)
const { user } = await supabase.auth.getUser()
// 인증 확인 완료 → service_role 사용 안전

const serviceClient = createServiceRoleClient()
const { data } = await serviceClient.from('users').select('*').eq('id', userId)
```

**효과:**
- RLS 정책 의존성 제거 → 안정성 향상
- 코드에서 명시적으로 권한 검증
- 환경별 RLS 정책 차이 영향 없음

#### 2.2 권한 검증 강화

**BEFORE:**
```typescript
// 단순 tenant_id 체크만
if (userData.tenant_id && userData.role_code === 'owner') {
  // 학원 설정 업데이트
}
```

**AFTER:**
```typescript
// 1. 다른 역할 체크
if (userData.role_code && userData.role_code !== 'owner' && userData.tenant_id) {
  return {
    success: false,
    error: '이미 다른 역할로 등록되어 있습니다.',
  }
}

// 2. 온보딩 완료 여부 체크 (멱등성)
if (userData.tenant_id && userData.role_code === 'owner' && userData.onboarding_completed) {
  // 학원 설정만 업데이트
}
```

**효과:**
- 역할 충돌 방지
- 멱등성 보장 강화
- 명확한 에러 메시지

#### 2.3 트랜잭션 명시 및 주석 추가

**BEFORE:**
```typescript
// 주석 없이 RPC 호출
const { data } = await serviceClient.rpc('complete_owner_onboarding', { ... })
```

**AFTER:**
```typescript
// ⚠️ 중요: 이 RPC는 트랜잭션 내에서 테넌트 생성 + 유저 업데이트를 수행합니다.
// 실패 시 자동으로 롤백되므로 원자성이 보장됩니다.
const { data } = await serviceClient.rpc('complete_owner_onboarding', { ... })
```

**효과:**
- 트랜잭션 동작 명확히 문서화
- 신규 개발자 온보딩 개선
- 원자성 보장 확인

#### 2.4 revalidatePath 개선

**BEFORE:**
```typescript
revalidatePath('/', 'layout')
```

**AFTER:**
```typescript
// 대시보드와 레이아웃 모두 revalidate
revalidatePath('/', 'layout')
revalidatePath('/dashboard')
revalidatePath('/dashboard', 'page')
```

**효과:**
- 캐시 무효화 범위 확대
- 데이터 일관성 개선
- SSR/ISR 페이지 갱신 보장

#### 2.5 로깅 개선 (요청 ID, tenant ID 포함)

**BEFORE:**
```typescript
console.log(`[completeOwnerOnboarding] Owner onboarding completed for user ${userId}`)
```

**AFTER:**
```typescript
const requestId = crypto.randomUUID()
console.log('[completeOwnerOnboarding] Owner onboarding completed successfully:', {
  requestId,
  userId,
  tenantId,
})
```

**효과:**
- 요청/사용자/테넌트별 로그 추적
- 구조화된 로그로 검색 용이
- 운영 디버깅 속도 향상

#### 2.6 프로필 생성 타임스탬프 명시

**BEFORE:**
```typescript
await serviceClient.from('users').insert({
  id: userId,
  email,
  name,
  // created_at, updated_at은 DB 기본값 의존
})
```

**AFTER:**
```typescript
const now = new Date().toISOString()
await serviceClient.from('users').insert({
  id: userId,
  email,
  name,
  created_at: now,
  updated_at: now,
})
```

**효과:**
- DB 기본값과의 정합성 보장
- 명시적인 타임스탬프 관리
- 환경별 시간대 차이 방지

---

## 주요 개선 효과 요약

### 🔒 보안

- ✅ 이메일 인증 확인 추가 (미인증 접근 차단)
- ✅ 권한 검증 강화 (역할 충돌 방지)
- ✅ RLS 우회는 인증 확인 후에만 (service_role 안전성)

### 📊 관측성

- ✅ 요청 ID 기반 로그 추적
- ✅ 사용자 ID, 테넌트 ID 포함
- ✅ 구조화된 로그 (JSON 형식)
- ✅ 에러 분류 개선 (rate_limit, provider_error)

### 🛡 안정성

- ✅ 멱등성 보장 강화
- ✅ 트랜잭션 동작 명시
- ✅ 리다이렉트 로직 함수화
- ✅ RLS 의존성 제거

### 🚀 유지보수성

- ✅ 코드 중복 제거
- ✅ 명확한 주석 추가
- ✅ 테스트 가능한 순수 함수
- ✅ 일관된 에러 처리

---

## 테스트 체크리스트

### 1. 콜백 라우트 테스트

```bash
# 1. 정상 플로우
# - 회원가입 → 이메일 클릭 → 자동 프로필 생성 → 올바른 페이지로 리다이렉트

# 2. 미인증 접근
# - 이메일 미확인 상태로 콜백 접근 → verify-email 페이지로 리다이렉트

# 3. 에러 케이스
# - 만료된 코드로 접근 → link-expired?error=expired
# - Rate limit 초과 → link-expired?error=rate_limit

# 4. 로그 확인
# - 모든 로그에 requestId 포함 확인
# - 사용자 ID 포함 확인
```

### 2. onboarding.ts 테스트

```bash
# 1. 정상 플로우
# - Owner Setup → 테넌트 생성 → 설정 업데이트 → 대시보드

# 2. 멱등성 테스트
# - 중복 호출 → 성공 (이미 완료된 경우)
# - 부분 실패 후 재시도 → 성공

# 3. 권한 충돌 테스트
# - 이미 다른 역할인 사용자가 Owner 온보딩 시도 → 에러

# 4. 로그 확인
# - requestId, userId, tenantId 포함 확인
# - 구조화된 로그 확인
```

### 3. 데이터베이스 확인

```sql
-- 프로필 생성 확인 (타임스탬프 포함)
SELECT id, email, role_code, created_at, updated_at
FROM users
WHERE email = 'test@example.com';

-- 테넌트 생성 확인
SELECT t.id, t.name, u.name as owner_name, u.onboarding_completed
FROM tenants t
JOIN users u ON u.tenant_id = t.id
WHERE u.role_code = 'owner';
```

---

## 다음 단계

### Phase 6: 정리 (선택)

1. **Deprecated 코드 제거**
   - `src/infrastructure/auth/auth-stage.service.ts::ownerFinishSetup()`
   - `src/hooks/use-auth-stage.ts::finishOwnerSetup()`
   - `db/schema/20_rpc/210_owner_setup_upsert.sql`

2. **Grant 권한 재검토**
   - `db/schema/50_grants/500_grants.sql` 정리

3. **로깅 시스템 통합**
   - 구조화된 로거 도입 (Winston, Pino 등)
   - 요청 ID를 헤더에서 받거나 전파

---

## 참고 문서

- [마이그레이션 계획서](./ONBOARDING_MIGRATION_PLAN.md)
- [완료 요약](./ONBOARDING_MIGRATION_SUMMARY.md)
- [Deprecated RPC 목록](./DEPRECATED_RPCS.md)
