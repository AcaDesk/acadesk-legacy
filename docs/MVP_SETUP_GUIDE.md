# MVP 1차 출시 설정 가이드 (트리거 없음)

## 개요
트리거를 사용하지 않고 명시적인 RPC 함수 호출로 구현된 MVP 시스템입니다.

## 주요 기능
- ✅ 학생 관리
- ✅ TODO 관리
- ✅ 대시보드
- ✅ 키오스크 모드 (PIN 인증)
- ✅ 회원가입 승인 프로세스

## 데이터베이스 설정

### 1. 기존 마이그레이션 제거 (필요한 경우)
```bash
# 로컬 데이터베이스 초기화
supabase db reset --local

# 또는 기존 마이그레이션 파일들 삭제
rm supabase/migrations/01_*.sql
rm supabase/migrations/02_*.sql
rm supabase/migrations/03_*.sql
rm supabase/migrations/04_*.sql
rm supabase/migrations/05_*.sql
rm supabase/migrations/06_*.sql
rm supabase/migrations/07_*.sql
rm supabase/migrations/20250115000001_mvp_launch.sql
```

### 2. 새 마이그레이션 적용
```bash
# 로컬 데이터베이스에 적용
supabase migration up --local

# 원격 데이터베이스에 적용
supabase db push
```

### 3. 첫 Owner 계정 생성

#### 방법 1: Supabase Dashboard에서 직접 실행
1. Supabase Dashboard > SQL Editor 접속
2. 다음 쿼리 실행:

```sql
-- 1단계: 먼저 일반적으로 회원가입 (Auth > Users에서 확인)

-- 2단계: Owner 권한 부여 및 학원 생성
select public.create_first_owner(
  'admin@myschool.com',  -- 가입한 이메일
  '김원장',               -- 이름
  '우리학원',             -- 학원명
  'myschool'             -- 학원 슬러그 (URL용)
);
```

#### 방법 2: 프로그래밍 방식
```typescript
// 첫 Owner 생성 스크립트
const { data, error } = await supabase
  .rpc('create_first_owner', {
    p_email: 'admin@myschool.com',
    p_name: '김원장',
    p_tenant_name: '우리학원',
    p_tenant_slug: 'myschool'
  })

if (data?.success) {
  console.log('Owner 계정 생성 완료:', data)
} else {
  console.error('Owner 생성 실패:', data?.error || error)
}
```

## 주요 변경사항 (트리거 제거)

### 1. 회원가입 프로세스
**이전 (트리거)**:
- auth.users INSERT → 자동으로 public.users 생성

**현재 (명시적 호출)**:
- auth.signUp() 성공 후
- `create_user_profile()` RPC 함수 호출
- pending 상태로 생성

### 2. 승인 상태 확인
```typescript
// RPC 함수 사용
const { data: result } = await supabase.rpc('check_approval_status')

if (result?.status === 'approved') {
  // 승인됨
} else if (result?.status === 'pending') {
  // 대기 중
} else if (result?.status === 'rejected') {
  // 거부됨 (result.reason에 사유)
}
```

### 3. 키오스크 모드
```typescript
// 학생 TODO 조회 (RLS 우회)
const { data: todos } = await supabase
  .rpc('get_student_todos_for_kiosk', {
    p_student_id: studentId,
    p_date: new Date().toISOString().split('T')[0]
  })
```

## RLS 정책

### Users 테이블
- `users_select_self`: 자신의 프로필 조회
- `users_select_tenant`: 같은 테넌트 승인된 사용자 조회
- `users_select_pending_owner`: Owner는 대기 중 사용자 조회
- `users_update_self`: 자신의 프로필 수정
- `users_update_owner`: Owner는 같은 테넌트 사용자 수정
- `users_insert_signup`: 회원가입 시 자신의 레코드 생성

### Students 테이블
- `students_select_tenant`: 같은 테넌트 학생 조회
- `students_insert_staff`: Owner/Instructor 생성 가능
- `students_update_staff`: Owner/Instructor 수정 가능
- `students_delete_owner`: Owner만 삭제 가능

### Student TODOs 테이블
- `todos_select_tenant`: 같은 테넌트 TODO 조회
- `todos_insert_staff`: Owner/Instructor 생성 가능
- `todos_update_staff`: Owner/Instructor 수정 가능
- `todos_delete_staff`: Owner/Instructor 삭제 가능

## 테스트 시나리오

### 1. 회원가입 및 승인
```bash
# 1. 일반 사용자로 회원가입
# 2. pending_approval 페이지로 리다이렉트 확인
# 3. Owner 계정으로 /admin/approvals 접속
# 4. 승인 처리
# 5. 일반 사용자가 온보딩 페이지로 이동 확인
```

### 2. 키오스크 모드
```bash
# 1. 학생 등록 시 4자리 PIN 설정
# 2. /kiosk/login에서 학생코드 + PIN 입력
# 3. 오늘의 TODO 목록 표시 확인
# 4. TODO 완료 체크 기능 확인
```

### 3. 학생 관리
```bash
# 1. /students/new에서 학생 추가
# 2. PIN 필드 입력 (선택)
# 3. 학생 목록에서 확인
# 4. 수정/삭제 권한 확인
```

## 문제 해결

### 회원가입이 안 될 때
1. `create_user_profile()` RPC 함수가 있는지 확인
2. anon 권한으로 실행 가능한지 확인
3. auth.users와 public.users ID 매칭 확인

### 승인 상태가 업데이트 안 될 때
1. `check_approval_status()` RPC 함수 확인
2. RLS 정책 확인 (Owner 권한)
3. approval_status 필드 값 확인

### 키오스크 로그인 실패
1. student_code 대소문자 확인 (대문자 변환)
2. kiosk_pin bcrypt 해시 확인
3. deleted_at null 조건 확인

## 운영 참고사항

1. **첫 Owner는 반드시 수동 생성**
   - 일반 회원가입 후 SQL로 권한 부여

2. **PIN 보안**
   - bcrypt로 해시 (saltRounds: 10)
   - 평문 PIN 하위 호환성 유지

3. **승인 프로세스**
   - 기본 pending 상태
   - Owner만 승인/거부 가능
   - 30초 자동 폴링

4. **테넌트 격리**
   - 모든 쿼리에 tenant_id 조건
   - RLS로 자동 적용