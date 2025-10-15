# 🚀 Acadesk MVP 빠른 시작 가이드

## 1️⃣ 데이터베이스 마이그레이션 (1회만)

```bash
# Supabase CLI 사용
supabase db push
```

또는 **Supabase Dashboard → SQL Editor**에서:
- `supabase/migrations/20250115000001_mvp_launch.sql` 내용 복사
- SQL Editor에 붙여넣고 **Run** 실행

---

## 2️⃣ 원장님 계정 생성

### Step 1: Auth 사용자 생성
**Supabase Dashboard → Authentication → Users → Add user**
- 이메일: `owner@myacademy.com`
- 비밀번호: 원하는 비밀번호
- ✅ **Auto Confirm User** 체크
- **UUID 복사** 📋

### Step 2: 초기 설정 SQL 실행
1. `supabase/migrations/20250115000002_create_first_owner.sql` 열기
2. 다음 값 수정:
   ```sql
   v_owner_id := '복사한-UUID';              -- ⚠️
   v_tenant_name := '우리학원';               -- ⚠️
   v_tenant_slug := 'my-academy';           -- ⚠️
   v_owner_name := '홍길동';                 -- ⚠️
   v_owner_email := 'owner@myacademy.com';  -- ⚠️
   ```
3. SQL Editor에서 실행
4. ✅ 성공 메시지 확인

---

## 3️⃣ 환경 변수

`.env.local` 파일 생성:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Supabase Dashboard → Settings → API**에서 복사

---

## 4️⃣ 실행

```bash
pnpm install   # 의존성 설치
pnpm dev       # 개발 서버
```

**http://localhost:3000** 접속 → 로그인

---

## 5️⃣ 확인사항

- [x] 로그인 성공
- [x] `/dashboard` - 대시보드 표시
- [x] `/students` - 학생 목록 표시
- [x] `/todos` - TODO 목록 표시
- [x] 메뉴에 **대시보드, 학생 관리, TODO 관리**만 표시됨

---

## 🆘 문제 해결

### "tenant_id가 없습니다" 오류
```sql
-- public.users 확인
SELECT id, tenant_id, role_code FROM public.users WHERE id = 'Auth-UUID';

-- tenant_id가 null이면 Step 2 다시 실행
```

### 대시보드가 빈 화면
```sql
-- role_code 확인
SELECT role_code FROM public.users WHERE id = 'Auth-UUID';

-- owner가 아니면 수정
UPDATE public.users SET role_code = 'owner' WHERE id = 'Auth-UUID';
```

---

## 📚 상세 문서

전체 가이드: [`docs/MVP_LAUNCH_GUIDE.md`](./docs/MVP_LAUNCH_GUIDE.md)
