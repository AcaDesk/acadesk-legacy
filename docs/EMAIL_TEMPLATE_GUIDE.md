# Supabase 이메일 템플릿 수정 가이드

이 가이드는 이메일 인증 시 새 창이 열리는 문제를 해결하기 위해 Supabase 이메일 템플릿을 수정하는 방법을 안내합니다.

## 문제 상황

현재 사용자가 이메일 인증 링크를 클릭하면:
1. ❌ 새 창/탭이 열림
2. ❌ 기존 창은 "이메일을 확인하세요" 메시지를 계속 표시
3. ❌ 사용자가 두 개의 창을 관리해야 함

## 개선 후

이메일 템플릿을 수정하면:
1. ✅ 기존 창에서 자동으로 인증 상태 감지 (3초마다 체크)
2. ✅ 인증 완료 시 기존 창이 자동으로 온보딩 페이지로 이동
3. ✅ 새 창이 열려도 사용자는 닫을 수 있으며, 기존 창에서 플로우 진행

## Supabase 대시보드에서 이메일 템플릿 수정하기

### 1. Supabase 대시보드 접속

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **Authentication** 클릭
4. **Email Templates** 탭 클릭

### 2. Confirm Signup 템플릿 수정

**"Confirm signup"** 템플릿을 찾아 수정합니다.

#### 수정 전 (기존 코드)

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}" target="_blank">Confirm your mail</a></p>
```

또는

```html
<p><a href="{{ .ConfirmationURL }}" target="_blank" rel="noopener noreferrer">Confirm your email</a></p>
```

#### 수정 후 (권장 코드)

```html
<h2>이메일 인증</h2>

<p>Acadesk에 가입해 주셔서 감사합니다!</p>
<p>아래 버튼을 클릭하여 이메일 주소를 인증해주세요:</p>

<p>
  <a href="{{ .ConfirmationURL }}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
    이메일 인증하기
  </a>
</p>

<p style="color: #64748b; font-size: 14px; margin-top: 20px;">
  또는 아래 링크를 복사하여 브라우저에 붙여넣으세요:<br/>
  <span style="color: #94a3b8; word-break: break-all;">{{ .ConfirmationURL }}</span>
</p>

<p style="color: #64748b; font-size: 12px; margin-top: 32px;">
  이 이메일을 요청하지 않으셨다면 무시하셔도 됩니다.
</p>
```

### 핵심 변경 사항

**중요**: `target="_blank"` 속성을 제거하세요!

- ❌ `<a href="{{ .ConfirmationURL }}" target="_blank">` (나쁜 예)
- ✅ `<a href="{{ .ConfirmationURL }}">` (좋은 예)

`target="_blank"`를 제거하면:
- 이메일 클라이언트에서 링크를 클릭할 때 현재 탭에서 열림
- 모바일에서도 더 자연스러운 경험 제공

### 3. 변경사항 저장

1. **Save** 버튼 클릭
2. 테스트용 이메일로 회원가입하여 확인

## 동작 방식

이제 사용자가 회원가입하면:

1. **기존 창**: `/auth/verify-email` 페이지에서 대기
   - 백그라운드에서 3초마다 인증 상태 자동 확인
   - 로딩 스피너와 "인증 확인 중..." 메시지 표시

2. **이메일 클릭**: 사용자가 이메일의 인증 링크 클릭
   - `target="_blank"` 제거 시: 현재 탭에서 열림 (권장)
   - 이메일 클라이언트 설정에 따라 새 탭이 열릴 수도 있음

3. **자동 리디렉션**:
   - 기존 창이 인증 완료를 감지
   - "이메일 인증 완료" 메시지 표시
   - 자동으로 온보딩 페이지로 이동
   - 온보딩 페이지에서도 인증 완료 메시지 표시

## 추가 팁

### 모든 인증 관련 템플릿 확인

다음 템플릿들도 동일하게 `target="_blank"` 제거를 권장합니다:

- **Confirm signup** (회원가입 인증)
- **Magic Link** (매직 링크 로그인)
- **Reset Password** (비밀번호 재설정)
- **Invite User** (사용자 초대)

### 테스트 방법

1. 테스트 이메일로 회원가입
2. 브라우저를 두 개 열기:
   - 창 A: `/auth/verify-email` 페이지
   - 창 B: 이메일 확인
3. 창 B에서 인증 링크 클릭
4. 창 A가 자동으로 온보딩 페이지로 이동하는지 확인

## 문제 해결

### Q: 여전히 새 창이 열려요
**A**: 다음을 확인하세요:
- 이메일 템플릿에서 `target="_blank"` 완전히 제거했는지
- 템플릿 저장 후 새로운 인증 이메일로 테스트했는지
- 브라우저 캐시 삭제

### Q: 자동 리디렉션이 안 돼요
**A**:
- 브라우저 콘솔에서 에러 확인
- 3초마다 인증 체크가 작동하는지 확인
- Supabase 세션이 정상적으로 설정되었는지 확인

### Q: 이메일 클라이언트가 자동으로 새 창을 열어요
**A**:
- Gmail, Outlook 등 일부 이메일 클라이언트는 설정에 관계없이 새 창을 열 수 있습니다
- 하지만 이제 기존 창이 자동으로 인증을 감지하므로 문제없습니다
- 사용자는 새 창을 닫고 기존 창에서 계속 진행할 수 있습니다

## 엣지 케이스(Edge Case) 처리

### 구현된 보안 처리

Acadesk는 다음과 같은 엣지 케이스를 자동으로 처리합니다:

#### 1. 만료된 링크 클릭 시

**상황**: 사용자가 1시간이 지난 인증 링크를 클릭

**처리**:
- `/auth/callback`에서 자동으로 에러 감지
- `/auth/link-expired` 페이지로 리디렉션
- 사용자에게 상황 설명 및 재전송 옵션 제공
- 이메일 입력 후 새로운 인증 링크 자동 발송

**사용자 경험**:
```
오래된 링크 클릭
  → "인증 링크가 만료되었습니다" 메시지
  → 이메일 입력
  → "인증 이메일 다시 받기" 버튼 클릭
  → 새 인증 이메일 수신
