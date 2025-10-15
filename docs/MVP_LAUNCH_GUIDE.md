# MVP 1차 출시 가이드

## 개요

이 문서는 Acadesk Web의 1차 출시를 위한 데이터베이스 초기화 및 설정 가이드입니다.

**1차 출시 포함 기능:**
- ✅ 대시보드
- ✅ 학생 관리
- ✅ TODO 관리

**피처플래그로 비활성화된 기능:**
- ❌ 출석 관리
- ❌ 성적 관리
- ❌ 수업 관리
- ❌ 보호자 관리
- ❌ 상담 관리
- ❌ 도서관 관리
- ❌ 리포트
- ❌ 알림 시스템
- ❌ 직원 관리
- ❌ 학원비 관리
- ❌ 캘린더
- ❌ 과목 관리

---

## 1. 데이터베이스 초기화

### 1-1. Supabase 대시보드에서 초기화

1. Supabase 프로젝트 대시보드 접속
2. **Database** → **Migrations** 섹션으로 이동
3. 기존 마이그레이션이 있다면 모두 삭제 (또는 새 프로젝트로 시작)

### 1-2. 마이그레이션 적용

새로운 MVP 마이그레이션 파일을 적용합니다:

```bash
# Supabase CLI 사용 시
supabase db push
```

또는 Supabase 대시보드의 SQL Editor에서:

1. **SQL Editor** 탭 열기
2. `supabase/migrations/20250115000001_mvp_launch.sql` 파일 내용 복사
3. SQL Editor에 붙여넣기
4. **Run** 버튼 클릭

---

## 2. 초기 데이터 설정 (원장님 계정)

### 방법 1: 자동화 SQL 스크립트 (추천 ⭐)

**단계:**

1. **Supabase Auth에서 사용자 생성**
   - Supabase 대시보드 → **Authentication** → **Users**
   - **Add user** 클릭
   - 이메일/비밀번호 입력 (예: `owner@myacademy.com`)
   - **Auto Confirm User** 체크 ✅
   - 생성 후 **사용자 UUID 복사** 📋

2. **초기 설정 SQL 실행**
   - `supabase/migrations/20250115000002_create_first_owner.sql` 파일 열기
   - 다음 변수들을 수정:
     ```sql
     v_owner_id uuid := '복사한-UUID-붙여넣기';
     v_tenant_name text := '우리학원';
     v_tenant_slug text := 'my-academy';
     v_owner_name text := '홍길동';
     v_owner_email text := 'owner@myacademy.com';
     ```
   - Supabase SQL Editor에서 실행
   - ✅ 성공 메시지 확인

**자동으로 처리되는 것:**
- ✅ 학원(테넌트) 생성
- ✅ `public.users`에 tenant_id, role_code 설정
- ✅ 온보딩 완료 처리

---

### 방법 2: 수동 SQL (고급 사용자용)

<details>
<summary>펼쳐서 보기</summary>

#### A. Supabase Auth에서 사용자 생성

1. Supabase 대시보드 → **Authentication** → **Users**
2. **Add user** 버튼 클릭
3. 이메일과 비밀번호 입력 (예: `owner@example.com`)
4. **Auto Confirm User** 체크
5. 생성된 사용자의 **UUID 복사** (예: `11111111-2222-3333-4444-555555555555`)

#### B. 테넌트 생성 + 사용자 연결

```sql
-- Step 1: 테넛트 생성
INSERT INTO public.tenants (name, slug, timezone)
VALUES ('우리학원', 'my-academy', 'Asia/Seoul')
RETURNING id;  -- 이 ID를 복사

-- Step 2: public.users 업데이트 (자동 생성된 레코드)
UPDATE public.users
SET
  tenant_id = '위에서-복사한-테넌트-ID',
  name = '홍길동',
  email = 'owner@example.com',
  role_code = 'owner',
  onboarding_completed = true,
  onboarding_completed_at = now()
WHERE id = '복사한-Auth-UUID';
```

**참고:** `auth.users` 생성 시 트리거로 `public.users`에 빈 레코드가 자동 생성됩니다.

</details>

---

## 3. 환경 변수 설정

