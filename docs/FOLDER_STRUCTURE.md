# 📁 Acadesk Web - 폴더 구조 표준안

> **마이그레이션 전략**: Server-side + service_role 기반의 Supabase 접근 (RLS 우회) + Clean Architecture 유지

**핵심 원칙:**
- DB 접근은 전부 서버에서
- 클라이언트는 Server Action을 통해서만 호출
- Clean Architecture 계층 분리 유지

---

## 📂 전체 구조 개요

```
src/
├── app/                     # Next.js App Router
│   ├── (auth)/              # 인증 관련 페이지 (로그인, 회원가입)
│   ├── (dashboard)/         # 실제 서비스 화면 (Server Action 기반)
│   │   ├── students/        # 예: 학생 관리 페이지
│   │   │   ├── page.tsx              # Server Component (데이터 fetching)
│   │   │   ├── layout.tsx
│   │   │   └── StudentListClient.tsx # Client Component (UI only)
│   │   └── ...
│   ├── actions/             # ✅ Server Actions (Supabase service_role 접근)
│   │   ├── auth.ts          # 인증 (회원가입, 로그인, 로그아웃)
│   │   ├── students.ts      # 학생 관리
│   │   ├── todos.ts         # TODO 관리
│   │   ├── reports.ts       # 리포트 생성
│   │   └── ...
│   ├── api/                 # (필요 시만 유지) API Route
│   └── layout.tsx
│
├── application/             # ✅ Use Case 계층 (비즈니스 로직)
│   ├── use-cases/           # 도메인별 유즈케이스
│   │   ├── student/
│   │   │   ├── GetStudentsUseCase.ts
│   │   │   ├── CreateStudentUseCase.ts
│   │   │   └── UpdateStudentUseCase.ts
│   │   ├── todo/
│   │   ├── auth/
│   │   └── ...
│   └── factories/           # UseCaseFactory (Server-side only)
│       ├── studentUseCaseFactory.ts      # Server용 (권장)
│       ├── todoUseCaseFactory.ts
│       └── _deprecated/                  # 레거시 client factory
│           └── authUseCaseFactory.client.ts
│
├── domain/                  # ✅ 순수 Domain 계층 (프레임워크 독립적)
│   ├── entities/            # 엔티티
│   │   ├── Student.ts
│   │   ├── User.ts
│   │   └── Report.ts
│   ├── repositories/        # 리포지토리 인터페이스
│   │   ├── IStudentRepository.ts
│   │   ├── ITodoRepository.ts
│   │   └── IAuthRepository.ts
│   ├── value-objects/       # 값 객체
│   │   ├── StudentCode.ts
│   │   ├── Email.ts
│   │   └── Password.ts
│   └── data-sources/        # DataSource 인터페이스
│       └── IDataSource.ts
│
├── infrastructure/          # ✅ 실제 구현체 계층 (외부 의존성)
│   ├── database/            # 리포지토리 구현체
│   │   ├── student.repository.ts
│   │   ├── todo.repository.ts
│   │   ├── auth.repository.ts
│   │   └── base.repository.ts
│   ├── data-sources/        # DataSource 구현체
│   │   ├── SupabaseDataSource.ts
│   │   └── MockDataSource.ts
│   ├── messaging/           # 외부 메시징 서비스
│   │   ├── AligoProvider.ts
│   │   └── MessageProviderFactory.ts
│   └── pdf/                 # PDF 생성
│       └── ReportPDFTemplate.tsx
│
├── lib/                     # 공통 유틸 / 인프라 설정
│   ├── supabase/
│   │   ├── service-role.ts  # ✅ service_role client (Server Actions용)
│   │   ├── server.ts        # SSR safe client (Server Components용)
│   │   └── client.ts        # Browser client (읽기 전용 권장)
│   ├── auth/
│   │   ├── verify-permission.ts # ✅ Server Action에서 권한 검증
│   │   └── route-after-login.ts
│   ├── data-source-provider.ts  # ✅ createServerDataSource()
│   ├── env.ts
│   ├── utils.ts
│   └── error-handlers.ts
│
├── components/              # UI Layer (Presentation)
│   ├── features/            # 기능별 컴포넌트
│   │   ├── students/
│   │   │   ├── StudentList.tsx
│   │   │   ├── AddStudentDialog.tsx
│   │   │   └── StudentCard.tsx
│   │   ├── todos/
│   │   ├── auth/
│   │   └── ...
│   ├── ui/                  # 재사용 UI 컴포넌트 (shadcn/ui 등)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   └── layout/              # 공통 레이아웃 컴포넌트
│       ├── navbar.tsx
│       ├── sidebar.tsx
│       └── page-wrapper.tsx
│
├── hooks/                   # Custom React Hooks
│   ├── use-student-detail.tsx
│   ├── use-toast.ts
│   └── ...
│
└── types/                   # TypeScript 타입 정의
    ├── database.types.ts    # Supabase 자동생성 타입
    ├── studentDetail.types.ts
    └── common.types.ts
```

---

## 🧠 계층별 역할 요약

