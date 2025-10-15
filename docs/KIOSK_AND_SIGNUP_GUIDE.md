# 키오스크 모드 + 회원가입 승인 프로세스 가이드

## 개요

이 문서는 다음 기능들의 사용법을 설명합니다:
1. **회원가입 승인 프로세스** (옵션 2: 관리자 승인 필요)
2. **키오스크 모드** (학생 PIN 인증 + TODO 관리)

---

## 1. 회원가입 승인 프로세스

### 흐름도

```
신규 사용자 회원가입
  ↓
이메일 인증
  ↓
온보딩 (역할 선택 + 학원명 입력)
  ↓
⏳ 승인 대기 페이지 (/auth/pending-approval)
  ↓
관리자가 승인 처리
  ↓
✅ 대시보드 접근 가능
```

### 1-1. 신규 사용자 관점

#### A. 회원가입

1. `/auth/signup` 접속
2. 이메일/비밀번호 입력 또는 소셜 로그인 (Google/Kakao)
3. 이메일 인증 (이메일로 받은 링크 클릭)

#### B. 온보딩

1. `/auth/onboarding` 자동 이동
2. 이름 입력
3. 역할 선택:
   - **Owner (원장님)**: 학원명 입력 필수
   - **Staff (강사)**: 초대 코드 입력 필수
4. 약관 동의
5. "시작하기" 버튼 클릭

#### C. 승인 대기

1. `/auth/pending-approval` 자동 이동
2. 30초마다 자동으로 승인 상태 체크
3. 승인 완료 시 자동으로 대시보드로 이동

### 1-2. 관리자 승인 방법

#### 방법 1: SQL로 직접 승인 (빠른 방법)

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- 승인 대기 중인 사용자 목록 조회
SELECT
  id,
  email,
  name,
  created_at,
  approval_status
FROM public.users
WHERE approval_status = 'pending'
ORDER BY created_at DESC;

-- 특정 사용자 승인
UPDATE public.users
SET
  approval_status = 'approved',
  approved_at = now(),
  approved_by = '관리자-UUID'  -- 현재 로그인한 관리자 ID
WHERE id = '승인할-사용자-UUID';
```

#### 방법 2: Server Action 사용 (프로그래밍 방식)

**승인:**
```typescript
import { approveUser } from '@/app/actions/approve-user'

const result = await approveUser(userId)
if (result.success) {
  // 승인 완료
} else {
  // 오류 처리
  console.error(result.error)
}
```

**거부:**
```typescript
import { rejectUser } from '@/app/actions/approve-user'

const result = await rejectUser(userId, '거부 사유')
if (result.success) {
  // 거부 완료
}
```

### 1-3. 승인 대기 페이지 기능

**자동 기능:**
- ✅ 30초마다 자동으로 승인 상태 체크
- ✅ 승인 완료 시 자동으로 `/dashboard`로 리다이렉트
- ✅ 거부된 경우 거부 사유 표시

**사용자 액션:**
- 수동으로 "승인 상태 확인" 버튼 클릭 가능
- "로그아웃" 버튼으로 로그아웃 가능

---

## 2. 키오스크 모드

### 2-1. 키오스크 모드 개요

키오스크 모드는 학생들이 직접 다음을 할 수 있도록 합니다:
- PIN 번호로 로그인
- 오늘의 TODO 목록 확인
- TODO 완료 체크

### 2-2. 학생 PIN 설정

학생에게 PIN을 부여하려면 `students` 테이블의 `kiosk_pin` 필드를 설정해야 합니다.

#### 방법 1: SQL로 설정

```sql
-- 학생 코드로 PIN 설정
UPDATE public.students
SET kiosk_pin = '1234'  -- 4자리 숫자 PIN
WHERE student_code = 'S2501001';

-- 여러 학생에게 랜덤 PIN 자동 부여
UPDATE public.students
SET kiosk_pin = lpad((random() * 9999)::int::text, 4, '0')
WHERE kiosk_pin IS NULL
  AND deleted_at IS NULL;
```

#### 방법 2: 학생 등록/수정 폼에서 설정

학생 등록/수정 페이지에 PIN 입력 필드를 추가하세요:

```typescript
// src/app/(dashboard)/students/new/page.tsx 또는 edit
<div className="space-y-2">
  <Label htmlFor="kioskPin">키오스크 PIN (4자리)</Label>
  <Input
    id="kioskPin"
    type="password"
    placeholder="1234"
    maxLength={4}
    {...register("kioskPin")}
  />
  <p className="text-xs text-muted-foreground">
    학생이 키오스크 모드에서 로그인할 때 사용합니다
  </p>
</div>
```

### 2-3. 학생 키오스크 사용 흐름

```
학생이 키오스크 접속 (/kiosk/login)
  ↓
학생 코드 + PIN 입력
  ↓
인증 성공 → 세션 생성 (sessionStorage)
  ↓
키오스크 페이지 (/kiosk) 자동 이동
  ↓
오늘의 TODO 목록 표시
  ↓
학생이 TODO 완료 체크
  ↓
