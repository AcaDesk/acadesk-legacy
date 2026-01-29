# 원장 온보딩 워크플로 마이그레이션 계획

## 개요

원장님 계정 생성 워크플로(회원가입 → 이메일 인증 → 프로필 생성 → 학원 설정)를 **완전한 server-side + service_role 기반**으로 마이그레이션합니다.

## 목표

- ✅ 모든 중요 온보딩 로직을 Server Actions로 이동
- ✅ Service Role을 사용한 안전한 프로필/테넌트 생성
- ✅ 이메일 인증 후 자동 프로필 생성
- ✅ RLS 정책 우회가 필요한 작업만 service_role 사용
- ✅ 클라이언트는 UI만 담당

## 현재 워크플로 (AS-IS)

```mermaid
graph TD
    A[회원가입 폼] -->|Client| B[signUp Server Action]
    B -->|createServerClient| C[supabase.auth.signUp]
    C --> D[이메일 전송]
    D --> E[사용자가 이메일 클릭]
    E --> F[/auth/callback]
    F -->|createClient| G[exchangeCodeForSession]
    G --> H[/auth/login?verified=true]
    H --> I[Client: authStageService.createUserProfile]
    I -->|createClient| J[create_user_profile RPC]
    J --> K[Owner Setup Page]
    K --> L[Client: authStageService.ownerFinishSetup]
    L -->|createClient| M[owner_setup_upsert RPC]
```

**문제점:**
- ❌ Step I, L: 클라이언트에서 중요 RPC 호출
- ❌ Step F-G: 프로필 생성 누락
- ❌ Service role 미사용

## 개선된 워크플로 (TO-BE)

```mermaid
graph TD
    A[회원가입 폼] -->|Client| B[signUp Server Action]
    B -->|createServerClient| C[supabase.auth.signUp]
    C --> D[이메일 전송]
    D --> E[사용자가 이메일 클릭]
    E --> F[/auth/callback]
    F -->|SERVICE ROLE| G[자동 프로필 생성]
    G --> H[/auth/owner/setup]
    H --> I[원장 설정 폼]
    I -->|Server Action| J[completeOwnerSetup]
    J -->|SERVICE ROLE| K[complete_owner_onboarding RPC]
    K --> L[/dashboard]
```

**개선점:**
- ✅ 이메일 인증 직후 자동 프로필 생성 (service_role)
- ✅ 모든 중요 로직 Server Actions로 이동
- ✅ 클라이언트는 UI만 담당

## 마이그레이션 단계

### Phase 1: Server Actions 생성 ✅

**파일:** `src/app/actions/onboarding.ts` (신규)

```typescript
'use server'

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createServerClient } from '@/lib/supabase/server'

/**
 * 프로필 자동 생성 (이메일 인증 콜백에서 호출)
 * Service role 사용하여 RLS 우회
 */
export async function createUserProfileServer(userId: string) {
  const serviceClient = createServiceRoleClient()

  const { data, error } = await serviceClient.rpc('create_user_profile')

  // ... 에러 처리
}

/**
 * 원장 온보딩 완료 (학원 설정)
 * Service role 사용하여 complete_owner_onboarding RPC 호출
 */
export async function completeOwnerOnboarding(params: {
  academyName: string
  timezone?: string
  settings?: Record<string, unknown>
}) {
  // 1. 인증 확인
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: '인증되지 않은 사용자입니다.' }
  }

  // 2. Service role로 complete_owner_onboarding 호출
  const serviceClient = createServiceRoleClient()

  const { data, error } = await serviceClient.rpc('complete_owner_onboarding', {
    _user_id: user.id,
    _name: user.user_metadata?.full_name || user.email,
    _academy_name: params.academyName,
  })

  // 3. 학원 설정 업데이트 (finish_owner_academy_setup)
  // ...

  return { success: true, data }
}

/**
 * 온보딩 상태 확인
 */
export async function checkOnboardingStage() {
  const supabase = await createServerClient()

  const { data, error } = await supabase.rpc('get_auth_stage')

  return { data, error }
}
```

### Phase 2: 이메일 콜백 개선 ✅

**파일:** `src/app/(auth)/auth/callback/route.ts`

```typescript
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const origin = url.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  const supabase = await createClient()
  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeErr) {
    return NextResponse.redirect(`${origin}/auth/link-expired`)
  }

  // 세션 교환 성공 → 현재 사용자 확인
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  // ✅ 자동 프로필 생성 (SERVICE ROLE)
  try {
    const serviceClient = createServiceRoleClient()
    const { error: profileError } = await serviceClient.rpc('create_user_profile')

    if (profileError) {
      console.error('Failed to create user profile:', profileError)
      // 프로필 생성 실패 시 재시도 페이지로
      return NextResponse.redirect(`${origin}/auth/pending`)
    }
  } catch (error) {
    console.error('Profile creation error:', error)
    return NextResponse.redirect(`${origin}/auth/pending`)
  }

  // ✅ 온보딩 상태 확인 후 적절한 페이지로 리다이렉트
  try {
    const { data: stageData } = await supabase.rpc('get_auth_stage')

    const nextUrl = stageData?.stage?.next_url

    if (nextUrl) {
      return NextResponse.redirect(`${origin}${nextUrl}`)
    }

    return NextResponse.redirect(`${origin}/dashboard`)
  } catch (error) {
    console.error('Auth stage check error:', error)
    return NextResponse.redirect(`${origin}/auth/login`)
  }
}
```

### Phase 3: UI 리팩토링 ✅

