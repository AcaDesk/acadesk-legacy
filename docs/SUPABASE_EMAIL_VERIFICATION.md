# Supabase 이메일 인증 설정 가이드

이메일 인증 링크가 제대로 작동하지 않는 경우 아래 설정을 확인하세요.

## 문제 증상

- ✅ 첫 번째 클릭에서 "유효하지 않은 링크" 에러
- ✅ 두 번째 클릭에서 로그인 페이지로 이동
- ✅ 이메일 인증 후 온보딩 페이지가 아닌 다른 페이지로 이동

## 원인

**이메일 클라이언트/보안 스캐너가 링크를 미리 클릭**

Gmail, 네이버, Outlook 등의 이메일 서비스는 보안을 위해 링크를 자동으로 확인합니다.
이 과정에서 Supabase의 1회용 인증 코드(`?code=...`)가 소비되어, 사용자가 실제로 클릭할 때는 이미 사용된 코드가 됩니다.

## 해결 방법

### 1. Supabase 프로젝트 설정 확인

**Dashboard → Project Settings → Authentication → URL Configuration**

```bash
# Site URL (정확히 일치해야 함)
https://www.acadesk.site

# Redirect URLs (추가)
https://www.acadesk.site/**
https://www.acadesk.site/auth/callback
```

**중요 사항:**
- ✅ `www` 포함 여부 통일 (있으면 모두 있게, 없으면 모두 없게)
- ✅ `https` 프로토콜 사용 (로컬은 `http://localhost:3000`)
- ✅ 슬래시(`/`) 유무 통일

### 2. 로컬 개발 환경 설정

**`.env.local` 파일:**

```bash
# 로컬 개발 시
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 프로덕션 배포 전 다시 변경
# NEXT_PUBLIC_APP_URL=https://www.acadesk.site
```

### 3. 이메일 템플릿 확인

**Dashboard → Authentication → Email Templates → Confirm signup**

템플릿이 다음과 같이 설정되어 있는지 확인:

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

**중요:** `{{ .ConfirmationURL }}`이 그대로 사용되어야 합니다.

### 4. 코드에서 redirect URL 확인

**`src/services/auth/auth.service.ts`:**

```typescript
async signUp(data: SignUpData): Promise<AuthResult> {
  const { email, password } = data
  const supabase = createClient()

  // ✅ 환경변수에서 앱 URL 가져오기
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // ✅ Supabase 설정의 Redirect URLs와 일치해야 함
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  })
  // ...
}
```

## 디버깅 방법

### 1. 서버 로그 확인

이메일 링크를 클릭하기 **전에** 서버 로그를 확인:

```bash
# 개발 서버 로그
pnpm dev

# 콘솔에서 다음 로그를 찾기:
# [auth/callback] hit: { fullUrl: '...', params: { code: '...' } }
```

**스캐너가 미리 호출한 경우:**
- 사용자 클릭 전에 로그가 먼저 찍힘
- 첫 번째 호출: `exchange success`
- 두 번째 호출(실제 클릭): `exchange error: { message: 'invalid...' }`

### 2. 다른 이메일 클라이언트로 테스트

```bash
# 테스트 순서
1. Gmail 웹 (크롬) ✅ 권장
2. 네이버 메일 앱 ⚠️ 스캐너 활성화
3. Outlook 앱 ⚠️ 스캐너 활성화
```

### 3. URL 복사 & 붙여넣기 테스트

1. 이메일에서 링크를 **우클릭 → 링크 주소 복사**
2. 브라우저 주소창에 **직접 붙여넣기**
3. 이 방법으로 성공하면 스캐너 문제 확인

## UX 개선 (현재 구현됨)

### 1. link-expired 페이지에 스캐너 안내 추가 ✅

```typescript
// src/app/(auth)/auth/link-expired/page.tsx
{errorType === "used" || errorType === "invalid" ? (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
    <p className="font-medium text-amber-900">
      💡 이메일 보안 검사로 인한 문제일 수 있습니다
    </p>
    <p className="text-amber-700">
      Gmail, 네이버, Outlook 등의 이메일 서비스는 보안을 위해 링크를 자동으로 확인합니다.
      이 과정에서 인증 링크가 미리 사용되었을 수 있습니다.
    </p>
    <ul className="ml-4 list-disc space-y-1 text-amber-700">
      <li>아래 버튼을 눌러 새 인증 이메일을 받으세요</li>
      <li>또는 이메일 링크를 복사하여 브라우저 주소창에 직접 붙여넣으세요</li>
      <li>모바일에서는 이메일 앱 대신 웹 브라우저에서 이메일을 확인해보세요</li>
    </ul>
  </div>
) : null}
```

### 2. 미들웨어에서 /auth/callback 완전 우회 ✅

```typescript
// src/lib/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // ⚠️ CRITICAL: /auth/callback은 완전히 우회 (이메일 스캐너 대응)
  // - code 파라미터가 유실되지 않도록 어떤 리다이렉트도 하지 않음
  // - 세션 체크도 하지 않음 (RLS 위험)
  if (pathname === "/auth/callback") {
    return NextResponse.next({ request })
  }

  // ... 나머지 로직
}
```

### 3. 콜백 핸들러에 로깅 추가 ✅

```typescript
// src/app/(auth)/auth/callback/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url)

  // 🔍 로깅: 콜백 진입 (스캐너 감지용)
  console.log("[auth/callback] hit:", {
    fullUrl: url.toString(),
    params: Object.fromEntries(url.searchParams),
    timestamp: new Date().toISOString(),
  })

  const code = url.searchParams.get("code")

  if (!code) {
    console.warn("[auth/callback] missing code param")
    return NextResponse.redirect(`${origin}/auth/login`)
  }

  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeErr) {
    // 🔍 로깅: 교환 실패 (스캐너가 먼저 호출했는지 확인)
    console.error("[auth/callback] exchange error:", {
      message: exchangeErr.message,
      status: exchangeErr.status,
      code: exchangeErr.code,
      fullError: exchangeErr,
    })
    // ...
  }
}
```

## 체크리스트

프로덕션 배포 전 확인:

- [ ] Supabase Site URL 설정 확인
- [ ] Supabase Redirect URLs 추가
- [ ] `.env.local`에 올바른 `NEXT_PUBLIC_APP_URL` 설정
- [ ] 코드에서 `emailRedirectTo` 설정 확인
- [ ] 이메일 템플릿에서 `{{ .ConfirmationURL }}` 사용 확인
- [ ] 미들웨어에서 `/auth/callback` 우회 확인
- [ ] 서버 로그에서 스캐너 호출 확인
- [ ] link-expired 페이지 UX 확인

## 추가 참고 자료

- [Supabase Docs - Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Docs - Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

**마지막 업데이트:** 2025-10-16
