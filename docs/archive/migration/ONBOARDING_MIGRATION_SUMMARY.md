# 원장 온보딩 워크플로 마이그레이션 완료 요약

## 🎉 완료된 작업

### Phase 1: Server Actions 생성 ✅

**파일:** `src/app/actions/onboarding.ts`

새로 구현된 Server Actions:
- `createUserProfileServer(userId)` - Service role로 프로필 자동 생성
- `completeOwnerOnboarding(params)` - Service role로 원장 온보딩 완료
- `checkOnboardingStage(inviteToken)` - 온보딩 상태 확인
- `getOnboardingState()` - 온보딩 상태 조회

**핵심 개선:**
- ✅ 모든 중요 로직을 서버에서만 실행
- ✅ Service role로 RLS 우회가 필요한 작업 처리
- ✅ 멱등성 보장 (중복 호출 시에도 안전)
- ✅ 상세한 에러 로깅 및 처리

### Phase 2: 이메일 콜백 개선 ✅

**파일:** `src/app/(auth)/auth/callback/route.ts`

**변경 사항:**
```typescript
// BEFORE
export async function GET(request: Request) {
  // ... 세션 교환
  // ❌ 프로필 생성 안 함
  return NextResponse.redirect(`${origin}/auth/login?verified=true`)
}

// AFTER
export async function GET(request: Request) {
  // ... 세션 교환
  // ✅ 자동 프로필 생성 (SERVICE ROLE)
  await createUserProfileServer(user.id)

  // ✅ 온보딩 상태 확인 후 적절한 페이지로 리다이렉트
  const { stage } = await supabase.rpc('get_auth_stage')
  return NextResponse.redirect(`${origin}${stage.next_url}`)
}
```

**핵심 개선:**
- ✅ 이메일 인증 직후 자동 프로필 생성
- ✅ 온보딩 상태 기반 스마트 라우팅
- ✅ 에러 케이스 처리 (프로필 생성 실패 시 /auth/pending으로)

### Phase 3: UI 리팩토링 ✅

**파일:** `src/app/(auth)/auth/owner/setup/page.tsx`

**변경 사항:**
```typescript
// BEFORE
const { finishOwnerSetup } = useAuthStage()

const onSubmit = async (data) => {
  // ❌ 클라이언트에서 authStageService 호출
  await finishOwnerSetup(data)
}

// AFTER
import { completeOwnerOnboarding } from '@/app/actions/onboarding'

const onSubmit = async (data) => {
  // ✅ Server Action 직접 호출
  const result = await completeOwnerOnboarding(data)

  if (!result.success) {
    toast({ title: '설정 실패', description: result.error })
    return
  }

  router.push('/dashboard')
}
```

**핵심 개선:**
- ✅ `useAuthStage` 훅 제거 (불필요한 추상화 제거)
- ✅ Server Action 직접 호출로 단순화
- ✅ 명확한 에러 처리 및 사용자 피드백

### Phase 4: RPC 함수 정리 ✅

**Deprecated RPC:**
- `owner_setup_upsert` - Server Action으로 대체됨

**유지되는 RPC:**
- `create_user_profile` - Service role 전용, 콜백에서 사용
- `complete_owner_onboarding` - Service role 전용, Server Action에서 사용
- `finish_owner_academy_setup` - Authenticated 사용자용, 설정 업데이트
- `get_auth_stage` - 온보딩 상태 확인
- `get_onboarding_state` - 온보딩 상태 조회

**문서화:**
- `docs/migration/DEPRECATED_RPCS.md` 생성
- Deprecation 노트 추가 및 제거 체크리스트 작성

## 📊 개선 결과 비교

### AS-IS (이전)

```
[Client] SignupForm
  → [Server Action] signUp
    → [Supabase Auth] signUp (일반 client)
      → 이메일 전송

[Client] 이메일 클릭
  → [Route] /auth/callback
    → [Server] exchangeCodeForSession
    → ❌ 프로필 생성 안 함
    → [Redirect] /auth/login

[Client] verify-email page
  → [Client] authStageService.createUserProfile ❌
    → [Client] createClient().rpc('create_user_profile') ❌

[Client] OwnerSetupPage
  → [Client] useAuthStage.finishOwnerSetup ❌
    → [Client] authStageService.ownerFinishSetup ❌
      → [Client] createClient().rpc('owner_setup_upsert') ❌
```

**문제점:**
- ❌ 프로필 생성 누락 (사용자가 수동으로 해야 함)
- ❌ 중요 로직이 클라이언트에서 실행
- ❌ Service role 미활용
- ❌ 에러 처리가 분산됨

### TO-BE (개선 후)

```
[Client] SignupForm
  → [Server Action] signUp
    → [Supabase Auth] signUp (일반 client)
      → 이메일 전송

[Client] 이메일 클릭
  → [Route] /auth/callback
    → [Server] exchangeCodeForSession
    → ✅ [Server Action] createUserProfileServer (SERVICE ROLE)
      → ✅ 자동 프로필 생성
    → ✅ get_auth_stage로 상태 확인
    → ✅ 적절한 페이지로 리다이렉트

[Client] OwnerSetupPage
  → ✅ [Server Action] completeOwnerOnboarding
    → ✅ [SERVICE ROLE] complete_owner_onboarding RPC
    → ✅ [Authenticated] finish_owner_academy_setup RPC
    → ✅ 성공 시 /dashboard로 이동
```

**개선점:**
- ✅ 이메일 인증 직후 자동 프로필 생성
- ✅ 모든 중요 로직이 서버에서 실행
- ✅ Service role로 안전하게 RLS 우회
- ✅ 일관된 에러 처리 및 로깅

## 🔐 보안 개선

