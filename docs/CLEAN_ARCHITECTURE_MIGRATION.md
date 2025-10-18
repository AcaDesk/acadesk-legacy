# Clean Architecture 마이그레이션 가이드

Student와 Todo 도메인을 Clean Architecture로 리팩토링한 결과를 설명합니다.

## 완료된 작업

### 1. Domain Layer (도메인 레이어)

#### Value Objects
- **`StudentCode`** - 학생 코드 생성 및 관리
  - 자동 생성 로직 캡슐화
  - 고유성 보장

- **`Priority`** - TODO 우선순위 관리
  - Type-safe한 우선순위 레벨 (low, normal, high, urgent)
  - 우선순위 비교 로직
  - 한글 변환 기능

#### Entities
- **`Student`** - 학생 도메인 엔티티
  - 비즈니스 로직: 나이 계산, 재학 기간 계산
  - 불변성 보장 (Immutable)
  - 탈퇴, 수정, 삭제 등 상태 변경 메서드

- **`Todo`** - TODO 도메인 엔티티
  - 비즈니스 로직: D-Day 계산, 연체 확인
  - 완료/취소, 검증 등 상태 변경 메서드
  - 우선순위 관리

#### Repository Interfaces
- **`IStudentRepository`** - 학생 리포지토리 계약
- **`ITodoRepository`** - TODO 리포지토리 계약
- 의존성 역전 원칙(DIP) 적용

### 2. Infrastructure Layer (인프라 레이어)

#### Supabase Implementations
- **`SupabaseStudentRepository`** - IStudentRepository 구현
  - Supabase 특화 구현
  - 도메인 엔티티 ↔ 데이터베이스 매핑
  - 에러 처리 및 로깅

- **`SupabaseTodoRepository`** - ITodoRepository 구현
  - 필터링, 통계, 완료율 조회
  - 일괄 작업 지원

### 3. Application Layer (애플리케이션 레이어)

#### Student Use Cases
```
src/application/use-cases/student/
├── CreateStudentUseCase.ts      # 학생 생성
├── UpdateStudentUseCase.ts      # 학생 수정
├── DeleteStudentUseCase.ts      # 학생 삭제
├── GetStudentUseCase.ts         # 학생 조회
└── WithdrawStudentUseCase.ts    # 학생 탈퇴
```

#### Todo Use Cases
```
src/application/use-cases/todo/
├── CreateTodoUseCase.ts         # TODO 생성
├── UpdateTodoUseCase.ts         # TODO 수정
├── CompleteTodoUseCase.ts       # TODO 완료/취소
├── VerifyTodoUseCase.ts         # TODO 검증
├── DeleteTodoUseCase.ts         # TODO 삭제
└── GetTodoUseCase.ts            # TODO 조회
```

#### Factory Functions
```
src/application/factories/
├── studentUseCaseFactory.ts           # 서버 사이드용
├── studentUseCaseFactory.client.ts    # 클라이언트용
├── todoUseCaseFactory.ts              # 서버 사이드용
└── todoUseCaseFactory.client.ts       # 클라이언트용
```

### 4. API Routes 마이그레이션

#### Before (기존)
```typescript
// src/app/api/students/route.ts
import { StudentRepository } from '@/services/data/student.repository'

const repository = new StudentRepository(supabase)
const student = await repository.create(data)
```

#### After (새 아키텍처)
```typescript
// src/app/api/students/route.ts
import { createCreateStudentUseCase } from '@/application/factories/studentUseCaseFactory'

const useCase = await createCreateStudentUseCase()
const student = await useCase.execute(data)
return NextResponse.json(student.toDTO())
```

## 아키텍처 구조

```
┌─────────────────────────────────────────────┐
│         Presentation Layer                  │
│  (API Routes, Components, Pages)            │
└──────────────┬──────────────────────────────┘
               │ DTO
               ▼
┌─────────────────────────────────────────────┐
│         Application Layer                   │
│  (Use Cases, Factories)                     │
└──────────────┬──────────────────────────────┘
               │ Domain Entity
               ▼
┌─────────────────────────────────────────────┐
│         Domain Layer                        │
│  (Entities, Value Objects, Interfaces)      │
└──────────────┬──────────────────────────────┘
               │ Repository Interface
               ▼
┌─────────────────────────────────────────────┐
│         Infrastructure Layer                │
│  (Supabase Repositories)                    │
└──────────────┬──────────────────────────────┘
               │
               ▼
           Database
```