| 계층 | 폴더 | 설명 | 의존 방향 |
|------|------|------|----------|
| **Presentation** | `app/`, `components/` | UI + Server Actions. 클라이언트는 DB 접근 없음. | → Application |
| **Application** | `application/use-cases/` | 비즈니스 로직. Repository를 주입받아 동작. | → Domain |
| **Domain** | `domain/` | Entity, Repository Interface, Value Objects 등. | 독립적 (의존 없음) |
| **Infrastructure** | `infrastructure/` | 실제 구현체 (Supabase, Aligo, PDF 등). service_role 기반으로 DB 접근. | → Domain |
| **Lib** | `lib/` | 환경 설정, Supabase 클라이언트, 인증 유틸. | Infrastructure 지원 |
| **Types** | `types/` | Supabase 타입 자동생성 파일. | 전역 참조 가능 |

---

## ✅ Server-side 전략에서 중요한 부분

### 1. DB 접근은 무조건 Server Action or API Route 내부에서만

**❌ 잘못된 방법:**
```typescript
// ❌ Client Component에서 직접 Repository 호출
'use client'
import { createGetStudentsUseCase } from '@/application/factories/studentUseCaseFactory.client'

export default function StudentList() {
  const getStudentsUseCase = createGetStudentsUseCase()
  const students = await getStudentsUseCase.execute() // ❌ 클라이언트에서 DB 접근
  return <div>{students.map(...)}</div>
}
```

**✅ 올바른 방법:**
```typescript
// ✅ Server Action 사용
'use client'
import { getStudents } from '@/app/actions/students'

export default function StudentList() {
  const [students, setStudents] = useState([])

  useEffect(() => {
    async function loadStudents() {
      const result = await getStudents() // ✅ Server Action 호출
      if (result.success) {
        setStudents(result.data)
      }
    }
    loadStudents()
  }, [])

  return <div>{students.map(...)}</div>
}
```

### 2. 모든 Repository는 `createServiceRoleClient()` 사용

```typescript
// src/app/actions/students.ts
'use server'

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { verifyStaff } from '@/lib/auth/verify-permission'

export async function getStudents() {
  // 1. 권한 검증
  const { tenantId } = await verifyStaff()

  // 2. service_role client 생성 (RLS 우회)
  const serviceClient = createServiceRoleClient()

  // 3. DB 접근 (tenant_id 수동 필터링)
  const { data, error } = await serviceClient
    .from('students')
    .select('*')
    .eq('tenant_id', tenantId) // ⚠️ 반드시 tenant 필터링
    .is('deleted_at', null)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}
```

### 3. RLS는 비활성화 가능 (tenant_id 수동 필터링으로 대체)

**현재 전략:**
- RLS 정책은 유지하되, Server Actions에서는 service_role로 우회
- **모든 쿼리에서 `tenant_id` 필터링 필수**
- `verifyStaff()` 등으로 권한 검증 후 tenantId 획득

### 4. Domain ~ Application 계층은 Supabase 의존 없이 유지

**Clean Architecture 원칙:**
- `domain/` - Supabase import 금지
- `application/` - Supabase import 금지
- `infrastructure/` - Supabase 구현체 위치

이렇게 하면 나중에 Supabase → AWS RDS / PlanetScale로 교체해도
**`infrastructure/` 아래 Repository만 교체**하면 됩니다.

---

## 📋 파일 명명 규칙

### Server Actions
- **위치**: `src/app/actions/`
- **명명**: `{domain}.ts` (예: `students.ts`, `todos.ts`, `auth.ts`)
- **함수 네이밍**: camelCase, 동사로 시작
  - `getStudents()`, `createStudent()`, `updateStudent()`, `deleteStudent()`

### Use Cases
- **위치**: `src/application/use-cases/{domain}/`
- **명명**: `{Action}{Entity}UseCase.ts`
  - 예: `GetStudentsUseCase.ts`, `CreateStudentUseCase.ts`

### Repositories
- **인터페이스**: `src/domain/repositories/I{Entity}Repository.ts`
  - 예: `IStudentRepository.ts`
- **구현체**: `src/infrastructure/database/{entity}.repository.ts`
  - 예: `student.repository.ts`

### Components
- **Client Component**: `{Name}.tsx` (PascalCase)
- **Server Component**: `page.tsx`, `layout.tsx`

---

## 🔄 마이그레이션 체크리스트

### ✅ 완료된 마이그레이션
- [x] `auth.ts` - 회원가입, 로그인, 로그아웃
- [x] `students.ts` - 학생 생성, 수정, 삭제
- [x] `todos.ts` - TODO 생성, 검증, 반려
- [x] `attendance.ts` - 출석 관리
- [x] `grades.ts` - 성적 관리
- [x] `guardians.ts` - 보호자 관리
- [x] `consultations.ts` - 상담 기록
- [x] `reports.ts` - 리포트 생성

### 🔄 진행 중인 마이그레이션
- [ ] Class 관련 기능
- [ ] TODO Template 관련 기능
- [ ] Student Import 관련 기능

### ⏭️ 예정된 마이그레이션
- [ ] Payment 관련 기능
- [ ] Calendar 관련 기능
- [ ] Notification 관련 기능

---

## 📚 참고 문서

- [마이그레이션 가이드](./migration/INDEX.md)
- [Clean Architecture 가이드](../CLAUDE.md)
- [Server Actions 사용 가이드](./migration/QUICK_REFERENCE.md)
- [DataSource 추상화 가이드](./DATASOURCE_ABSTRACTION.md)

---

**최종 업데이트**: 2025-10-23
**작성자**: Claude Code
**버전**: 1.0.0