모든 TODO 완료 시 축하 화면 표시
```

### 2-4. 키오스크 접속 방법

**URL:**
```
https://your-domain.com/kiosk/login
```

또는 대시보드에서 "키오스크 모드" 메뉴 클릭

### 2-5. 키오스크 로그인 화면

**입력 필드:**
1. **학생 코드**: 예) `S2501001`
2. **PIN**: 4자리 숫자 (예: `1234`)

**특징:**
- PIN은 비밀번호 형식으로 표시 (••••)
- 학생 코드는 자동으로 대문자 변환
- 숫자만 입력 가능 (4자리 제한)

### 2-6. 키오스크 메인 화면

**표시 정보:**
- 학생 이름 + 환영 메시지
- 오늘의 학습 목표 진행률 (%)
- TODO 목록 (오늘 날짜 기준)

**TODO 아이템:**
- ✅ 완료 체크박스
- 과목 배지
- 예상 소요 시간
- 선생님 피드백 (있는 경우)

**상태별 색상:**
- 미완료: 기본 흰색 배경
- 완료: 파란색 배경 (학생이 체크)
- 검증 완료: 초록색 배경 (선생님이 검증)

**축하 화면:**
- 모든 TODO 검증 완료 시 자동 표시
- "조기 퇴실 가능" 메시지
- 파티 아이콘 애니메이션

### 2-7. 키오스크 세션 관리

**세션 정보:**
- 저장 위치: `sessionStorage`
- 유효 기간: 8시간
- 저장 데이터:
  ```json
  {
    "studentId": "uuid",
    "studentCode": "S2501001",
    "studentName": "김철수",
    "loginAt": "2025-01-15T09:00:00Z"
  }
  ```

**세션 만료:**
- 8시간 경과 시 자동 만료
- 브라우저 탭 닫으면 자동 삭제 (sessionStorage 특성)
- 로그아웃 버튼 클릭 시 즉시 삭제

---

## 3. RLS 정책

### 3-1. 학생 TODO RLS

```sql
-- 스태프는 모든 TODO 조회 가능
CREATE POLICY todos_staff_read_same_tenant
  ON public.student_todos
  FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND (public.is_owner() OR public.is_teacher() OR public.is_ta())
  );

-- 학생은 본인 TODO만 조회 가능
CREATE POLICY todos_student_read_self
  ON public.student_todos
  FOR SELECT
  USING (
    tenant_id = public.current_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id AND s.user_id = auth.uid()
    )
  );

-- 학생은 본인 TODO 완료 처리만 가능 (검증 전)
CREATE POLICY todos_student_complete_self
  ON public.student_todos
  FOR UPDATE
  USING (
    tenant_id = public.current_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = public.current_user_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_id AND s.user_id = auth.uid()
    )
    AND verified_at IS NULL  -- 검증되지 않은 TODO만 수정 가능
  );
```

**주의사항:**
- 키오스크는 Supabase Auth 없이 동작 (PIN 기반)
- 따라서 키오스크에서 TODO를 조회/수정할 때는 **서비스 키 사용 필요**
- 또는 **anon key + RLS bypass function** 사용

### 3-2. 키오스크 TODO 조회 구현

현재 구현은 클라이언트에서 직접 Supabase를 호출하므로 RLS 우회가 필요합니다.

**권장 방법: Server Action 사용**

```typescript
// src/app/actions/kiosk.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function getStudentTodos(studentId: string) {
  const supabase = await createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('student_todos')
    .select('*')
    .eq('student_id', studentId)
    .eq('due_date', today)
    .order('created_at')

  if (error) {
    console.error('TODO 조회 오류:', error)
    return { todos: [], error }
  }

  return { todos: data, error: null }
}

