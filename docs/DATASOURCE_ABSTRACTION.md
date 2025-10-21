# DataSource Abstraction Guide

## 개요

Supabase에 대한 강한 결합을 제거하고 테스트 가능성을 높이기 위해 DataSource 추상화 계층을 도입했습니다.

### 주요 이점

1. **테스트 용이성** - Mock DataSource를 사용한 유닛 테스트 작성 가능
2. **환경별 전환** - Local/Staging/Production 환경 간 쉬운 전환
3. **의존성 역전** - Infrastructure 레이어가 Domain 레이어에 의존
4. **유연성** - 필요시 Supabase 외 다른 데이터베이스로 전환 가능

## 아키텍처

```
┌─────────────────────────────────────────────┐
│   Application Layer (Use Cases, Factories)  │
│                                              │
│  Factory → DataSource Provider → Use Case   │
└───────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│        Domain Layer (Interfaces)             │
│                                              │
│  IDataSource, IQueryBuilder, IRepository    │
└───────────────────┬──────────────────────────┘
                    │
┌───────────────────▼──────────────────────────┐
│   Infrastructure Layer (Implementations)     │
│                                              │
│  SupabaseDataSource, MockDataSource          │
│  StudentRepository, TodoRepository, ...      │
└──────────────────────────────────────────────┘
```

## 핵심 컴포넌트

### 1. IDataSource 인터페이스

Supabase 클라이언트를 추상화하는 인터페이스입니다.

```typescript
// src/domain/data-sources/IDataSource.ts
export interface IDataSource {
  from<T = any>(table: string): IQueryBuilder<T>
  rpc<T = any>(fn: string, params?: object): Promise<{ data: T | null; error: Error | null }>
  auth?: {
    getUser(): Promise<{ data: { user: any } | null; error: Error | null }>
    signOut(): Promise<{ error: Error | null }>
  }
}
```

### 2. SupabaseDataSource (실제 구현체)

실제 Supabase 클라이언트를 래핑합니다.

```typescript
// src/infrastructure/data-sources/SupabaseDataSource.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@/domain/data-sources/IDataSource'

export class SupabaseDataSource implements IDataSource {
  constructor(private client: SupabaseClient) {}

  from<T = any>(table: string): IQueryBuilder<T> {
    const builder = this.client.from(table)
    return new SupabaseQueryBuilder<T>(builder)
  }

  // ... 기타 메서드
}
```

### 3. MockDataSource (테스트용 구현체)

테스트를 위한 In-Memory 데이터 소스입니다.

```typescript
// src/infrastructure/data-sources/MockDataSource.ts
export class MockDataSource implements IDataSource {
  private store: Map<string, Map<string, any>> = new Map()

  from<T = any>(table: string): IQueryBuilder<T> {
    return new MockQueryBuilder<T>(table, this.store)
  }

  // 테스트 헬퍼 메서드
  seed(tableName: string, data: any[]): void { ... }
  clear(): void { ... }
  getTable(tableName: string): any[] { ... }
}
```

### 4. DataSource Provider

환경에 따라 적절한 DataSource를 반환합니다.

```typescript
// src/lib/data-source-provider.ts
export async function createServerDataSource(
  config?: DataSourceConfig
): Promise<IDataSource> {
  if (config?.forceMock) {
    return new MockDataSource()
  }
  const supabaseClient = await createServerClient()
  return new SupabaseDataSource(supabaseClient)
}

export function createClientDataSource(
  config?: DataSourceConfig
): IDataSource {
  if (config?.forceMock) {
    return new MockDataSource()
  }
  const supabaseClient = createBrowserClient()
  return new SupabaseDataSource(supabaseClient)
}
```

## 사용 방법

### 1. 일반 사용 (Production)

기존 코드와 동일하게 사용하면 됩니다. Factory가 자동으로 실제 Supabase DataSource를 주입합니다.

```typescript
// Server Component
const useCase = await createGetStudentsUseCase()
const students = await useCase.execute({ tenantId })

// Client Component
const useCase = createGetStudentsUseCase()
const { data: students } = useQuery({
  queryKey: ['students'],
  queryFn: () => useCase.execute({ tenantId })
})
```

### 2. 테스트 작성

Mock DataSource를 주입하여 테스트합니다.

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { createGetStudentsUseCase } from '@/application/factories/studentUseCaseFactory.client'
import { createMockDataSource } from '@/lib/data-source-provider'

describe('GetStudentsUseCase', () => {
  let mockDataSource: ReturnType<typeof createMockDataSource>

  beforeEach(() => {
    mockDataSource = createMockDataSource()
    mockDataSource.clear()
  })

  it('should return students for given tenant', async () => {
    // Arrange
    mockDataSource.seed('students', [
      {
        id: 'student-1',
        tenant_id: 'tenant-1',
        student_code: 'S001',
        name: 'John Doe',
        grade: '초등학교 6학년',
        // ... 기타 필드
      }
    ])

    const useCase = createGetStudentsUseCase({
      customDataSource: mockDataSource
    })

    // Act
    const result = await useCase.execute({ tenantId: 'tenant-1' })

    // Assert
    expect(result).toHaveLength(1)
    expect(result[0].getName()).toBe('John Doe')
  })
})
```

### 3. 환경별 전환

환경 변수로 자동 전환되거나, 강제로 Mock을 사용할 수 있습니다.

```typescript
// 테스트 환경에서 강제로 Mock 사용
const useCase = await createGetStudentsUseCase({ forceMock: true })

