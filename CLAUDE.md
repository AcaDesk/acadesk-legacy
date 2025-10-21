# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Acadesk Web** is a SaaS platform for academy (cram school) management built with Next.js 15, TypeScript, Supabase, and Tailwind CSS. The system helps academies manage students, attendance, grades, reports, and learning activities with a focus on operational efficiency and parent satisfaction.

## Commands

### Development
```bash
pnpm dev              # Run development server with Turbopack (local env)
pnpm dev:staging      # Run with staging environment variables
pnpm dev:production   # Run with production environment variables
pnpm build            # Build for production with Turbopack
pnpm build:staging    # Build with staging environment variables
pnpm build:production # Build with production environment variables
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm type-check       # Run TypeScript compiler check
pnpm env:validate     # Validate environment variables
```

### Testing
```bash
pnpm test             # Run Vitest in watch mode
pnpm test:ui          # Run Vitest with UI
pnpm test:run         # Run Vitest once
pnpm exec playwright test              # Run Playwright e2e tests
pnpm exec playwright test --ui         # Run Playwright with UI
pnpm exec playwright test --debug      # Run Playwright in debug mode
```

### Database
```bash
supabase start        # Start local Supabase instance
supabase stop         # Stop local Supabase instance
supabase status       # Check Supabase status
supabase db reset     # Reset local database
supabase migration new <name>          # Create new migration
supabase db push      # Apply migrations to remote database
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.4 with App Router, React Server Components, Turbopack
- **Language**: TypeScript with strict mode enabled
- **Database**: Supabase (PostgreSQL 15) with Row Level Security (RLS)
- **Auth**: Supabase Auth with JWT-based authentication
- **Styling**: Tailwind CSS v4 with CSS variables, shadcn/ui components
- **State**: React Query (@tanstack/react-query) for server state
- **Forms**: React Hook Form with Zod validation
- **Testing**: Vitest + Testing Library (unit), Playwright (e2e)
- **Package Manager**: pnpm (10.17.1)

### Clean Architecture Implementation

The codebase strictly follows Clean Architecture with clear layer separation and dependency inversion:

```
src/
├── app/                    # Presentation Layer (Next.js App Router)
│   ├── (dashboard)/        # Dashboard routes (route groups)
│   ├── (auth)/             # Auth routes (route groups)
│   ├── api/                # API route handlers
│   └── actions/            # Server Actions
│
├── application/            # Application Layer
│   ├── use-cases/          # Business logic orchestration
│   │   ├── student/        # Student domain use cases
│   │   ├── attendance/     # Attendance domain use cases
│   │   ├── todo/           # Todo domain use cases
│   │   └── auth/           # Auth domain use cases
│   └── factories/          # Dependency injection factories
│       ├── *UseCaseFactory.ts          # Server-side factories
│       └── *UseCaseFactory.client.ts   # Client-side factories
│
├── domain/                 # Domain Layer (Business Rules)
│   ├── entities/           # Domain entities with business logic
│   │   ├── Student.ts      # Student entity
│   │   ├── Todo.ts         # Todo entity
│   │   └── Exam.ts         # Exam entity
│   ├── value-objects/      # Immutable value objects
│   │   ├── Priority.ts     # Priority value object
│   │   ├── Email.ts        # Email value object
│   │   └── Score.ts        # Score value object
│   ├── data-sources/       # DataSource interfaces (DIP)
│   │   └── IDataSource.ts  # Database abstraction interface
│   └── repositories/       # Repository interfaces (DIP)
│       ├── IStudentRepository.ts
│       └── ITodoRepository.ts
│
├── infrastructure/         # Infrastructure Layer
│   ├── data-sources/       # DataSource implementations
│   │   ├── SupabaseDataSource.ts   # Supabase wrapper
│   │   └── MockDataSource.ts       # Test mock
│   ├── database/           # Concrete repository implementations
│   │   ├── student.repository.ts
│   │   ├── attendance.repository.ts
│   │   └── base.repository.ts
│   └── external/           # External service integrations
│
├── components/             # UI Components
│   ├── ui/                 # shadcn/ui base components
│   ├── layout/             # Layout components (navbar, sidebar)
│   ├── features/           # Feature-specific components
│   │   ├── students/       # Student-related components
│   │   ├── attendance/     # Attendance-related components
│   │   └── dashboard/      # Dashboard widgets
│   └── auth/               # Auth-related components
│
├── lib/                    # Utilities and Helpers
│   ├── supabase/           # Supabase client helpers
│   │   ├── client.ts       # Client-side Supabase client
│   │   ├── server.ts       # Server-side Supabase client
│   │   └── middleware.ts   # Auth middleware
│   ├── utils.ts            # General utilities (cn, etc.)
│   ├── validators.ts       # Zod schemas
│   ├── constants.ts        # App constants
│   ├── error-types.ts      # Custom error classes
│   └── error-handlers.ts   # Error handling utilities
│
├── types/                  # TypeScript Types
│   ├── database.types.ts   # Generated Supabase types
│   └── *.types.ts          # Domain-specific types
│
└── hooks/                  # Custom React Hooks
    ├── use-*.ts            # Custom hooks
    └── use-student-detail.tsx  # Context-based hooks
