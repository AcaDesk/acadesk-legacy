# 보안 수동 조치 가이드

> **작성일**: 2026-03-06
> **우선순위**: 높음 — 아래 항목들은 코드 변경만으로 해결할 수 없으며, 인프라/설정 레벨의 수동 조치가 필요합니다.

---

## 1. Supabase 서비스 역할 키 교체

### 왜 필요한가

`.env.local`에 저장된 `SUPABASE_SERVICE_ROLE_KEY`는 RLS(Row Level Security)를 완전히 우회하는 최고 권한 키입니다. 이 키가 git history에 한 번이라도 커밋된 적이 있다면, 저장소에 접근 가능한 모든 사람(과거 포함)이 데이터베이스 전체를 읽고 쓸 수 있습니다.

### 영향 범위

- 모든 테이블의 읽기/쓰기/삭제 가능
- RLS 정책 무시
- 테넌트 격리 우회 가능

### 조치 방법

#### 1단계: 키 노출 여부 확인

```bash
# git history에서 서비스 키가 커밋된 적 있는지 확인
git log --all -p -- '.env.local' | head -50
git log --all -p -- '.env' | head -50

# 다른 파일에 키가 하드코딩된 적 있는지 확인
git log --all -p -S 'SUPABASE_SERVICE_ROLE_KEY' --diff-filter=A
```

#### 2단계: Supabase 대시보드에서 키 교체

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 해당 프로젝트 선택
3. **Settings** → **API** 이동
4. **Service role key** 섹션에서 **Generate new key** 클릭
5. 새 키를 안전한 곳에 복사 (1Password, Doppler 등)

#### 3단계: 환경별 키 업데이트

```bash
# 로컬 개발 환경
# .env.local 파일을 직접 수정 (절대 git에 커밋하지 않음)
SUPABASE_SERVICE_ROLE_KEY=새로운_키_값

# Vercel (프로덕션/스테이징)
# Vercel Dashboard → Settings → Environment Variables에서 업데이트
# 또는 CLI로:
vercel env rm SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# 프롬프트에서 새 키 값 입력
```

#### 4단계: git history에서 키 제거 (노출된 경우)

```bash
# BFG Repo-Cleaner 사용 (권장)
brew install bfg

# 1. 현재 키 값을 파일에 저장
echo "이전_키_값" > /tmp/passwords.txt

# 2. BFG로 히스토리에서 제거
bfg --replace-text /tmp/passwords.txt

# 3. 정리
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4. force push (⚠️ 팀원에게 사전 공지 필수)
git push --force

# 5. 임시 파일 삭제
rm /tmp/passwords.txt
```

#### 5단계: .gitignore 확인

```bash
# .gitignore에 아래 항목이 있는지 확인
cat .gitignore | grep -E '\.env'
```

필수 항목:
```
.env
.env.local
.env.*.local
```

### 확인 완료 기준

- [ ] Supabase 대시보드에서 새 키 발급 완료
- [ ] 로컬 `.env.local` 업데이트 완료
- [ ] Vercel 환경 변수 업데이트 완료
- [ ] git history에서 이전 키 제거 완료 (해당 시)
- [ ] 키 교체 후 애플리케이션 정상 작동 확인

---

## 2. Rate Limiting 미들웨어 추가

### 왜 필요한가

현재 애플리케이션에는 요청 속도 제한이 없습니다. 이로 인해:

- **인증 브루트포스**: 로그인 시도를 무제한 반복하여 비밀번호 추측 가능
- **이메일 열거 공격**: 비밀번호 재설정을 반복하여 등록된 이메일 목록 추출 가능
- **리소스 고갈**: 대량 요청으로 데이터베이스/서버 과부하 유발 가능

Supabase Auth는 자체 Rate Limiting이 있지만(이메일 발송 60초 제한), 애플리케이션 레벨에서 추가 보호가 필요합니다.

### 영향 범위

- 로그인/회원가입/비밀번호 재설정 엔드포인트
- Server Action (데이터 생성/수정/삭제)
- API Route (`/api/*`)

### 조치 방법

#### 방법 A: Vercel Edge Middleware + KV 기반 (프로덕션 권장)

Vercel KV(Redis 호환)를 사용한 분산 Rate Limiting입니다.

**1. Vercel KV 설정**

```bash
# Vercel KV 스토어 생성
vercel kv create acadesk-rate-limit

# 환경 변수 자동 연결
vercel link
```

**2. 패키지 설치**

```bash
pnpm add @vercel/kv @upstash/ratelimit
```

**3. Rate Limiting 유틸리티 생성**

`src/lib/rate-limit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { kv } from '@vercel/kv'

// 인증 관련: 10회/분
export const authRateLimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'rl:auth',
})

// 일반 API: 60회/분
export const apiRateLimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  prefix: 'rl:api',
})

// 검색: 30회/분
export const searchRateLimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  prefix: 'rl:search',
})
```

**4. Middleware에 Rate Limiting 적용**

`src/middleware.ts`에 추가:
```typescript
import { authRateLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 인증 관련 경로에 rate limiting 적용
  if (request.nextUrl.pathname.startsWith('/auth') ||
      request.nextUrl.pathname.startsWith('/api/auth')) {

    const ip = request.headers.get('x-forwarded-for') ??
               request.headers.get('x-real-ip') ??
               '127.0.0.1'

    const { success, remaining } = await authRateLimit.limit(ip)

    if (!success) {
      return NextResponse.json(
        { error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' },
        {
          status: 429,
          headers: { 'Retry-After': '60' },
        }
      )
    }

    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    return response
  }

  return NextResponse.next()
}
```