## 주요 변경 사항

### 1. 타입 안정성 강화
- Value Objects로 타입 안정성 보장
- StudentCode 자동 생성
- Priority 레벨 제한

### 2. 비즈니스 로직 캡슐화
- 도메인 엔티티에 비즈니스 로직 집중
- `student.getAge()`, `todo.getDaysUntilDue()` 등
- 불변성 패턴으로 상태 관리

### 3. 테스트 용이성
- Mock Repository로 단위 테스트 가능
- Use Cases는 독립적으로 테스트 가능
- 의존성 주입으로 결합도 감소

### 4. 데이터베이스 독립성
- Supabase를 다른 DB로 교체 가능
- Domain Layer는 Infrastructure에 의존하지 않음
- Repository 인터페이스만 구현하면 됨

## 마이그레이션된 파일

### API Routes
- ✅ `src/app/api/students/route.ts` - GET, POST
- ✅ `src/app/api/students/[id]/route.ts` - GET, PATCH, DELETE

### Entities
- ✅ `src/domain/entities/Student.ts` - 완전한 getter와 toDTO() 추가
- ✅ `src/domain/entities/Todo.ts` - 이미 완료됨

## 다음 단계 (선택사항)

### 1. 남은 파일 마이그레이션
다음 파일들도 새 아키텍처를 사용하도록 변경 가능:
- `src/services/student-management.service.ts`
- `src/services/todo-management.service.ts`
- `src/components/features/students/*.tsx`
- `src/components/features/students/detail/*.tsx`

### 2. 기존 Repository Deprecation
```typescript
// src/services/data/student.repository.ts
/**
 * @deprecated Use SupabaseStudentRepository and Use Cases instead
 *
 * Migration guide:
 * - Replace StudentRepository with Use Cases from @/application/use-cases/student
 * - Use factory functions from @/application/factories/studentUseCaseFactory
 *
 * @see src/application/README.md
 */
export class StudentRepository extends BaseRepository { ... }
```

### 3. 추가 Use Cases
필요시 추가 Use Cases 작성:
- `BulkCreateStudentsUseCase` - 학생 일괄 등록
- `ImportStudentsFromCsvUseCase` - CSV 가져오기
- `GenerateStudentReportUseCase` - 학생 리포트 생성

### 4. 컴포넌트에서 React Query 사용
```typescript
// src/hooks/students/useStudents.ts
import { useQuery } from '@tanstack/react-query'
import { createGetStudentUseCase } from '@/application/factories/studentUseCaseFactory.client'

export function useStudents(tenantId: string) {
  return useQuery({
    queryKey: ['students', tenantId],
    queryFn: async () => {
      const useCase = createGetStudentUseCase()
      const students = await useCase.getAllByTenant(tenantId)
      return students.map(s => s.toDTO())
    },
  })
}
```

## 장점 요약

### 1. 유지보수성 ⬆️
- 비즈니스 로직이 Domain Layer에 집중
- 각 레이어의 역할이 명확
- 변경 영향 범위 최소화

### 2. 테스트 용이성 ⬆️
- Mock 객체로 단위 테스트 작성
- 각 Use Case를 독립적으로 테스트
- TDD(Test-Driven Development) 가능

### 3. 확장성 ⬆️
- 새로운 Use Case 추가가 쉬움
- 다른 데이터베이스로 쉽게 교체
- 새로운 기능 추가 시 기존 코드 영향 없음

### 4. 타입 안정성 ⬆️
- TypeScript로 전체 레이어 타입 보장
- Value Objects로 도메인 규칙 강제
- DTO로 API 계약 명확화

## 참고 문서

- [Application Layer README](../src/application/README.md)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
