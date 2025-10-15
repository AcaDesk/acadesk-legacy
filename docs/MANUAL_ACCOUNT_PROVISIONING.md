# 수동 계정 발급 가이드 (1차 MVP 출시용)

이 문서는 1차 MVP 출시 시 운영자가 Supabase 대시보드에서 직접 원장(Owner) 계정을 생성하는 방법을 설명합니다.

## 목차

- [개요](#개요)
- [사전 준비](#사전-준비)
- [계정 발급 절차](#계정-발급-절차)
- [문제 해결](#문제-해결)
- [향후 계획](#향후-계획)

---

## 개요

**왜 수동 발급인가?**

1차 MVP 출시에서는 온보딩/초대 플로우를 우회하고 빠르게 서비스를 제공하기 위해 운영자가 직접 계정을 생성합니다.

**이 방식의 장점:**
- ✅ 즉시 런칭 가능
- ✅ 온보딩/RLS 복잡도 제거
- ✅ 운영자가 계정 생성 흐름 통제

**주의사항:**
- 회원가입을 비활성화하여 무단 가입 방지
- 생성된 계정은 즉시 사용 가능 (onboarding_completed=true, approval_status='approved')
- 비밀번호 재설정 링크를 반드시 원장님께 전달

---

## 사전 준비

### 1. Supabase Auth 설정 변경

**회원가입 비활성화:**

1. Supabase Dashboard → Authentication → Settings
2. "Auth Providers" 섹션에서:
   - **Email** 프로바이더의 "Enable sign ups" 옵션 **OFF**
3. 필요시 소셜 로그인(OAuth)도 OFF

**비밀번호 재설정 URL 확인:**

1. Supabase Dashboard → Authentication → URL Configuration
2. "Site URL": 프로덕션 도메인 확인 (예: `https://acadesk.app`)
3. "Redirect URLs": 비밀번호 재설정 후 이동할 경로 추가
   - `https://acadesk.app/auth/callback`
   - `https://acadesk.app/auth/reset-password`

### 2. 데이터베이스 마이그레이션 확인

다음 마이그레이션이 모두 적용되었는지 확인:

```bash
supabase db push
```

필수 마이그레이션:
- `02_Schema.sql` - 기본 테이블 구조
- `03_Helpers.sql` - Helper 함수
- `05_RLS.sql` - RLS 정책
- `06_RPC.sql` - RPC 함수

---

## 계정 발급 절차

### Step 1: Supabase에서 사용자 생성

#### 방법 A: Dashboard UI 사용 (권장)

1. **Supabase Dashboard → Authentication → Users**
2. **"Invite user" 버튼 클릭**
3. 정보 입력:
   - **Email**: 원장님 이메일 (예: `director@example.com`)
   - **Send invitation email**: ✅ 체크 (비밀번호 설정 링크 자동 전송)
4. **"Invite user" 클릭**

생성된 사용자의 UUID를 복사해두세요 (다음 단계에서 사용).

#### 방법 B: SQL Editor 사용

```sql
-- auth.users 테이블에 사용자 생성
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), -- 이 UUID를 기록해두세요!
  'authenticated',
  'authenticated',
  'director@example.com', -- 원장님 이메일
  crypt('temp_password_' || gen_random_uuid()::text, gen_salt('bf')),
  now(), -- 이메일 확인 자동 완료
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', '홍길동 원장님'),
  now(),
  now()
)
RETURNING id;
```

**주의:** 이 방법은 비밀번호를 임시로 설정하므로, 반드시 비밀번호 재설정 링크를 전송해야 합니다.

### Step 2: Tenant 생성 및 Users 프로필 설정

생성된 사용자 UUID를 사용하여 SQL Editor에서 실행:

```sql
-- 1) Tenant 생성
INSERT INTO public.tenants (
  name,
  academy_code,
  owner_id,
  active
)
VALUES (
  '행복한 학원',               -- 학원 이름
  'ACD' || lpad(floor(random() * 99999999)::text, 8, '0'), -- 자동 생성된 코드
  '여기에_사용자_UUID_입력',    -- Step 1에서 복사한 UUID
  true
)
RETURNING id, name, academy_code;
-- tenant_id를 기록해두세요!
```

```sql
-- 2) Users 프로필 생성 (위에서 받은 tenant_id 사용)
INSERT INTO public.users (
  id,
  tenant_id,
  email,
  name,
  role_code,
  onboarding_completed,
  approval_status,
  approved_at
)
VALUES (
  '여기에_사용자_UUID_입력',    -- Step 1의 UUID
  '여기에_tenant_UUID_입력',   -- 방금 생성한 tenant_id
  'director@example.com',     -- 이메일
  '홍길동',                   -- 이름
  'owner',                    -- 역할: owner
  true,                       -- 온보딩 완료
  'approved',                 -- 승인 상태
  now()                       -- 승인 시간
)
ON CONFLICT (id) DO UPDATE
  SET tenant_id = EXCLUDED.tenant_id,
      name = EXCLUDED.name,
      role_code = 'owner',
      onboarding_completed = true,
      approval_status = 'approved',
      approved_at = now(),
      updated_at = now();
```

### Step 3: 비밀번호 재설정 링크 전송

#### 방법 A: Supabase Dashboard 사용 (권장)

1. **Authentication → Users**
2. 생성한 사용자 클릭
3. **"Send password reset email" 클릭**
4. 원장님께 이메일 확인 요청

#### 방법 B: API 사용 (선택사항)

```bash
curl -X POST 'https://your-project.supabase.co/auth/v1/recover' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "director@example.com"
  }'
```

### Step 4: 계정 정보 전달

원장님께 다음 정보를 전달:

```
✅ Acadesk 계정이 생성되었습니다!

📧 이메일: director@example.com
🏫 학원명: 행복한 학원
🔐 비밀번호 설정: 이메일로 전송된 링크를 클릭하여 비밀번호를 설정해주세요.

🌐 로그인 URL: https://acadesk.app/auth/login

문의사항이 있으시면 언제든 연락주세요!
```

---

## 문제 해결

### 1. "User has no tenant_id" 배너가 표시되는 경우

**원인:** `public.users` 테이블에 `tenant_id`가 null인 상태

**해결:**

```sql
-- tenant_id 확인
SELECT id, email, tenant_id, onboarding_completed, approval_status
FROM public.users
WHERE email = 'director@example.com';

-- tenant_id가 null이면 Step 2를 다시 실행하여 tenant 생성 후 업데이트
UPDATE public.users
SET tenant_id = '여기에_tenant_UUID_입력',
    onboarding_completed = true,
    approval_status = 'approved',
    approved_at = now()
WHERE id = '여기에_사용자_UUID_입력';
```

### 2. 로그인 후 온보딩 페이지로 리디렉션되는 경우

**원인:** `onboarding_completed = false`

**해결:**

```sql
UPDATE public.users
SET onboarding_completed = true,
    approval_status = 'approved',
    approved_at = now()
WHERE email = 'director@example.com';
```

### 3. 비밀번호 재설정 링크가 작동하지 않는 경우

**원인:** Site URL 또는 Redirect URL 설정 오류

**해결:**
1. Supabase Dashboard → Authentication → URL Configuration
2. Site URL이 프로덕션 도메인과 일치하는지 확인
3. Redirect URLs에 `/auth/callback` 경로가 포함되어 있는지 확인

### 4. RLS 정책으로 인한 권한 오류

**원인:** RLS 정책이 올바르게 적용되지 않음

**해결:**

```sql
-- RLS 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('users', 'tenants', 'students', 'classes');

-- 필요시 05_RLS.sql 마이그레이션 재실행
```

---

## 향후 계획

### 정식 온보딩 플로우 복원 (릴리즈 1~2주 후)

1. **회원가입 다시 활성화:**
   - Supabase Dashboard → Authentication → Settings
   - "Enable sign ups" 옵션 **ON**

2. **온보딩/초대 UI 복구:**
   - `/auth/onboarding` 페이지 활성화
   - 직원 초대 기능 활성화

3. **수동 발급 기능 유지:**
   - 긴급 상황 대비용으로 이 문서 보관
   - 백오피스 관리 페이지에서 사용 가능하도록 개선

### 자동화 개선 사항

- [ ] 운영자 전용 계정 관리 페이지 추가
- [ ] 원클릭 계정 생성 + 이메일 전송 자동화
- [ ] 계정 생성 로그 및 감사 추적 (audit log)

---

## 체크리스트

출시 전 확인사항:

- [ ] Supabase Auth에서 회원가입 비활성화 완료
- [ ] 모든 마이그레이션 적용 완료 (`supabase db push`)
- [ ] 원장 계정 생성 및 tenant 연결 완료
- [ ] 비밀번호 재설정 링크 전송 완료
- [ ] 원장님께 계정 정보 및 로그인 URL 전달 완료
- [ ] 대시보드 접근 테스트 완료 (tenant_id 확인)

---

**문서 작성일:** 2025-10-15
**작성자:** 개발팀
**버전:** 1.0
