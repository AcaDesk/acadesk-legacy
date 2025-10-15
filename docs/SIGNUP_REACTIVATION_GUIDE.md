# 회원가입 기능 재활성화 가이드

## 현재 상태

**피처플래그:** `signup: 'inactive'`

회원가입 기능은 완전히 구현되어 있으나 1차 MVP 출시 시 비활성화 상태입니다.

---

## 회원가입 흐름 (구현 완료)

### 1. 회원가입 방식

**A. 이메일 회원가입**
```
회원가입 폼 → 이메일 인증 → 온보딩 → 역할 선택
```

**B. 소셜 회원가입 (Google/Kakao)**
```
소셜 로그인 → 자동 인증 → 온보딩 → 역할 선택
```

### 2. 온보딩 역할 선택

#### A. Owner (원장님)
```
온보딩에서 Owner 선택
  ↓
학원명 입력 (필수)
  ↓
새 Tenant 자동 생성
  ↓
🔴 승인 대기 페이지 이동 (/auth/pending-approval)
  ↓
⚠️ 관리자가 수동으로 approval_status를 'approved'로 변경 필요
  ↓
✅ 대시보드 접근 가능
```

**문제점:**
- 자동 승인 메커니즘이 없음 (현재 수동 승인 필요)
- 승인 대기 상태에서는 대시보드 접근 불가

#### B. Staff (강사/직원)
```
온보딩에서 Staff 선택
  ↓
초대 코드 입력 (필수)
  ↓
초대 코드 검증
  ↓
기존 Tenant에 연결
  ↓
✅ 바로 대시보드 접근 가능
```

**문제점 없음:**
- 초대 코드로 검증됨
- 즉시 사용 가능

---

## 재활성화 방법

### 옵션 1: 자동 승인 (추천 ⭐)

Owner 계정을 자동으로 승인하여 즉시 사용 가능하게 합니다.

#### 1-1. 피처플래그 변경

```typescript
// src/lib/features.config.ts
export const FEATURES = {
  signup: 'active' as FeatureStatus,  // inactive → active
  // ...
}
```

#### 1-2. 온보딩 서비스 수정

`src/services/auth/onboardingService.ts` 파일에서 `completeOwnerOnboarding` 함수를 확인하고, `approval_status`를 `'approved'`로 자동 설정되도록 수정합니다.

**수정 예시:**
```typescript
// src/services/auth/onboardingService.ts

async completeOwnerOnboarding(userId: string, data: OnboardingFormData) {
  // 1. Tenant 생성
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: data.academyName,
      slug: slugify(data.academyName),  // 학원명을 slug로 변환
    })
    .select()
    .single()

  if (tenantError) return { error: tenantError }

  // 2. User 업데이트 (자동 승인)
  const { error: userError } = await supabase
    .from('users')
    .update({
      tenant_id: tenant.id,
      name: data.name,
      role_code: 'owner',
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      approval_status: 'approved',  // ⭐ 자동 승인
      approved_at: new Date().toISOString(),  // ⭐ 승인 시각 기록
      approved_by: userId,  // ⭐ 자가 승인 (또는 시스템)
    })
    .eq('id', userId)

  return { error: userError }
}
```

#### 1-3. 온보딩 페이지 라우팅 변경

`src/app/(auth)/auth/onboarding/page.tsx`에서 Owner 성공 시 라우팅을 변경합니다.

**수정 전:**
```typescript
router.push("/auth/pending-approval")  // 승인 대기 페이지로 이동
```

**수정 후:**
```typescript
router.push("/dashboard")  // 바로 대시보드로 이동
```

---

### 옵션 2: 승인 프로세스 구축

Owner 신청 후 관리자(슈퍼 어드민)가 승인하는 프로세스를 만듭니다.

#### 2-1. 슈퍼 어드민 페이지 생성

```typescript
// src/app/admin/approvals/page.tsx

export default async function ApprovalsPage() {
  const supabase = createServerClient()

  // 승인 대기 중인 사용자 목록 조회
  const { data: pendingUsers } = await supabase
    .from('users')
    .select('*, tenants(*)')
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1>회원 승인 관리</h1>
      {pendingUsers?.map(user => (
        <ApprovalCard key={user.id} user={user} />
      ))}
    </div>
  )
}
```

#### 2-2. 승인 버튼 구현

```typescript
async function handleApprove(userId: string) {
  const supabase = createClient()

  await supabase
    .from('users')
    .update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: 'admin-user-id',  // 승인한 관리자 ID
    })
    .eq('id', userId)

  // 이메일 알림 전송
  await sendApprovalEmail(userId)
}
```

