# Acadesk Web - 설정 가이드

## 0단계: 환경 변수 설정 (필수!)

### 로컬 개발 환경

1. **환경 변수 파일 생성**
   ```bash
   # .env.example을 복사하여 .env.local 생성
   cp .env.example .env.local
   ```

2. **Supabase 프로젝트 정보 입력**
   - Supabase 대시보드 접속: https://supabase.com/dashboard
   - 프로젝트 선택
   - Settings > API 메뉴
   - 다음 정보를 복사하여 `.env.local`에 입력:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **`.env.local` 예시**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://mzftcusxsvwbzobmlwpm.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

⚠️ **중요**: `.env.local` 파일은 절대 git에 커밋하지 마세요!

### Supabase CLI 설정 (선택사항)

로컬에서 Supabase를 실행하려면:

1. **Supabase CLI 설치**
   ```bash
   npm install -g supabase
   ```

2. **로컬 Supabase 시작**
   ```bash
   supabase start
   ```

3. **로컬 환경 변수 업데이트**
   `supabase start` 명령 실행 후 출력되는 로컬 URL과 키로 `.env.local` 업데이트:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<로컬 anon key>
   ```

## 1단계: 데이터베이스 마이그레이션 적용 (필수!)

### Supabase 대시보드에서 적용

1. **Supabase 대시보드 접속**
   - https://supabase.com/dashboard
   - 프로젝트 선택 (mzftcusxsvwbzobmlwpm)

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 "SQL Editor" 클릭
   - "+ New query" 클릭

3. **마이그레이션 파일 실행 (순서대로!)**

   **① 첫 번째: Initial Schema**
   ```
   파일: supabase/migrations/20250101000001_initial_schema.sql
   내용 전체 복사 → SQL Editor에 붙여넣기 → Run 클릭
   ```

   **② 두 번째: RLS Policies**
   ```
   파일: supabase/migrations/20250101000002_rls_policies.sql
   내용 전체 복사 → SQL Editor에 붙여넣기 → Run 클릭
   ```

   **③ 세 번째: Sample Data (선택사항 - 테스트용)**
   ```
   파일: supabase/migrations/20250101000003_sample_data.sql
   내용 전체 복사 → SQL Editor에 붙여넣기 → Run 클릭
   ```

4. **확인**
   - SQL Editor에서 실행:
   ```sql
   SELECT COUNT(*) as table_count
   FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
   - 결과: 약 25개 테이블이 생성되어야 함

## 2단계: TypeScript 타입 생성

```bash
# Supabase CLI 설치 (없는 경우)
npm install -g supabase

# 타입 생성
npx supabase gen types typescript --project-id mzftcusxsvwbzobmlwpm > src/types/database.types.ts
```

## 3단계: 개발 서버 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작
pnpm dev
```

## 4단계: 첫 사용자 생성

### Supabase 대시보드에서:

1. Authentication > Users > "Invite User" 클릭
2. 이메일 입력: `admin@acadesk.demo`
3. 비밀번호 설정
4. 생성 후 해당 user의 UUID 복사

### SQL Editor에서 사용자 정보 연결:

```sql
-- 생성된 auth user의 UUID를 확인
SELECT id, email FROM auth.users;

-- users 테이블에 연결
INSERT INTO users (id, tenant_id, email, name, role_code, phone)
VALUES (
  'AUTH_USER_UUID_HERE', -- 위에서 복사한 UUID
  'a0000000-0000-0000-0000-000000000001', -- 샘플 tenant ID
  'admin@acadesk.demo',
  '김원장',
  'admin',
  '010-1234-5678'
);
```

## 개발 우선순위

### P0 (최우선 - 가장 시급)
- [ ] 성적 입력 UI (30/32 → 자동 계산)
- [ ] 월간 리포트 자동 생성 (그래프 포함)
- [ ] PDF 출력 및 발송

### P1 (중요)
- [ ] 학생 관리
- [ ] 출결 관리
- [ ] 학생 TODO 관리

### P2
- [ ] 교재 관리
- [ ] 원서 대여 관리
- [ ] 상담 관리

## 트러블슈팅

### 문제: 마이그레이션 실행 시 오류
- 오류 메시지 확인
- 이미 테이블이 존재하는 경우: 테이블 삭제 후 재실행
- Foreign key 오류: 순서대로 실행했는지 확인

### 문제: RLS로 데이터 접근 불가
- 임시 해결: 해당 테이블의 RLS 비활성화
```sql
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### 문제: Auth 연동 안됨
- `.env.local` 파일 확인
- Supabase URL과 Anon Key가 정확한지 확인

## 다음 단계

1. 데이터베이스 마이그레이션 완료 확인
2. 샘플 데이터로 테스트
3. 인증 시스템 구축
4. P0 기능부터 개발 시작
