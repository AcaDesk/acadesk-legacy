# Supabase 인증 설정 가이드

이 가이드는 Acadesk 프로젝트에서 개선된 회원가입 폼을 위한 Supabase 인증 설정 방법을 안내합니다.

## 목차
1. [이메일 인증 활성화](#1-이메일-인증-활성화)
2. [Google OAuth 설정](#2-google-oauth-설정)
3. [리디렉션 URL 설정](#3-리디렉션-url-설정)
4. [테스트](#4-테스트)

---

## 1. 이메일 인증 활성화

### 1.1 Supabase 대시보드 접속
1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택

### 1.2 이메일 설정 변경
1. 왼쪽 사이드바에서 **Authentication** → **Providers** 클릭
2. **Email** 프로바이더 찾기
3. 다음 설정 활성화:
   - ✅ **Enable Email provider**
   - ✅ **Confirm email** (이메일 인증 필수)

### 1.3 이메일 템플릿 커스터마이징 (선택사항)
1. **Authentication** → **Email Templates** 클릭
2. **Confirm signup** 템플릿 선택
3. 다음과 같이 한글로 수정:

```html
<h2>Acadesk 회원가입을 환영합니다!</h2>

<p>안녕하세요,</p>

<p>Acadesk에 가입해 주셔서 감사합니다. 아래 버튼을 클릭하여 이메일 주소를 인증해주세요.</p>

<p><a href="{{ .ConfirmationURL }}">이메일 인증하기</a></p>

<p>만약 버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요:</p>
<p>{{ .ConfirmationURL }}</p>

<p>본인이 가입하지 않으셨다면 이 이메일을 무시하셔도 됩니다.</p>

<p>감사합니다,<br>Acadesk 팀</p>
```

4. **Save** 클릭

---

## 2. Google OAuth 설정

### 2.1 Google Cloud Console에서 OAuth 클라이언트 생성

#### Step 1: Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 생성 또는 기존 프로젝트 선택

#### Step 2: OAuth 동의 화면 구성
1. 왼쪽 메뉴에서 **APIs & Services** → **OAuth consent screen** 클릭
2. User Type 선택:
   - **External** 선택 (일반 사용자 대상)
   - **CREATE** 클릭
3. 앱 정보 입력:
   - **App name**: `Acadesk`
   - **User support email**: 본인 이메일
   - **Developer contact information**: 본인 이메일
4. **SAVE AND CONTINUE** 클릭
5. Scopes 화면에서 **SAVE AND CONTINUE** 클릭
6. Test users 화면에서 **SAVE AND CONTINUE** 클릭

#### Step 3: OAuth 클라이언트 ID 생성
1. 왼쪽 메뉴에서 **APIs & Services** → **Credentials** 클릭
2. 상단의 **+ CREATE CREDENTIALS** → **OAuth client ID** 클릭
3. Application type: **Web application** 선택
4. Name: `Acadesk Web App`
5. **Authorized redirect URIs** 섹션에서 **+ ADD URI** 클릭 후 다음 URL 추가:

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

> **중요**: `<your-project-ref>`는 Supabase 프로젝트 URL의 일부입니다.
> 예: `https://abcdefghijklmnop.supabase.co`라면 `abcdefghijklmnop.supabase.co`

6. **CREATE** 클릭
7. 생성된 **Client ID**와 **Client Secret**을 복사하여 안전하게 보관

### 2.2 Supabase에 Google OAuth 설정

1. Supabase Dashboard → **Authentication** → **Providers** 클릭
2. **Google** 프로바이더 찾기
3. 다음 정보 입력:
   - ✅ **Enable Sign in with Google**
   - **Client ID (for OAuth)**: 위에서 복사한 Client ID
   - **Client Secret (for OAuth)**: 위에서 복사한 Client Secret
4. **Authorized Client IDs** (선택사항): 모바일 앱 연동 시 추가
5. **Save** 클릭

---

## 3. 리디렉션 URL 설정

### 3.1 Site URL 설정
1. Supabase Dashboard → **Authentication** → **URL Configuration** 클릭
2. **Site URL** 설정:
   - 개발 환경: `http://localhost:3000`
   - 프로덕션: `https://yourdomain.com`

### 3.2 Redirect URLs 추가
**Redirect URLs** 섹션에 다음 URL들을 추가:

#### 개발 환경
```
http://localhost:3000/auth/callback
http://localhost:3000/dashboard
http://localhost:3000/auth/verify-email
```

#### 프로덕션 환경
```
https://yourdomain.com/auth/callback
https://yourdomain.com/dashboard
https://yourdomain.com/auth/verify-email
```

### 3.3 추가 리디렉션 설정
Google OAuth 설정 시 다음도 추가:
```
http://localhost:3000/**
https://yourdomain.com/**
```

---

## 4. 테스트

### 4.1 이메일 회원가입 테스트
1. 개발 서버 실행: `pnpm dev`
2. 브라우저에서 `http://localhost:3000/auth/signup` 접속
3. 이메일과 비밀번호로 회원가입 시도
4. 이메일 인증 페이지로 리디렉션 확인
5. 이메일 수신함 확인 (또는 Supabase Dashboard → Authentication → Users에서 확인)
6. 이메일의 인증 링크 클릭
7. 대시보드 또는 온보딩 페이지로 리디렉션 확인

### 4.2 Google 로그인 테스트
1. 회원가입 페이지에서 **구글로 계속하기** 버튼 클릭
2. Google 계정 선택 화면 확인
3. 계정 선택 후 Acadesk 앱 권한 승인
4. `/auth/callback`을 거쳐 대시보드 또는 온보딩 페이지로 리디렉션 확인

### 4.3 비밀번호 강도 표시기 테스트
1. 회원가입 페이지에서 비밀번호 입력 시작
2. 실시간으로 강도 표시기 업데이트 확인:
   - 8자 미만: **약함** (빨강)
   - 8-11자, 영문+숫자: **보통** (노랑)
   - 12자 이상, 영문(대소문자)+숫자+특수문자: **강함** (초록)

### 4.4 이메일 재전송 테스트
1. 이메일 인증 페이지에서 **인증 이메일 다시 받기** 버튼 클릭
2. 토스트 메시지로 재전송 확인
3. 새 이메일 수신 확인

---

## 트러블슈팅

### 문제 1: Google 로그인 시 "redirect_uri_mismatch" 오류
**원인**: Google Cloud Console의 Authorized redirect URIs가 잘못 설정됨

**해결**:
1. Google Cloud Console → Credentials → OAuth 2.0 Client ID 수정
2. Authorized redirect URIs에 정확한 Supabase callback URL 추가:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

### 문제 2: 이메일 인증 링크 클릭 시 404 오류
**원인**: Supabase의 Redirect URL이 올바르게 설정되지 않음

**해결**:
1. Supabase Dashboard → Authentication → URL Configuration
2. Redirect URLs에 `/auth/callback` 추가
3. Site URL이 올바른지 확인

### 문제 3: 이메일이 스팸으로 분류됨
**원인**: Supabase 기본 이메일 발신자가 스팸으로 분류될 수 있음

**해결** (프로덕션 권장):
1. Supabase Dashboard → Project Settings → Auth
2. SMTP Settings에서 커스텀 SMTP 설정 (SendGrid, AWS SES 등)

### 문제 4: 로컬 개발 시 이메일이 발송되지 않음
**해결**:
- Supabase Dashboard → Authentication → Users에서 수동으로 사용자 이메일 확인 상태 변경 가능
- 또는 Supabase Local 사용 시 Inbucket (`http://localhost:54324`) 확인

---

## 환경 변수 확인

`.env.local` 파일에 다음 환경 변수가 올바르게 설정되어 있는지 확인:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## 추가 보안 설정 (선택사항)

### Rate Limiting
Supabase Dashboard → Authentication → Rate Limits에서:
- Email signups: 시간당 4회 제한 권장
- Email/Password login: 시간당 10회 제한 권장

### Password Requirements
Supabase Dashboard → Authentication → Policies에서:
- Minimum password length: 8자 이상
- Require special characters: 활성화 권장

---

## 참고 자료

- [Supabase Auth 공식 문서](https://supabase.com/docs/guides/auth)
- [Google OAuth 설정 가이드](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Email Templates 커스터마이징](https://supabase.com/docs/guides/auth/auth-email-templates)

---

## 완료 체크리스트

설정 완료 후 다음 항목을 체크하세요:

- [ ] 이메일 인증 활성화됨
- [ ] Google OAuth Client ID/Secret 설정됨
- [ ] Supabase에 Google 프로바이더 활성화됨
- [ ] Site URL 설정됨 (개발/프로덕션)
- [ ] Redirect URLs 추가됨 (`/auth/callback`, `/dashboard`, `/auth/verify-email`)
- [ ] Google Cloud Console에 Supabase callback URL 추가됨
- [ ] 이메일 회원가입 테스트 통과
- [ ] Google 로그인 테스트 통과
- [ ] 비밀번호 강도 표시기 작동 확인
- [ ] 이메일 인증 페이지 정상 작동 확인
- [ ] 이메일 재전송 기능 작동 확인

---

**작성일**: 2025-10-13
**버전**: 1.0.0