export async function toggleTodoComplete(
  todoId: string,
  studentId: string,
  currentStatus: boolean
) {
  const supabase = await createServerClient()

  // 학생 ID 검증
  const { data: todo } = await supabase
    .from('student_todos')
    .select('student_id')
    .eq('id', todoId)
    .single()

  if (!todo || todo.student_id !== studentId) {
    return { success: false, error: '권한이 없습니다.' }
  }

  const { error } = await supabase
    .from('student_todos')
    .update({
      completed_at: currentStatus ? null : new Date().toISOString(),
    })
    .eq('id', todoId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}
```

---

## 4. 테스트 시나리오

### 4-1. 회원가입 승인 프로세스 테스트

**1단계: 신규 사용자 회원가입**
```
1. /auth/signup 접속
2. test@example.com / Test1234! 입력
3. 회원가입 버튼 클릭
4. 이메일 인증 링크 클릭
```

**2단계: 온보딩**
```
1. /auth/onboarding 자동 이동
2. 이름: 테스트원장 입력
3. 역할: Owner 선택
4. 학원명: 테스트학원 입력
5. 약관 동의 체크
6. "시작하기" 버튼 클릭
```

**3단계: 승인 대기**
```
1. /auth/pending-approval 자동 이동
2. 30초 대기 (자동 체크 확인)
3. "승인 상태 확인" 버튼 클릭해보기
```

**4단계: 관리자 승인**
```sql
-- Supabase SQL Editor
SELECT id, email, name FROM public.users
WHERE email = 'test@example.com';

UPDATE public.users
SET approval_status = 'approved',
    approved_at = now()
WHERE email = 'test@example.com';
```

**5단계: 자동 리다이렉트 확인**
```
1. 승인 대기 페이지에서 30초 대기
2. 자동으로 /dashboard로 이동 확인
```

### 4-2. 키오스크 모드 테스트

**1단계: 학생 PIN 설정**
```sql
-- 테스트 학생 생성
INSERT INTO public.students (
  tenant_id,
  student_code,
  name,
  grade,
  kiosk_pin
) VALUES (
  'your-tenant-id',
  'S2501001',
  '김철수',
  '중1',
  '1234'
);
```

**2단계: TODO 생성**
```sql
INSERT INTO public.student_todos (
  tenant_id,
  student_id,
  title,
  subject,
  due_date,
  priority
)
SELECT
  'your-tenant-id',
  id,
  '수학 문제집 5단원 풀기',
  '수학',
  CURRENT_DATE,
  'high'
FROM public.students
WHERE student_code = 'S2501001';
```

**3단계: 키오스크 로그인**
```
1. /kiosk/login 접속
2. 학생 코드: S2501001
3. PIN: 1234
4. 로그인 버튼 클릭
```

**4단계: TODO 체크**
```
1. /kiosk 자동 이동
2. 학생 이름 "김철수님, 환영합니다!" 확인
3. TODO 목록 표시 확인
4. 체크박스 클릭하여 완료 처리
5. 진행률 100% 확인
```

**5단계: 로그아웃**
```
1. "로그아웃" 버튼 클릭
2. /kiosk/login으로 리다이렉트 확인
```

---

## 5. 보안 고려사항

### 5-1. PIN 보안

**권장사항:**
- PIN을 해시하여 저장 (현재는 평문)
- bcrypt 또는 argon2 사용 권장

**예시 (bcrypt):**
```typescript
import bcrypt from 'bcrypt'

// PIN 저장 시
const hashedPin = await bcrypt.hash(pin, 10)
await supabase.from('students').update({ kiosk_pin: hashedPin })

// PIN 검증 시
const isValid = await bcrypt.compare(inputPin, student.kiosk_pin)
```

### 5-2. 세션 보안

**현재 구현:**
- sessionStorage 사용 (브라우저 탭별 격리)
- 8시간 유효기간

**개선 방안:**
- 비활성 시간 추적 (30분 무활동 시 로그아웃)
- 중요 작업 시 PIN 재입력 요구

### 5-3. RLS 보안

**확인사항:**
- [ ] 학생은 본인 TODO만 조회 가능
- [ ] 학생은 완료 체크만 가능 (생성/삭제 불가)
- [ ] 검증된 TODO는 수정 불가 (`verified_at IS NULL` 체크)

---

## 6. 트러블슈팅

### Q1. 키오스크에서 TODO가 안 보입니다

**원인:**
- RLS 정책으로 인해 anon key로는 TODO 조회 불가

**해결:**
1. Server Action 사용 (권장)
2. 또는 RLS bypass function 생성

### Q2. 승인 대기 페이지에서 계속 대기 중입니다

**확인사항:**
```sql
-- 사용자 승인 상태 확인
SELECT approval_status, approved_at
FROM public.users
WHERE email = 'your-email@example.com';
```

**해결:**
```sql
-- 수동 승인
UPDATE public.users
SET approval_status = 'approved',
    approved_at = now()
WHERE email = 'your-email@example.com';
```

### Q3. 키오스크 로그인이 안 됩니다

**확인사항:**
1. 학생 코드가 정확한지 (대소문자 구분 안함)
2. PIN이 설정되어 있는지
3. `deleted_at IS NULL`인지 (삭제된 학생 아닌지)

```sql
-- 학생 정보 확인
SELECT student_code, name, kiosk_pin, deleted_at
FROM public.students
WHERE student_code = 'S2501001';
```

---

## 7. 다음 단계

### 필수 구현 (보안)
- [ ] PIN 해싱 (bcrypt)
- [ ] 키오스크 Server Action으로 변경
- [ ] 비활성 시간 추적

### 선택 구현 (편의)
- [ ] 학생 등록 폼에 PIN 설정 필드 추가
- [ ] 관리자 승인 대시보드 UI 구현
- [ ] 이메일 알림 (승인 완료 시)
- [ ] 키오스크 대시보드 (학생별 접속 기록)

---

## 관련 파일

**키오스크:**
- 서비스: `src/services/kiosk/kiosk.service.ts`
- 로그인 페이지: `src/app/kiosk/login/page.tsx`
- 메인 페이지: `src/app/(dashboard)/kiosk/page.tsx`

**회원가입 승인:**
- Server Action: `src/app/actions/approve-user.ts`
- 승인 대기 페이지: `src/app/(auth)/auth/pending-approval/page.tsx`
- 온보딩 페이지: `src/app/(auth)/auth/onboarding/page.tsx`

**피처 플래그:**
- `src/lib/features.config.ts`
  - `signup: 'active'`
  - `kioskMode: 'active'`