### 이전

- ❌ 클라이언트에서 RPC 직접 호출 (`createClient().rpc()`)
- ❌ 클라이언트 코드에서 비즈니스 로직 실행
- ❌ SECURITY DEFINER RPC를 클라이언트에 노출

### 개선 후

- ✅ 서버에서만 Service role 사용
- ✅ 클라이언트는 Server Action만 호출
- ✅ Service role key는 서버에만 존재
- ✅ RPC 호출 전 반드시 인증 확인

## 📝 생성/수정된 파일

### 새로 생성된 파일

1. `src/app/actions/onboarding.ts` - 온보딩 Server Actions
2. `docs/migration/ONBOARDING_MIGRATION_PLAN.md` - 마이그레이션 계획서
3. `docs/migration/DEPRECATED_RPCS.md` - Deprecated RPC 목록
4. `docs/migration/ONBOARDING_MIGRATION_SUMMARY.md` - 완료 요약 (이 문서)

### 수정된 파일

1. `src/app/(auth)/auth/callback/route.ts` - 자동 프로필 생성 추가
2. `src/app/(auth)/auth/owner/setup/page.tsx` - Server Action 호출로 변경
3. `db/schema/20_rpc/210_owner_setup_upsert.sql` - Deprecation 노트 추가

### 제거 예정 파일 (Phase 6)

1. `src/infrastructure/auth/auth-stage.service.ts::ownerFinishSetup()`
2. `src/hooks/use-auth-stage.ts::finishOwnerSetup()` (또는 전체 파일)
3. `db/schema/20_rpc/210_owner_setup_upsert.sql`

## 🧪 다음 단계 (Phase 5)

### 로컬 환경 테스트

1. **회원가입 테스트**
   ```bash
   # 1. 새 이메일로 회원가입
   # 2. 이메일 확인 링크 클릭
   # 3. 자동으로 프로필 생성되는지 확인
   # 4. 온보딩 상태에 따라 올바른 페이지로 리다이렉트되는지 확인
   ```

2. **원장 설정 테스트**
   ```bash
   # 1. Owner Setup 페이지 접근
   # 2. 학원 정보 입력 후 제출
   # 3. Service role로 테넌트 생성되는지 확인
   # 4. Dashboard로 리다이렉트되는지 확인
   ```

3. **에러 케이스 테스트**
   ```bash
   # 1. 네트워크 에러 시뮬레이션
   # 2. 중복 제출 테스트 (멱등성 확인)
   # 3. 잘못된 입력 테스트
   ```

### 데이터베이스 확인

```sql
-- 프로필이 자동 생성되었는지 확인
SELECT id, email, role_code, onboarding_completed, approval_status
FROM users
WHERE email = 'test@example.com';

-- 테넌트가 생성되었는지 확인
SELECT t.id, t.name, t.slug, u.name as owner_name
FROM tenants t
JOIN users u ON u.tenant_id = t.id
WHERE u.role_code = 'owner';

-- 온보딩 상태 확인
SELECT * FROM get_auth_stage(null);
SELECT * FROM get_onboarding_state();
```

### 로깅 확인

콘솔에서 다음 로그 확인:
- `[auth/callback] Profile created for user {userId}`
- `[createUserProfileServer] Profile created/verified`
- `[completeOwnerOnboarding] Owner onboarding completed`

## 📚 관련 문서

- [마이그레이션 계획서](./ONBOARDING_MIGRATION_PLAN.md)
- [Deprecated RPC 목록](./DEPRECATED_RPCS.md)
- [Clean Architecture 가이드](../../CLAUDE.md)
- [Server Actions 가이드](./QUICK_REFERENCE.md)

## ⚠️ 주의사항

### Service Role 사용 시

1. **절대 클라이언트에 노출 금지**
   - Service role key는 서버 환경 변수에만 저장
   - 클라이언트 코드에서 `createServiceRoleClient()` import 금지

2. **반드시 인증 확인**
   ```typescript
   // ✅ CORRECT
   export async function myServerAction() {
     const supabase = await createServerClient()
     const { user } = await supabase.auth.getUser()

     if (!user) {
       return { success: false, error: '인증 필요' }
     }

     const serviceClient = createServiceRoleClient()
     // ... service role 작업
   }

   // ❌ WRONG
   export async function badServerAction() {
     const serviceClient = createServiceRoleClient()
     // 인증 확인 없이 service role 사용 - 위험!
   }
   ```

3. **멱등성 보장**
   - 중복 호출 시에도 안전하게 처리
   - 이미 존재하는 데이터는 에러가 아닌 성공으로 처리

4. **상세한 로깅**
   - 모든 service role 작업은 로그 기록
   - 에러 발생 시 충분한 컨텍스트 포함

## 🎯 성과

- ✅ 클라이언트 사이드 RPC 호출 제거
- ✅ Service role 기반 안전한 온보딩 워크플로
- ✅ 이메일 인증 직후 자동 프로필 생성
- ✅ 일관된 에러 처리 및 사용자 피드백
- ✅ Clean Architecture 원칙 준수
- ✅ 보안 강화 (RLS 우회는 서버에서만)

## 📅 다음 작업

1. **Phase 5: 테스트** (수동)
   - 로컬 환경에서 전체 플로우 테스트
   - 에러 케이스 검증
   - 데이터베이스 상태 확인

2. **Phase 6: 정리** (선택)
   - Deprecated RPC 제거
   - 사용하지 않는 훅/서비스 제거
   - Grant 권한 재검토

3. **Staging 배포**
   - Staging 환경에서 재검증
   - 실제 이메일 발송 테스트

4. **Production 배포**
   - Production 환경 배포
   - 모니터링 및 로그 확인