#### 2-3. 피처플래그 변경

```typescript
// src/lib/features.config.ts
export const FEATURES = {
  signup: 'active' as FeatureStatus,
  // ...
}
```

---

## 추가 고려사항

### 1. 이메일 인증 필수

현재 구현에서는 이메일 인증을 거치도록 되어 있습니다:
- Supabase Dashboard → **Authentication** → **Settings**
- **Enable email confirmations** 옵션 확인

### 2. Slug 충돌 방지

학원명을 slug로 변환할 때 중복 체크 필요:

```typescript
function generateUniqueSlug(academyName: string): string {
  const baseSlug = slugify(academyName)
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${baseSlug}-${randomSuffix}`
}
```

### 3. Rate Limiting

회원가입 스팸 방지를 위한 Rate Limiting 설정:
- Supabase Dashboard → **Authentication** → **Rate Limits**
- 권장: 1분당 5회 제한

### 4. 승인 대기 중 기능 제한

`src/middleware.ts`에서 `approval_status`가 `'pending'`인 경우 접근 제한:

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('approval_status, onboarding_completed')
      .eq('id', user.id)
      .single()

    // 온보딩 미완료 → 온보딩 페이지로
    if (!profile?.onboarding_completed) {
      return NextResponse.redirect(new URL('/auth/onboarding', request.url))
    }

    // 승인 대기 중 → 승인 대기 페이지로
    if (profile?.approval_status === 'pending') {
      return NextResponse.redirect(new URL('/auth/pending-approval', request.url))
    }
  }

  return NextResponse.next()
}
```

---

## 체크리스트

### 옵션 1 (자동 승인) 체크리스트

- [ ] 피처플래그 변경 (`signup: 'active'`)
- [ ] 온보딩 서비스에서 자동 승인 로직 추가
- [ ] 온보딩 페이지 라우팅 변경 (`/dashboard`로 직행)
- [ ] Slug 중복 방지 로직 추가
- [ ] 이메일 인증 활성화 확인
- [ ] Rate Limiting 설정
- [ ] 회원가입 테스트 (이메일 + 소셜)

### 옵션 2 (승인 프로세스) 체크리스트

- [ ] 피처플래그 변경 (`signup: 'active'`)
- [ ] 슈퍼 어드민 승인 페이지 구현
- [ ] 승인 API/Server Action 구현
- [ ] 승인 완료 이메일 발송 로직 추가
- [ ] Middleware에서 승인 상태 체크
- [ ] Slug 중복 방지 로직 추가
- [ ] 이메일 인증 활성화 확인
- [ ] Rate Limiting 설정
- [ ] 회원가입 테스트 (이메일 + 소셜)

---

## 빠른 재활성화 (옵션 1 적용)

가장 빠르게 회원가입을 열려면:

1. **피처플래그 변경**
   ```bash
   # src/lib/features.config.ts
   signup: 'active'
   ```

2. **온보딩 서비스 확인**
   - `src/services/auth/onboardingService.ts` 열기
   - `completeOwnerOnboarding` 함수에서 `approval_status: 'approved'` 추가 여부 확인
   - 없으면 추가

3. **라우팅 변경**
   ```typescript
   // src/app/(auth)/auth/onboarding/page.tsx (라인 263)
   // 변경 전: router.push("/auth/pending-approval")
   router.push("/dashboard")  // ⬅️ 이렇게 변경
   ```

4. **테스트**
   ```bash
   pnpm dev
   ```
   - `/auth/signup` 접속
   - 회원가입 → 이메일 인증 → 온보딩 → 대시보드

끝!

---

## 관련 파일

- **피처플래그:** `src/lib/features.config.ts`
- **회원가입 페이지:** `src/app/(auth)/auth/signup/page.tsx`
- **회원가입 폼:** `src/components/auth/SignupForm.tsx`
- **온보딩 페이지:** `src/app/(auth)/auth/onboarding/page.tsx`
- **온보딩 서비스:** `src/services/auth/onboardingService.ts`
- **승인 대기 페이지:** `src/app/(auth)/auth/pending-approval/page.tsx`
- **로그인 폼:** `src/components/auth/LoginForm.tsx` (회원가입 링크 피처플래그)

---

## 문의

회원가입 재활성화 관련 문제가 발생하면:
1. Supabase 로그 확인 (**Logs** → **Postgres Logs**)
2. 브라우저 콘솔 확인
3. RLS 정책 확인 (users 테이블의 INSERT 정책)