```

#### 2. 이미 사용된 링크 클릭 시

**상황**: 사용자가 이미 인증을 완료한 후 다시 같은 링크를 클릭

**처리**:
- "이미 사용된 링크입니다" 메시지 표시
- 로그인 페이지로 안내
- 추가 인증 불필요

**사용자 경험**:
```
사용된 링크 클릭
  → "이미 사용된 링크입니다. 로그인을 시도해주세요"
  → "로그인하기" 버튼
  → 로그인 페이지로 이동
```

#### 3. 미인증 이메일로 재가입 시도

**상황**: 사용자가 이메일 인증을 완료하지 않고 같은 이메일로 다시 회원가입 시도

**Supabase 처리**:
- 새 계정을 만들지 않음 (중복 방지)
- 기존 미인증 계정으로 새 인증 이메일 자동 발송
- 사용자는 자연스럽게 인증 프로세스 진행

**사용자 경험**:
```
재가입 시도
  → Supabase가 기존 계정 감지
  → 새 인증 이메일 발송
  → "이메일함을 확인해주세요" 페이지
  → 최신 인증 링크로 인증 완료
```

#### 4. 비밀번호 재설정 링크 여러 번 요청

**상황**: 사용자가 비밀번호 재설정을 여러 번 요청

**Supabase 처리**:
- 가장 최신 링크만 유효
- 이전 링크는 자동 무효화

**사용자 경험**:
```
여러 번 재설정 요청
  → 최신 이메일의 링크만 작동
  → 이전 링크 클릭 시: "링크가 만료되었습니다"
  → 최신 링크 클릭: 정상 처리
```

#### 5. 초대 링크 만료

**상황**: 학원 관리자가 보낸 초대 링크 만료

**처리**:
- "초대 링크가 만료되었습니다" 메시지
- 학원 관리자에게 새 초대 요청 안내
- 로그인 페이지로 이동 옵션 제공

### 에러 분류 시스템

`/auth/callback`에서 다음과 같이 에러를 자동 분류합니다:

| 에러 타입 | Supabase 메시지 | 표시되는 메시지 |
|----------|----------------|---------------|
| `expired` | "expired", "token expired" | "인증 링크가 만료되었습니다" |
| `used` | "already used", "consumed" | "이미 사용된 링크입니다" |
| `invalid` | "invalid", "not found" | "유효하지 않은 링크입니다" |
| `unknown` | 기타 에러 | "요청하신 링크가 유효하지 않습니다" |

### 보안 원칙

Acadesk의 인증 시스템은 다음 원칙을 따릅니다:

1. **일회용(One-time Use)**: 모든 인증 링크는 한 번만 사용 가능
2. **시간제한(Time-limited)**: 링크는 1시간 후 자동 만료
3. **최신 우선(Latest First)**: 새 링크 발급 시 이전 링크 자동 무효화
4. **사용자 친화적 에러**: 기술적 에러를 사용자가 이해하기 쉬운 메시지로 변환
5. **명확한 다음 행동**: 에러 발생 시 항상 다음 취할 행동을 제시

## 참고 자료

- [Supabase Email Templates 공식 문서](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Auth Error Handling](https://supabase.com/docs/guides/auth/server-side/error-handling)
- [HTML Email Best Practices](https://www.campaignmonitor.com/dev-resources/guides/coding/)

---

**마지막 업데이트**: 2025-10-15
**작성자**: Acadesk Team