프로젝트 루트의 `.env.local` 파일을 확인하고 다음 환경 변수가 설정되어 있는지 확인합니다:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Default Tenant ID (개발용)
NEXT_PUBLIC_DEFAULT_TENANT_ID=a0000000-0000-0000-0000-000000000001
```

**Supabase URL과 Anon Key 확인:**
- Supabase 대시보드 → **Settings** → **API**
- **Project URL**과 **anon/public** 키를 복사

---

## 4. 애플리케이션 실행

### 4-1. 개발 서버 시작

```bash
pnpm install  # 의존성 설치
pnpm dev      # 개발 서버 실행
```

### 4-2. 로그인 테스트

1. 브라우저에서 `http://localhost:3000` 접속
2. 로그인 페이지로 이동
3. 위에서 생성한 관리자 계정으로 로그인
   - 이메일: `admin@example.com`
   - 비밀번호: 설정한 비밀번호

### 4-3. 기능 확인

로그인 후 다음 페이지들이 정상적으로 표시되는지 확인:

- ✅ `/dashboard` - 대시보드
- ✅ `/students` - 학생 목록
- ✅ `/students/new` - 학생 등록
- ✅ `/todos` - TODO 목록
- ✅ `/todos/new` - TODO 생성

**비활성화된 페이지 (메뉴에 표시되지 않아야 함):**
- ❌ `/attendance` - 출석 관리
- ❌ `/grades` - 성적 입력
- ❌ `/classes` - 수업 관리
- ❌ `/guardians` - 보호자 관리
- ❌ `/calendar` - 학원 캘린더
- ❌ 기타 모든 비활성화 기능

---

## 5. 학생 데이터 샘플 생성 (선택사항)

테스트를 위해 샘플 학생 데이터를 생성할 수 있습니다:

```sql
-- 샘플 학생 5명 생성
INSERT INTO public.students (tenant_id, student_code, name, grade, school, enrollment_date, gender)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'S2501001', '김철수', '중1', '서울중학교', '2025-01-15', 'male'),
  ('a0000000-0000-0000-0000-000000000001', 'S2501002', '이영희', '중2', '서울중학교', '2025-01-15', 'female'),
  ('a0000000-0000-0000-0000-000000000001', 'S2501003', '박민수', '초6', '서울초등학교', '2025-01-15', 'male'),
  ('a0000000-0000-0000-0000-000000000001', 'S2501004', '최수진', '고1', '서울고등학교', '2025-01-15', 'female'),
  ('a0000000-0000-0000-0000-000000000001', 'S2501005', '정대현', '중3', '강남중학교', '2025-01-15', 'male');
```

---

## 6. TODO 샘플 생성 (선택사항)

학생별로 샘플 TODO를 생성할 수 있습니다:

```sql
-- 김철수(S2501001)의 TODO 생성
INSERT INTO public.student_todos (tenant_id, student_id, title, subject, due_date, priority)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  id,
  '수학 문제집 5단원 풀기',
  '수학',
  CURRENT_DATE + 1,
  'high'
FROM public.students
WHERE student_code = 'S2501001';

-- 이영희(S2501002)의 TODO 생성
INSERT INTO public.student_todos (tenant_id, student_id, title, subject, due_date, priority)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  id,
  '영어 단어 100개 암기',
  '영어',
  CURRENT_DATE + 2,
  'normal'
FROM public.students
WHERE student_code = 'S2501002';
```

---

## 7. RLS 정책 확인

RLS가 제대로 동작하는지 확인:

### 7-1. 학생 조회 테스트

```sql
-- 관리자로 로그인한 상태에서 학생 조회 (성공해야 함)
SELECT * FROM public.students;
```

### 7-2. TODO 조회 테스트

```sql
-- 관리자로 로그인한 상태에서 TODO 조회 (성공해야 함)
SELECT * FROM public.student_todos;
```

### 7-3. 다른 테넌트 접근 테스트 (차단되어야 함)

다른 테넌트의 데이터는 조회되지 않아야 합니다. RLS 정책이 제대로 동작하면 빈 결과가 반환됩니다.

---

## 8. 피처 플래그 확인

`src/lib/features.config.ts` 파일에서 다음 설정이 올바른지 확인:

```typescript
export const FEATURES = {
  // 1차 출시 - active
  dashboard: 'active',
  studentManagement: 'active',
  todoManagement: 'active',

  // 비활성화 - inactive
  signup: 'inactive',
  attendanceManagement: 'inactive',
  gradesManagement: 'inactive',
  classManagement: 'inactive',
  guardianManagement: 'inactive',
  consultationManagement: 'inactive',
  libraryManagement: 'inactive',
  reportManagement: 'inactive',
  notificationSystem: 'inactive',
  staffManagement: 'inactive',
  tuitionManagement: 'inactive',
  parentApp: 'inactive',
  calendarIntegration: 'inactive',
  kioskMode: 'inactive',
  subjectManagement: 'inactive',
  aiAnalytics: 'inactive',
  automationWorkflow: 'inactive',
} as const
```