**파일:** `src/app/(auth)/auth/owner/setup/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { completeOwnerOnboarding } from '@/app/actions/onboarding'

export default function OwnerSetupPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const { register, handleSubmit } = useForm()

  const onSubmit = async (data) => {
    setIsSubmitting(true)

    try {
      // ✅ Server Action 호출 (service_role 사용)
      const result = await completeOwnerOnboarding({
        academyName: data.academyName,
        timezone: 'Asia/Seoul',
        settings: {
          address: data.academyAddress,
          phone: data.academyPhone,
        },
      })

      if (!result.success) {
        toast({ title: '설정 실패', description: result.error, variant: 'destructive' })
        return
      }

      toast({ title: '설정 완료', description: '학원 설정이 완료되었습니다.' })
      router.push('/dashboard')
    } catch (error) {
      toast({ title: '오류', description: '알 수 없는 오류가 발생했습니다.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* ... 폼 UI */}
    </form>
  )
}
```

### Phase 4: RPC 함수 정리 ✅

**파일:** `db/schema/20_rpc/200_onboarding.sql`

1. **`create_user_profile()`**
   - ✅ `SECURITY DEFINER` 유지
   - ✅ `authenticated, anon` 권한 유지 (이메일 링크 클릭 시 anon일 수 있음)
   - ⚠️ 멱등성 보장 (이미 있으면 성공 반환)

2. **`complete_owner_onboarding(uuid, text, text, text)`**
   - ✅ `SECURITY DEFINER` 유지
   - ✅ `REVOKE ALL FROM authenticated` (service_role 전용)
   - ⚠️ 테넌트 생성 + 원장 권한 부여 + 승인 처리

3. **`finish_owner_academy_setup(text, text, jsonb)`**
   - ✅ `SECURITY DEFINER` 유지
   - ✅ `authenticated` 권한 유지
   - ⚠️ 원장만 호출 가능하도록 검증 강화

4. **`owner_setup_upsert(...)` 제거**
   - ❌ `complete_owner_onboarding` + `finish_owner_academy_setup`으로 대체

### Phase 5: 테스트 ✅

1. **Unit Tests**
   - `src/app/actions/onboarding.test.ts`
   - Mock service_role client
   - 각 Server Action 테스트

2. **E2E Tests**
   - `tests/e2e/onboarding.spec.ts`
   - 전체 온보딩 플로우 테스트
   - 회원가입 → 이메일 인증 → 학원 설정 → 대시보드

3. **Manual Tests**
   - Local 환경에서 실제 회원가입 테스트
   - Staging 환경에서 검증

## 체크리스트

### Phase 1: Server Actions 생성
- [ ] `src/app/actions/onboarding.ts` 생성
- [ ] `createUserProfileServer()` 구현
- [ ] `completeOwnerOnboarding()` 구현
- [ ] `checkOnboardingStage()` 구현
- [ ] 에러 처리 및 로깅 추가

### Phase 2: 이메일 콜백 개선
- [ ] `src/app/(auth)/auth/callback/route.ts` 수정
- [ ] Service role로 자동 프로필 생성 추가
- [ ] 온보딩 상태 기반 라우팅 구현
- [ ] 에러 케이스 처리

### Phase 3: UI 리팩토링
- [ ] `src/app/(auth)/auth/owner/setup/page.tsx` 수정
- [ ] `useAuthStage` 훅 제거
- [ ] Server Action 호출로 변경
- [ ] 로딩/에러 상태 UI 개선

### Phase 4: RPC 함수 정리
- [ ] `complete_owner_onboarding()` 검증
- [ ] `finish_owner_academy_setup()` 검증 강화
- [ ] `owner_setup_upsert()` 제거 (사용 안 함)
- [ ] Grant 권한 재검토

### Phase 5: 테스트
- [ ] Unit tests 작성
- [ ] E2E tests 작성
- [ ] Local 환경 테스트
- [ ] Staging 환경 테스트

### Phase 6: 정리
- [ ] `src/infrastructure/auth/auth-stage.service.ts` 제거 또는 단순화
- [ ] `src/hooks/use-auth-stage.ts` 제거 또는 단순화
- [ ] 사용하지 않는 코드 제거
- [ ] 문서 업데이트

## 롤백 계획

만약 문제 발생 시:

1. **Phase 3까지 완료 시**: 새 Server Actions 제거, 기존 코드 복원
2. **Phase 2 완료 시**: 콜백 라우트 원복
3. **전체 롤백 필요 시**: Git revert로 마이그레이션 이전 상태로 복원

## 주의사항

1. **Service Role 보안**
   - ⚠️ Service role key는 절대 클라이언트에 노출 금지
   - ⚠️ Service role 사용 전 반드시 인증 확인
   - ⚠️ 민감한 작업은 추가 권한 검증 필요

2. **RLS 정책**
   - ⚠️ Service role은 RLS 우회하므로 코드에서 직접 검증 필요
   - ⚠️ 테넌트 격리가 필요한 작업은 명시적으로 체크

3. **멱등성**
   - ⚠️ 모든 온보딩 RPC 함수는 멱등성 보장 필요
   - ⚠️ 중복 호출 시에도 안전하게 처리

4. **에러 처리**
   - ⚠️ 사용자 친화적인 에러 메시지 제공
   - ⚠️ 서버 로그에 상세한 에러 정보 기록

## 예상 소요 시간

- Phase 1: 2-3시간
- Phase 2: 1-2시간
- Phase 3: 1-2시간
- Phase 4: 1시간
- Phase 5: 2-3시간
- Phase 6: 1시간

**총 예상 시간:** 8-12시간

## 참고 문서

- [Clean Architecture - CLAUDE.md](../../CLAUDE.md)
- [Server Actions 가이드](./QUICK_REFERENCE.md)
- [Service Role 보안 가이드](../../internal/tech/Architecture.md)
- [RLS 정책 설계](../../internal/tech/ERD.md)