// 커스텀 DataSource 주입
const customDataSource = new MyCustomDataSource()
const useCase = await createGetStudentsUseCase({
  customDataSource
})
```

### 4. Repository 수정 (기존 코드 호환)

Repository는 IDataSource와 SupabaseClient 모두 받을 수 있도록 하위 호환성을 유지합니다.

```typescript
export class StudentRepository implements IStudentRepository {
  private dataSource: IDataSource

  constructor(client: IDataSource | SupabaseClient) {
    // IDataSource 타입 체크 (duck typing)
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function' && typeof client.rpc === 'function'
  }

  async findById(id: string): Promise<Student | null> {
    const { data, error } = await this.dataSource
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    // ...
  }
}
```

## 마이그레이션 가이드

### 기존 코드를 새로운 패턴으로 전환하기

#### 1. Repository 수정

기존:
```typescript
export class StudentRepository implements IStudentRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<Student | null> {
    const { data, error } = await this.supabase
      .from('students')
      // ...
  }
}
```

수정 후:
```typescript
import type { IDataSource } from '@/domain/data-sources/IDataSource'
import { SupabaseDataSource } from '../data-sources/SupabaseDataSource'

export class StudentRepository implements IStudentRepository {
  private dataSource: IDataSource

  constructor(client: IDataSource | SupabaseClient) {
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function'
  }

  async findById(id: string): Promise<Student | null> {
    const { data, error } = await this.dataSource
      .from('students')
      // ...
  }
}
```

#### 2. Factory 수정

기존:
```typescript
async function createStudentRepository() {
  const supabase = await createClient()
  return new StudentRepository(supabase)
}

export async function createGetStudentsUseCase() {
  const repository = await createStudentRepository()
  return new GetStudentsUseCase(repository)
}
```

수정 후:
```typescript
import type { DataSourceConfig } from '@/lib/data-source-provider'
import { createServerDataSource } from '@/lib/data-source-provider'

async function createStudentRepository(config?: DataSourceConfig) {
  const dataSource = await createServerDataSource(config)
  return new StudentRepository(dataSource)
}

export async function createGetStudentsUseCase(config?: DataSourceConfig) {
  const repository = await createStudentRepository(config)
  return new GetStudentsUseCase(repository)
}
```

## 테스트 패턴

### 1. 기본 테스트 패턴

```typescript
describe('MyUseCase', () => {
  let mockDataSource: MockDataSource

  beforeEach(() => {
    mockDataSource = createMockDataSource()
    mockDataSource.clear()
  })

  it('should do something', async () => {
    // Arrange
    mockDataSource.seed('table_name', [/* test data */])
    const useCase = createMyUseCase({ customDataSource: mockDataSource })

    // Act
    const result = await useCase.execute()

    // Assert
    expect(result).toBe(expected)
  })
})
```

### 2. 에러 시나리오 테스트

MockDataSource는 실제 에러를 시뮬레이션할 수 없으므로, Repository를 Mock해야 합니다.

```typescript
import { vi } from 'vitest'

it('should handle database error', async () => {
  // Arrange
  const mockRepository = {
    findById: vi.fn().mockRejectedValue(new DatabaseError('Connection failed'))
  }
  const useCase = new GetStudentUseCase(mockRepository as any)

  // Act & Assert
  await expect(useCase.execute({ id: '123' }))
    .rejects.toThrow('Connection failed')
})
```

### 3. Integration Test

실제 Supabase를 사용한 통합 테스트가 필요한 경우:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    include: ['**/*.integration.test.ts'],
    environment: 'node',
  }
})

// MyUseCase.integration.test.ts
describe('MyUseCase Integration', () => {
  it('should work with real Supabase', async () => {
    // 실제 Supabase 사용 (forceMock: false)
    const useCase = await createMyUseCase({ environment: 'development' })
    const result = await useCase.execute()
    expect(result).toBeDefined()
  })
})
```

## 환경 설정

### 환경 변수

```env
# .env.local (Development)
NODE_ENV=development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-key

# .env.staging
NODE_ENV=staging
NEXT_PUBLIC_ENV=staging
NEXT_PUBLIC_SUPABASE_URL=https://staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-key

# .env.production
NODE_ENV=production
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://production.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-key
```

### 테스트 환경

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:integration": "SUPABASE_URL=http://localhost:54321 vitest run **/*.integration.test.ts"
  }
}
```

## FAQ

### Q1. 기존 코드를 모두 수정해야 하나요?

아니요. Repository는 하위 호환성을 유지하므로, 기존 코드는 그대로 작동합니다. 필요한 부분만 점진적으로 수정하면 됩니다.

### Q2. Mock DataSource의 한계는?

MockDataSource는 간단한 CRUD와 필터링만 지원합니다. 복잡한 쿼리 (JOIN, Aggregate 등)는 제한적입니다. 이런 경우 Repository를 직접 Mock하거나 Integration Test를 작성하세요.

### Q3. 다른 Repository도 수정해야 하나요?

StudentRepository 패턴을 참고하여 점진적으로 수정할 수 있습니다. 급하지 않다면 필요할 때마다 수정하면 됩니다.

### Q4. 성능 영향은?

DataSource는 단순 래퍼이므로 성능 영향은 거의 없습니다. 추상화 오버헤드는 무시할 수 있는 수준입니다.

## 참고 자료

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Dependency Injection Pattern](https://en.wikipedia.org/wiki/Dependency_injection)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Vitest Documentation](https://vitest.dev/)