#### 방법 B: In-Memory 기반 (개발/단일 서버)

외부 의존성 없이 메모리에서 처리하는 간단한 방법입니다. 서버 재시작 시 초기화되며, 다중 서버 환경에서는 동작하지 않습니다.

`src/lib/rate-limit-memory.ts`:
```typescript
const requests = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = requests.get(key)

  if (!entry || now > entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  entry.count++

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: maxRequests - entry.count }
}

// 메모리 누수 방지: 5분마다 만료된 항목 정리
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of requests) {
    if (now > entry.resetAt) requests.delete(key)
  }
}, 5 * 60_000)
```

### 적용 우선순위

| 순위 | 대상 | 제한 | 이유 |
|------|------|------|------|
| 1 | 로그인 (`signIn`) | 10회/분 | 브루트포스 방지 |
| 2 | 회원가입 (`signUp`) | 5회/분 | 스팸 계정 방지 |
| 3 | 비밀번호 재설정 (`resetPassword`) | 3회/분 | 이메일 열거 방지 |
| 4 | 매직링크 (`sendMagicLink`) | 3회/분 | 이메일 스팸 방지 |
| 5 | 검색 API | 30회/분 | DB 부하 방지 |

### 확인 완료 기준

- [ ] Rate Limiting 패키지 설치 완료
- [ ] 인증 관련 엔드포인트에 Rate Limiting 적용
- [ ] 429 응답 시 사용자 친화적 에러 메시지 표시
- [ ] 로컬 테스트 완료 (의도적으로 제한 초과 시 차단 확인)

---

## 3. GitHub Dependabot 활성화

### 왜 필요한가

npm/pnpm 패키지에는 알려진 보안 취약점(CVE)이 주기적으로 발견됩니다. Dependabot을 활성화하면:

- 취약한 의존성을 자동으로 감지하여 PR 생성
- 보안 패치가 나오면 즉시 알림
- 수동으로 `pnpm audit`을 실행할 필요 없음

### 현재 상태 확인

```bash
# 현재 알려진 취약점 확인
pnpm audit

# 또는 npm 호환 모드로
pnpm audit --json | jq '.advisories | length'
```

### 조치 방법

#### 1단계: Dependabot 설정 파일 생성

`.github/dependabot.yml` 파일을 생성합니다:

```yaml
# .github/dependabot.yml
version: 2
updates:
  # npm 패키지 업데이트
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "Asia/Seoul"
    # 보안 업데이트만 자동 PR 생성
    open-pull-requests-limit: 10
    # 개발 의존성은 그룹으로 묶어서 PR 생성
    groups:
      dev-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"
      production-dependencies:
        dependency-type: "production"
        update-types:
          - "patch"
    # 자동 라벨링
    labels:
      - "dependencies"
      - "security"
    # 커밋 메시지 형식
    commit-message:
      prefix: "chore(deps)"

  # GitHub Actions 업데이트
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "ci"
      - "dependencies"
```

#### 2단계: GitHub 저장소에서 활성화

1. GitHub 저장소 → **Settings** → **Code security and analysis**
2. **Dependabot alerts**: Enable
3. **Dependabot security updates**: Enable
4. **Dependabot version updates**: Enable (위에서 만든 설정 파일 사용)

#### 3단계: 보안 알림 설정

1. GitHub 저장소 → **Settings** → **Code security and analysis**
2. **Dependabot alerts** 섹션에서 알림 대상 설정
3. 필요 시 Slack 연동: GitHub App → Slack 에서 `/github subscribe owner/repo vulnerabilities` 실행

#### 4단계 (선택): CI에 보안 감사 추가

`.github/workflows/security-audit.yml`:

```yaml
name: Security Audit

on:
  push:
    branches: [main]
    paths:
      - 'package.json'
      - 'pnpm-lock.yaml'
  schedule:
    # 매주 월요일 오전 9시 (KST)
    - cron: '0 0 * * 1'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run security audit
        run: pnpm audit --audit-level=high
        continue-on-error: true

      - name: Check for known vulnerabilities
        run: |
          VULN_COUNT=$(pnpm audit --json 2>/dev/null | jq '.metadata.vulnerabilities.high + .metadata.vulnerabilities.critical' 2>/dev/null || echo "0")
          if [ "$VULN_COUNT" -gt "0" ]; then
            echo "::warning::Found $VULN_COUNT high/critical vulnerabilities"
          fi
```

### 확인 완료 기준

- [ ] `.github/dependabot.yml` 파일 생성 및 push
- [ ] GitHub 저장소 설정에서 Dependabot alerts 활성화
- [ ] Dependabot security updates 활성화
- [ ] 첫 번째 Dependabot PR 수신 확인
- [ ] (선택) CI security audit 워크플로 추가

---

## 전체 진행 체크리스트

| 항목 | 우선순위 | 예상 소요 | 상태 |
|------|----------|-----------|------|
| Supabase 서비스 키 교체 | 🔴 긴급 | 30분 | ⬜ |
| Rate Limiting 미들웨어 추가 | 🟠 높음 | 2-4시간 | ⬜ |
| Dependabot 활성화 | 🟡 보통 | 15분 | ⬜ |

---

## 관련 문서

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)
- [Upstash Rate Limiting](https://upstash.com/docs/oss/sdks/ts/ratelimit/overview)
- [GitHub Dependabot 문서](https://docs.github.com/en/code-security/dependabot)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