---

## 9. 빌드 및 배포

### 9-1. 프로덕션 빌드 테스트

```bash
pnpm build
```

빌드 오류가 없는지 확인합니다.

### 9-2. 타입 체크

```bash
pnpm type-check
```

TypeScript 타입 오류가 없는지 확인합니다.

### 9-3. 린트

```bash
pnpm lint
```

코드 스타일 오류가 없는지 확인합니다.

---

## 10. 체크리스트

출시 전 다음 항목들을 확인하세요:

- [ ] 데이터베이스 마이그레이션 적용 완료
- [ ] 테넌트(학원) 생성 완료
- [ ] 관리자 계정 생성 및 연결 완료
- [ ] 환경 변수 설정 완료
- [ ] 로그인 테스트 성공
- [ ] 대시보드 정상 표시
- [ ] 학생 관리 기능 동작 확인
- [ ] TODO 관리 기능 동작 확인
- [ ] 비활성화된 기능이 메뉴에 표시되지 않음 확인
- [ ] RLS 정책 동작 확인
- [ ] 프로덕션 빌드 성공
- [ ] 타입 체크 통과
- [ ] 린트 통과

---

## 11. 문제 해결

### Q1. "tenant_id가 없습니다" 오류가 발생합니다

**원인:** `public.users` 테이블에 사용자 레코드가 없거나 `tenant_id`가 null입니다.

**해결:**
1. Supabase 대시보드 → **Authentication** → **Users**에서 사용자 UUID 확인
2. `public.users` 테이블에 해당 UUID로 레코드가 있는지 확인
3. 없으면 **2-2. 관리자 계정 생성** 섹션의 SQL 재실행

### Q2. 로그인은 되는데 대시보드가 빈 화면입니다

**원인:** RLS 정책이 제대로 적용되지 않았거나, 사용자의 `role_code`가 설정되지 않았습니다.

**해결:**
1. SQL Editor에서 현재 사용자 정보 확인:
   ```sql
   SELECT * FROM public.users WHERE id = auth.uid();
   ```
2. `role_code`가 `owner`, `teacher`, 또는 `ta`인지 확인
3. 없으면 업데이트:
   ```sql
   UPDATE public.users
   SET role_code = 'owner'
   WHERE id = auth.uid();
   ```

### Q3. 학생 등록이 안 됩니다

**원인:** RLS 정책에서 `is_staff()` 함수가 false를 반환합니다.

**해결:**
1. 현재 사용자의 역할 확인:
   ```sql
   SELECT role_code, public.is_staff() FROM public.users WHERE id = auth.uid();
   ```
2. `is_staff()`가 `false`이면 역할을 `owner`로 변경:
   ```sql
   UPDATE public.users
   SET role_code = 'owner'
   WHERE id = auth.uid();
   ```

### Q4. TODO 생성이 안 됩니다

**원인:** TODO는 `owner` 또는 `teacher`만 생성할 수 있습니다.

**해결:**
1. 현재 사용자의 역할 확인:
   ```sql
   SELECT role_code FROM public.users WHERE id = auth.uid();
   ```
2. `ta`이면 `teacher` 또는 `owner`로 변경:
   ```sql
   UPDATE public.users
   SET role_code = 'owner'
   WHERE id = auth.uid();
   ```

---

## 12. 다음 단계

1차 출시가 안정화되면 다음 기능들을 단계적으로 활성화할 수 있습니다:

1. **2차 출시 후보:**
   - 출석 관리 (`attendanceManagement`)
   - 보호자 관리 (`guardianManagement`)
   - 수업 관리 (`classManagement`)

2. **3차 출시 후보:**
   - 성적 관리 (`gradesManagement`)
   - 리포트 (`reportManagement`)
   - 상담 관리 (`consultationManagement`)

각 기능을 활성화하려면:
1. `src/lib/features.config.ts`에서 해당 기능을 `'active'`로 변경
2. 필요한 마이그레이션 파일 적용 (기존 `supabase/migrations/` 파일 참조)
3. 해당 페이지 테스트

---

## 지원

문제가 발생하면 다음을 확인하세요:
- Supabase 로그: **Logs** → **Postgres Logs**
- 브라우저 개발자 도구 콘솔
- Next.js 개발 서버 로그

추가 도움이 필요하면 개발팀에 문의하세요.
