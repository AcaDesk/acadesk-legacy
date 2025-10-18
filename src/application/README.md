# Application Layer - Clean Architecture

이 디렉토리는 Clean Architecture의 Application Layer를 구현합니다.

## 구조

```
src/application/
├── use-cases/          # 비즈니스 로직 유스케이스
│   ├── student/        # 학생 관련 유스케이스
│   └── todo/           # TODO 관련 유스케이스
└── factories/          # 의존성 주입 팩토리
```

## 사용 방법

### 1. Server Components / API Routes에서 사용

```typescript
// src/app/api/students/route.ts
import { createCreateStudentUseCase } from '@/application/factories/studentUseCaseFactory'

export async function POST(request: Request) {
  const data = await request.json()

  const useCase = await createCreateStudentUseCase()
  const student = await useCase.execute({
    tenantId: 'tenant-id',
    name: data.name,
    grade: data.grade,
    // ... other fields
  })

  return Response.json(student.toDTO())
}
```

### 2. Server Actions에서 사용

```typescript
// src/app/actions/students.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createCreateStudentUseCase } from '@/application/factories/studentUseCaseFactory'
import type { CreateStudentDTO } from '@/application/use-cases/student'

export async function createStudent(dto: CreateStudentDTO) {
  const useCase = await createCreateStudentUseCase()
  const student = await useCase.execute(dto)

  revalidatePath('/students')
  return student.toDTO()
}
```

### 3. Client Components에서 사용 (React Query와 함께)

```typescript
// src/hooks/students/useCreateStudent.ts
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCreateStudentUseCase } from '@/application/factories/studentUseCaseFactory.client'
import type { CreateStudentDTO } from '@/application/use-cases/student'

export function useCreateStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CreateStudentDTO) => {
      const useCase = createCreateStudentUseCase()
      const student = await useCase.execute(dto)
      return student.toDTO()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

// Component에서 사용
function CreateStudentForm() {
  const { mutate, isPending } = useCreateStudent()

  const handleSubmit = (data: CreateStudentDTO) => {
    mutate(data)
  }

  // ... rest of component
}
```

### 4. TODO Use Cases 사용 예시

```typescript
// 완료 처리
import { createCompleteTodoUseCase } from '@/application/factories/todoUseCaseFactory'

const useCase = await createCompleteTodoUseCase()
const completedTodo = await useCase.execute(todoId)

// 검증 처리 (선생님 확인)
import { createVerifyTodoUseCase } from '@/application/factories/todoUseCaseFactory'

const useCase = await createVerifyTodoUseCase()
const verifiedTodo = await useCase.execute({
  todoId: 'todo-id',
  verifiedBy: 'teacher-user-id'
})
```

## 아키텍처 원칙

### 1. 의존성 역전 원칙 (DIP)
- Use Cases는 Repository 인터페이스에 의존
- 구체적인 구현(Supabase)은 Infrastructure 레이어에 격리
- 테스트 시 Mock Repository 사용 가능

### 2. 단일 책임 원칙 (SRP)
- 각 Use Case는 하나의 비즈니스 작업만 수행
- CreateStudent, UpdateStudent, DeleteStudent 등으로 분리

### 3. 도메인 로직 캡슐화
- 비즈니스 규칙은 Domain Entity에 위치
- Use Case는 오케스트레이션만 담당
- 예: `student.update()`, `todo.complete()`, `todo.verify()`

### 4. DTO 사용
- Presentation Layer와 Application Layer 간 데이터 전달
- Type-safe한 인터페이스 제공
- Domain Entity와 분리하여 API 변경 유연성 확보

## 레이어 간 데이터 흐름

```
Presentation (UI/API)
  ↓ DTO
Application (Use Cases)
  ↓ Domain Entity
Domain (Entities, Value Objects)
  ↓ Persistence Object
Infrastructure (Repositories)
  ↓
Database (Supabase)
```

## 테스트 작성

```typescript
// tests/unit/application/CreateStudentUseCase.test.ts
import { describe, it, expect, vi } from 'vitest'
import { CreateStudentUseCase } from '@/application/use-cases/student'
import type { IStudentRepository } from '@/domain/repositories/IStudentRepository'

describe('CreateStudentUseCase', () => {
  it('should create a student with valid data', async () => {
    // Mock repository
    const mockRepository: IStudentRepository = {
      save: vi.fn().mockResolvedValue(mockStudent),
      findByStudentCode: vi.fn().mockResolvedValue(null),
      // ... other methods
    }

    const useCase = new CreateStudentUseCase(mockRepository)

    const result = await useCase.execute({
      tenantId: 'test-tenant',
      name: 'Test Student',
    })

    expect(result.name).toBe('Test Student')
    expect(mockRepository.save).toHaveBeenCalled()
  })
})
```

## 마이그레이션 가이드

기존 코드를 새 아키텍처로 마이그레이션하는 방법:

### Before (기존)
```typescript
// src/app/api/students/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const data = await request.json()

  const { data: student, error } = await supabase
    .from('students')
    .insert({
      name: data.name,
      student_code: generateStudentCode(),
      // ...
    })
    .select()
    .single()

  if (error) throw error
  return Response.json(student)
}
```

### After (새 아키텍처)
```typescript
// src/app/api/students/route.ts
import { createCreateStudentUseCase } from '@/application/factories/studentUseCaseFactory'

export async function POST(request: Request) {
  const data = await request.json()

  const useCase = await createCreateStudentUseCase()
  const student = await useCase.execute({
    tenantId: data.tenantId,
    name: data.name,
    // ...
  })

  return Response.json(student.toDTO())
}
```

## 장점

1. **테스트 용이성**: Repository를 Mock으로 대체하여 단위 테스트 작성
2. **유지보수성**: 비즈니스 로직이 Domain Layer에 집중
3. **확장성**: 새로운 Use Case 추가 시 기존 코드 영향 최소화
4. **데이터베이스 독립성**: Supabase를 다른 DB로 교체 가능
5. **타입 안정성**: TypeScript로 전체 레이어 타입 보장