```

### Critical Architectural Patterns

#### 1. **Use Case Pattern with Dependency Injection**

All business logic is encapsulated in Use Cases, instantiated via Factory functions with DataSource abstraction:

```typescript
// Server-side factory (src/application/factories/studentUseCaseFactory.ts)
import { createServerDataSource } from '@/lib/data-source-provider'

export async function createCreateStudentUseCase(config?: DataSourceConfig) {
  const dataSource = await createServerDataSource(config)
  const repository = new StudentRepository(dataSource)
  return new CreateStudentUseCase(repository)
}

// Client-side factory (src/application/factories/studentUseCaseFactory.client.ts)
import { createClientDataSource } from '@/lib/data-source-provider'

export function createGetStudentsUseCase(config?: DataSourceConfig) {
  const dataSource = createClientDataSource(config)
  const repository = new StudentRepository(dataSource)
  return new GetStudentsUseCase(repository)
}

// Usage in Production
const useCase = await createCreateStudentUseCase()
const result = await useCase.execute(studentData)

// Usage in Tests (with Mock)
const useCase = await createCreateStudentUseCase({ forceMock: true })
const result = await useCase.execute(testData)
```

**Key Points:**
- Server factories are async (await createServerDataSource)
- Client factories are sync (createClientDataSource)
- Factories handle all dependency wiring including DataSource
- Use Cases are never instantiated directly in components
- Tests can inject MockDataSource via config parameter

#### 2. **Domain Entities with Business Logic**

Entities encapsulate domain rules and validation:

```typescript
// src/domain/entities/Todo.ts
export class Todo {
  static create(props: TodoCreateProps): Todo {
    // Entity creation with validation
    const priority = Priority.fromLevel(props.priority)
    return new Todo({ ...props, priority })
  }

  complete(): void {
    if (this.isVerified()) {
      throw new DomainError('Cannot modify verified todo')
    }
    this.props.completedAt = new Date()
  }

  isOverdue(): boolean {
    return !this.props.completedAt && this.props.dueDate < new Date()
  }
}
```

**Never put business logic in:**
- Components (Presentation Layer)
- Repositories (Infrastructure Layer)
- API routes (Presentation Layer)

#### 3. **DataSource Abstraction for Testability**

DataSource 추상화 계층으로 Supabase에 대한 강한 결합을 제거하고 테스트 가능성을 향상:

```typescript
// Domain interface (src/domain/data-sources/IDataSource.ts)
export interface IDataSource {
  from<T>(table: string): IQueryBuilder<T>
  rpc<T>(fn: string, params?: object): Promise<{ data: T | null; error: Error | null }>
}

// Infrastructure implementations
// 1. Production (src/infrastructure/data-sources/SupabaseDataSource.ts)
export class SupabaseDataSource implements IDataSource {
  constructor(private client: SupabaseClient) {}
  // Supabase 클라이언트를 래핑
}

// 2. Testing (src/infrastructure/data-sources/MockDataSource.ts)
export class MockDataSource implements IDataSource {
  private store: Map<string, Map<string, any>> = new Map()
  // In-memory 테스트 데이터
  seed(table: string, data: any[]): void { ... }
}

// Usage in Tests
const mockDataSource = createMockDataSource()
mockDataSource.seed('students', [testData])
const useCase = createGetStudentsUseCase({ customDataSource: mockDataSource })
```

**Key Benefits:**
- Mock DataSource로 네트워크 없이 유닛 테스트 작성 가능
- 환경별(local/staging/production) 쉬운 전환
- 필요시 다른 데이터베이스로 교체 가능 (PostgreSQL, MySQL 등)
- Repository는 IDataSource만 의존 (Dependency Inversion)

**더 자세한 내용:** `docs/DATASOURCE_ABSTRACTION.md` 참조

#### 4. **Repository Pattern with Interface Segregation**

Repositories implement domain interfaces for dependency inversion:

```typescript
// Domain interface (src/domain/repositories/IStudentRepository.ts)
export interface IStudentRepository {
  findById(id: string): Promise<Student | null>
  save(student: Student): Promise<void>
}

// Infrastructure implementation (src/infrastructure/database/student.repository.ts)
export class StudentRepository implements IStudentRepository {
  private dataSource: IDataSource

  // IDataSource 또는 SupabaseClient 모두 받을 수 있음 (하위 호환성)
  constructor(client: IDataSource | SupabaseClient) {
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  async findById(id: string): Promise<Student | null> {
    const { data } = await this.dataSource
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    return data ? Student.fromDatabase(data) : null
  }
}
```

#### 5. **Multi-tenant Security (RLS)**

All database access is automatically scoped by tenant:

- RLS policies enforce tenant isolation at database level
- Helper functions: `get_current_tenant_id()`, `get_current_user_role()`
- Every table has `tenant_id` column
- PII data stored in separate `*_pii` tables with encryption
- **Never bypass RLS** - all queries automatically filtered

```sql
-- Example RLS policy
CREATE POLICY "Students are viewable by tenant members"
ON students FOR SELECT
USING (tenant_id = get_current_tenant_id());
```

#### 6. **Server/Client Separation**

Critical distinction between server and client DataSource providers:

```typescript
// Server-side (Server Components, API routes, Server Actions)
import { createServerDataSource } from '@/lib/data-source-provider'
const dataSource = await createServerDataSource() // Async, uses cookies()

// Client-side (Client Components)
import { createClientDataSource } from '@/lib/data-source-provider'
const dataSource = createClientDataSource() // Sync, uses browser storage
```

**Rules:**
- Server Components: Use server factory with await
- Client Components: Use client factory, React Query for caching
- API routes: Use server factory
- Server Actions: Use server factory
- Tests: Inject MockDataSource via config parameter

#### 7. **Component Organization**

```
components/
├── ui/              # shadcn/ui primitives (Button, Dialog, etc.)
├── layout/          # Page structure (Navbar, Sidebar, PageWrapper)
├── features/        # Domain-specific components
│   ├── students/    # Student list, forms, dialogs
│   │   └── detail/  # Student detail tabs
│   ├── attendance/  # Attendance components
│   └── dashboard/   # Dashboard widgets
└── auth/            # Auth forms, loading states
```

**Component Rules:**
- Use `'use client'` only when necessary (forms, animations, interactivity)
- Prefer Server Components for data fetching
- Extract reusable patterns to `components/ui`
- Feature components should use Use Cases, not direct DB calls

#### 8. **Custom Hooks Location**

All custom hooks and context providers belong in `src/hooks/`:

```typescript
// src/hooks/use-student-detail.tsx (Context + Hook)
export function StudentDetailProvider({ value, children }) {
  return <StudentDetailContext.Provider value={value}>
    {children}
  </StudentDetailContext.Provider>
}

export function useStudentDetail() {
  const context = useContext(StudentDetailContext)
  if (!context) throw new Error('Must be used within provider')
  return context
}
```

**Never create:**
- `src/contexts/` directory (use hooks/ instead)
- `src/providers/` directory (use hooks/ instead)

### Database Design Principles

- **UUID v7** for all IDs (time-ordered, indexable)
- **Soft deletes**: `deleted_at` timestamp on all tables
- **Audit trail**: `created_at`, `updated_at` standard fields
- **Reference codes**: Avoid ENUMs, use `ref_code` and `tenant_code` tables
- **Time integrity**: UTC timestamps (`timestamptz`), display with tenant timezone
- **Data types**:
  - Money: `BIGINT` (won units)
  - Scores: `NUMERIC(5,2)`
  - Emails: `citext` (case-insensitive)
  - Phones: `text` with E.164 validation
- **Partitioning**: Monthly partitions for high-volume tables (attendance, messages)
- **Indexes**: Covering indexes with tenant_id, partial indexes for soft deletes

### Security Model

- **Authentication**: Supabase Auth JWT → `auth.users.id` maps to `users.id`
- **Authorization**: Role-based access control via RLS policies
- **Roles**: `owner`, `instructor`, `assistant`, `parent`, `student`
- **PII Protection**: Separate `*_pii` tables, accessed via SECURITY DEFINER functions
- **Tenant Isolation**: All queries automatically scoped by `tenant_id` via RLS

## Development Guidelines

### TypeScript Rules

- **Strict mode enabled** - no implicit any
- Avoid `any` - use `unknown` and type guards if needed
- Document `any` usage with `// TODO(any): reason` if unavoidable
- Prefer type inference over explicit types when clear
- Use Zod for runtime validation and type inference

### Code Style

- **Server Components by default** - only use `'use client'` when needed
- **File naming**:
  - Components: `PascalCase.tsx`
  - Hooks: `use*.ts` or `use*.tsx`
  - Utils: `camelCase.ts`
  - Use Cases: `*UseCase.ts`
  - Repositories: `*.repository.ts`
  - Factories: `*UseCaseFactory.ts` or `*UseCaseFactory.client.ts`
- **No color hardcoding** - use Tailwind tokens (e.g., `bg-background`)
- **Extract reusable patterns** to `components/ui`

### Where to Put Code

**Business Logic** → `application/use-cases/`
- Never in components, API routes, or repositories
- Use Case classes handle orchestration
- Entities contain domain rules

**Data Access** → `infrastructure/database/`
- Implement domain repository interfaces
- Only database operations, no business logic
- Extend BaseRepository for common operations

**UI Components** → `components/`
- Presentational only, no business logic
- Call Use Cases via factories
- Use hooks for state and side effects

**Utilities** → `lib/`
- Pure functions only
- No business logic
- No database access

**Types** → `types/` or `domain/`
- Database types in `types/database.types.ts` (generated)
- Domain types with entities in `domain/entities/`
- Shared types in `types/*.types.ts`

### State Management

- **SSR/ISR**: Use Server Components for lists, reports, dashboards
- **CSR with React Query**: Use for interactive forms, real-time updates
- **Server Actions**: Preferred for mutations with proper revalidation
- **Context**: Use sparingly, only for UI state propagation (see hooks/)

### Error Handling

- User-facing errors: Short, actionable messages (e.g., "권한이 없습니다")
- Server logging: Structured JSON with context (`console.error({ tag, err, ctx })`)
- Custom error types in `lib/error-types.ts`:
  - `ValidationError` - Invalid input
  - `AuthorizationError` - Permission denied
  - `NotFoundError` - Resource not found
  - `DatabaseError` - Database operation failed
  - `DomainError` - Business rule violation

### Testing Strategy

- **Unit tests**: `src/lib/*.test.ts` with Vitest
- **E2E tests**: `tests/e2e/*.spec.ts` with Playwright
- **Test data**: Use `supabase/migrations/03_sample_data.sql` fixtures
- Test Use Cases in isolation by mocking repositories

### Git Workflow

- **Branch naming**: `feature/*`, `fix/*`, `chore/*`
- **Commits**: Follow Conventional Commits
  - `feat: 학생 등록 폼 추가`
  - `fix: RLS 정책 누락 수정`
  - `chore: 리포지토리 구조 개선`
- **PRs**: Include summary, migration file links if schema changed, screenshots

### Database Migrations

- **Location**: `supabase/migrations/`
- **Naming**: `YYYYMMDDNNNNNN_descriptive_name.sql` (timestamp + sequence)
- **Application**: Apply via Supabase dashboard SQL Editor or `supabase db push`
- **Include**: Schema + RLS policies in each migration
- **Strategy**: Two-phase column additions for zero-downtime:
  1. Add nullable column
  2. Populate data
  3. Add constraint
  4. Remove old column

## Common Patterns

### Adding a New Feature

1. **Define Domain Layer**:
   - Create entity in `domain/entities/`
   - Create value objects in `domain/value-objects/`
   - Define repository interface in `domain/repositories/`

2. **Implement Infrastructure**:
   - Create repository in `infrastructure/database/`
   - Implement interface with Supabase queries

3. **Create Use Cases**:
   - Create use cases in `application/use-cases/[domain]/`
   - One use case per action (Create, Update, Delete, Get)

4. **Add Factories**:
   - Server factory in `application/factories/`
   - Client factory in `application/factories/*.client.ts`

5. **Build UI**:
   - Create components in `components/features/[domain]/`
   - Use factories to get use cases
   - Never import use cases or repositories directly

6. **Add Database Migration**:
   - Create migration in `supabase/migrations/`
   - Include schema and RLS policies
   - Test locally with `supabase db reset`

### Accessing Data in Components

```typescript
// ❌ BAD: Direct database access in component
const { data } = await supabase.from('students').select()

// ❌ BAD: Direct use case instantiation
const useCase = new GetStudentsUseCase(repository)

// ✅ GOOD: Use factory in Server Component
const useCase = await createGetStudentsUseCase()
const students = await useCase.execute()

// ✅ GOOD: Use factory in Client Component with React Query
const useCase = createGetStudentsUseCase()
const { data: students } = useQuery({
  queryKey: ['students'],
  queryFn: () => useCase.execute()
})
```

### Handling Forms

```typescript
// Define Zod schema
const studentSchema = z.object({
  name: z.string().min(1),
  grade: z.string(),
})

// Use React Hook Form
const form = useForm<z.infer<typeof studentSchema>>({
  resolver: zodResolver(studentSchema),
})

// Submit with Server Action or Use Case
async function onSubmit(data: z.infer<typeof studentSchema>) {
  const useCase = createCreateStudentUseCase()
  await useCase.execute(data)
}
```

## Async Widgets & Error Handling Strategy

### Overview

The project implements a **granular error handling and loading state management** strategy using React Suspense and Error Boundaries. This allows each widget to load independently and fail gracefully without affecting the entire page.

**Key Benefits:**
- 🔥 **Isolated Failures** - One widget failure doesn't crash the entire page
- ⚡ **Progressive Loading** - Fast data loads immediately, heavy data streams in
- 🎯 **Better UX** - Users see partial content instead of blank pages
- 🛡️ **Resilient** - Error boundaries catch and display errors gracefully

### Demo Page

Visit `/dashboard/demo` to see the pattern in action with real examples.

### Core Components

1. **ErrorFallback** (`src/components/ui/error-fallback.tsx`)
   - Multiple variants: `default`, `compact`, `inline`, `full-page`
   - Specialized fallbacks: `WidgetErrorFallback`, `ListItemErrorFallback`, `SectionErrorFallback`

2. **WidgetSkeleton** (`src/components/ui/widget-skeleton.tsx`)
   - Loading states for different widget types: `stats`, `list`, `chart`, `calendar`, `table`
   - Utility skeletons: `CompactWidgetSkeleton`, `KPIGridSkeleton`, `InlineSkeleton`

3. **WidgetErrorBoundary** (`src/components/features/dashboard/widget-error-boundary.tsx`)
   - Wrapper using `react-error-boundary` library
   - Handles error logging and reset functionality

### Usage Pattern

```tsx
// 1. Create async Server Component
async function MyWidgetContent() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('table').select('*')
  if (error) throw new Error('Failed to load data')
  return <Card>{data}</Card>
}

// 2. Wrap with Error Boundary and Suspense
export function MyWidgetAsync() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
      )}
    >
      <Suspense fallback={<WidgetSkeleton variant="list" />}>
        <MyWidgetContent />
      </Suspense>
    </ErrorBoundary>
  )
}

// 3. Use in page
export default function Page() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <MyWidgetAsync />
      <AnotherWidgetAsync />
    </div>
  )
}
```

### Hybrid Approach (Recommended)

Combine fast RPC calls with independent async widgets:

```tsx
export default async function DashboardPage() {
  // Fast data - single RPC call
  const { data: kpiData } = await supabase.rpc('get_kpi_data')

  return (
    <div>
      {/* Fast widgets - render immediately */}
      <KPICards data={kpiData} />

      {/* Heavy widgets - stream independently */}
      <div className="grid grid-cols-2 gap-6">
        <RecentActivityFeedAsync />
        <ComplexAnalyticsWidgetAsync />
      </div>
    </div>
  )
}
```

### When to Use

✅ **Use async widgets for:**
- Slow queries (complex joins, large datasets)
- Independent data that can fail gracefully
- Real-time/frequently updated data
- Optional features (user can work without them)

❌ **Don't use async widgets for:**
- Fast data (KPIs, simple queries)
- Critical data (required for page function)
- Data with dependencies between widgets

### Examples

**Live examples:**
- `src/components/features/dashboard/recent-activity-feed-async.tsx`
- `src/components/features/dashboard/recent-students-card-async.tsx`
- `src/components/features/dashboard/async-widget-example.tsx`

**Documentation:**
- `docs/error-and-loading-strategy.md` - Detailed guide with patterns
- `docs/ASYNC_WIDGETS_GUIDE.md` - Quick start guide

## Important Files

- `docs/DATASOURCE_ABSTRACTION.md` - **NEW** - DataSource abstraction and testing guide
- `docs/DEPLOYMENT_GUIDE.md` - Complete deployment guide for Local/Staging/Production
- `docs/error-and-loading-strategy.md` - Error handling strategy
- `docs/ASYNC_WIDGETS_GUIDE.md` - Async widgets quick start
- `internal/tech/Architecture.md` - System architecture and deployment
- `internal/tech/ERD.md` - Database schema design principles
- `internal/tech/CodeGuideline.md` - Detailed coding standards (Korean)
- `internal/product/PRD.md` - Product requirements and priorities
- `components.json` - shadcn/ui configuration
- `vitest.config.ts` - Test configuration
- `playwright.config.ts` - E2E test configuration
- `src/lib/env.ts` - Type-safe environment variables validation
