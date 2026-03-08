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
- **Framework**: Next.js 15 with App Router, React Server Components, Turbopack
- **Language**: TypeScript with strict mode enabled
- **Database**: Supabase (PostgreSQL 15) with Row Level Security (RLS)
- **Auth**: Supabase Auth with JWT-based authentication
- **Styling**: Tailwind CSS v4 with CSS variables, shadcn/ui components
- **State**: React Query (@tanstack/react-query) for server state + **Zustand** for global UI/page state
- **Forms**: React Hook Form with Zod validation
- **Testing**: Vitest + Testing Library (unit), Playwright (e2e)
- **Package Manager**: pnpm

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Main dashboard routes
│   │   ├── attendance/     # Attendance management
│   │   ├── batch/          # Batch messaging
│   │   ├── classes/        # Class management
│   │   ├── consultations/  # Consultation management
│   │   ├── dashboard/      # Dashboard home
│   │   ├── grades/         # Grade management
│   │   ├── guardians/      # Guardian management
│   │   ├── library/        # Book lending
│   │   ├── notifications/  # Notification center
│   │   ├── payments/       # Payment management
│   │   ├── reports/        # Learning reports
│   │   ├── settings/       # Academy settings
│   │   ├── staff/          # Staff management
│   │   ├── students/       # Student management
│   │   ├── textbooks/      # Textbook management
│   │   └── todos/          # Todo / self-study management
│   ├── (auth)/             # Auth routes
│   ├── admin/              # Platform admin (approval management)
│   ├── api/                # API route handlers
│   ├── kiosk/              # Kiosk mode (tablet attendance check-in)
│   └── actions/            # Server Actions (all data mutations/queries)
│       ├── students/       # Student actions (split by concern)
│       ├── reports/        # Report actions
│       ├── messaging/      # Messaging actions
│       ├── batch/          # Batch job actions
│       └── grades/         # Grade actions
│
├── core/                   # Domain types and interfaces
│   ├── domain/             # Domain interfaces
│   │   ├── data-sources/   # IDataSource interface
│   │   └── messaging/      # IMessageProvider interface
│   └── types/              # TypeScript domain types (*.types.ts)
│
├── infra/                  # Infrastructure implementations
│   └── messaging/          # SMS/Kakao message providers
│
├── components/             # UI Components
│   ├── ui/                 # shadcn/ui base components
│   ├── layout/             # Layout components (navbar, sidebar)
│   ├── features/           # Domain-specific components
│   └── auth/               # Auth-related components
│
├── lib/                    # Utilities and helpers
│   ├── supabase/           # Supabase clients
│   │   ├── client.ts       # Client-side Supabase client
│   │   ├── server.ts       # Server-side Supabase client (cookie-based)
│   │   └── service-role.ts # Service role client (bypasses RLS)
│   ├── auth/               # Auth helpers and permission checks
│   ├── features.config.ts  # Feature flags
│   ├── server-action-helpers.ts  # withServerAction wrapper
│   ├── server-action-types.ts    # ServerActionResult types
│   ├── error-types.ts      # Custom error classes
│   ├── validators.ts       # Zod schemas
│   └── constants.ts        # App constants
│
└── hooks/                  # Custom React hooks and context providers
```

### Critical Architectural Patterns

#### 1. **Server Action Pattern**

All data access goes through Server Actions in `src/app/actions/`. Actions use `withServerAction` / `withServerActionVoid` wrappers that handle auth and error handling uniformly:

```typescript
// src/app/actions/students/queries.ts
'use server'
import { withServerAction } from '@/lib/server-action-helpers'

export async function getStudents() {
  return withServerAction(async ({ tenantId, serviceClient }) => {
    const { data, error } = await serviceClient
      .from('students')
      .select('*, students_pii(*)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    if (error) throw error
    return data
  }, { actionName: 'getStudents', defaultValue: [] })
}

// Mutations
export async function deleteStudent(id: string) {
  return withServerActionVoid(async ({ tenantId, serviceClient }) => {
    const { error } = await serviceClient
      .from('students')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
    if (error) throw error
  }, { actionName: 'deleteStudent' })
}
```

The wrapper (`src/lib/server-action-helpers.ts`):
- Calls `verifyStaff()` (or `verifyOwner()` / `verifyRole([...])` via `authLevel` option) to authenticate
- Creates `createServiceRoleClient()` which **bypasses RLS** — permission scoping is enforced by always filtering on `tenantId` from the verified session
- Returns `ServerActionResult<T>`: `{ success: true, data, error: null }` or `{ success: false, data: defaultValue, error: string }`

```typescript
// Auth levels
withServerAction(handler, { authLevel: 'staff' })   // default — any staff
withServerAction(handler, { authLevel: 'owner' })   // owner only
withServerAction(handler, { authLevel: ['owner', 'instructor'] })  // specific roles
```

#### 2. **Multi-tenant Security**

Server Actions use `createServiceRoleClient()` (bypasses RLS) but enforce tenant isolation at the application level:
- `verifyStaff()` / `verifyOwner()` returns `{ tenantId, userId, role }` from the verified JWT
- Every query in a Server Action **must** filter by `.eq('tenant_id', tenantId)`
- PII data stored in separate `*_pii` tables, accessed via SECURITY DEFINER functions
- Client-side Supabase calls (for real-time etc.) use the regular client where RLS is active

```sql
-- RLS still enforced for client-side queries
CREATE POLICY "Students viewable by tenant members"
ON students FOR SELECT
USING (tenant_id = get_current_tenant_id());
```

#### 3. **Component Organization**

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

- Use `'use client'` only when necessary (forms, animations, interactivity)
- Prefer Server Components for data fetching
- Feature components call Server Actions directly — no intermediate use-case layer

#### 4. **Custom Hooks Location**

All custom hooks and context providers belong in `src/hooks/`. Never create `src/contexts/` or `src/providers/` directories.

```typescript
// src/hooks/use-student-detail.tsx (Context + Hook together)
export function StudentDetailProvider({ value, children }) {
  return <StudentDetailContext.Provider value={value}>{children}</StudentDetailContext.Provider>
}

export function useStudentDetail() {
  const context = useContext(StudentDetailContext)
  if (!context) throw new Error('Must be used within provider')
  return context
}
```

#### 5. **Async Widgets with Error Boundaries**

Dashboard widgets use React Suspense + Error Boundaries for isolated loading/failure:

```tsx
// Wrap async Server Component with error boundary
export function MyWidgetAsync() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
      )}
    >
      <Suspense fallback={<WidgetSkeleton variant="list" />}>
        <MyWidgetContent />  {/* async Server Component */}
      </Suspense>
    </ErrorBoundary>
  )
}
```

Core components: `ErrorFallback` (`src/components/ui/error-fallback.tsx`), `WidgetSkeleton` (`src/components/ui/widget-skeleton.tsx`), `WidgetErrorBoundary` (`src/components/features/dashboard/widget-error-boundary.tsx`).

Use for slow/optional queries; use direct Server Component data fetching for fast/critical data.

### Database Design Principles

- **UUID v7** for all IDs (time-ordered, indexable)
- **Soft deletes**: `deleted_at` timestamp on all tables
- **Audit trail**: `created_at`, `updated_at` on all tables
- **Reference codes**: Avoid ENUMs, use `ref_code` and `tenant_code` tables
- **Time integrity**: UTC timestamps (`timestamptz`), display with tenant timezone
- **Data types**: Money as `BIGINT` (won), scores as `NUMERIC(5,2)`, emails as `citext`, phones as `text` (E.164)
- **Partitioning**: Monthly partitions for high-volume tables (attendance, messages)
- **Indexes**: Covering indexes with tenant_id, partial indexes for soft deletes

### Security Model

- **Authentication**: Supabase Auth JWT → `auth.users.id` maps to `users.id`
- **Authorization**: `verifyStaff()` / `verifyOwner()` in every Server Action
- **Roles**: `owner`, `instructor`, `assistant`, `parent`, `student`
- **Tenant Isolation**: Server Actions always filter by `tenantId` from verified session
- **PII Protection**: Separate `*_pii` tables, accessed via SECURITY DEFINER functions

## Development Guidelines

### TypeScript Rules

- **Strict mode enabled** — no implicit any
- Avoid `any` — use `unknown` and type guards if needed
- Document `any` usage with `// TODO(any): reason` if unavoidable
- Use Zod for runtime validation and type inference

### Code Style

- **Server Components by default** — only use `'use client'` when needed
- **File naming**:
  - Components: `PascalCase.tsx`
  - Hooks: `use*.ts` or `use*.tsx`
  - Utils: `camelCase.ts`
  - Server Actions: `camelCase.ts` (in `app/actions/`)
- **No color hardcoding** — use Tailwind tokens (e.g., `bg-background`)

### Where to Put Code

**Server Actions** → `app/actions/[domain]/`
- All data fetching and mutations
- Always use `withServerAction` or `withServerActionVoid` wrapper
- Always filter by `tenantId`
- Large action files are split by concern (e.g., `students/queries.ts`, `students/mutations.ts`, `students/bulk.ts`)

**Domain Types** → `core/types/`
- TypeScript types for domain concepts (not Supabase-generated)
- File pattern: `*.types.ts` or plain `*.ts`

**Infrastructure** → `infra/`
- External service implementations (messaging providers)

**UI Components** → `components/`
- Presentational only, no direct database access
- Call Server Actions, use React Query for caching where needed

**Utilities** → `lib/`
- Pure functions, no database access

### State Management

- **Server Components**: Use for lists, reports, dashboards
- **React Query**: Use in Client Components for interactive, cached, or real-time data
- **Server Actions**: Preferred for all mutations with `revalidatePath`/`revalidateTag`
- **Context**: Use sparingly, only for UI state (see `hooks/`)
- **Zustand**: Global UI state that persists across page navigations (sidebar, dashboard settings, dialog state)

#### React Query 규칙

모든 query key는 `src/lib/query-keys.ts`의 `queryKeys` 팩토리에서 중앙 관리합니다:

```typescript
import { queryKeys } from '@/lib/query-keys'

// ✅ GOOD
useQuery({ queryKey: queryKeys.grades.retests() })
queryClient.invalidateQueries({ queryKey: queryKeys.grades.retests() })

// ❌ BAD — 하드코딩된 문자열 배열
useQuery({ queryKey: ['grades', 'retests'] })
```

**데이터 소스별 캐시 전략:**
- **React Query가 소스인 페이지** (retests 등): `invalidateQueries`만 → `router.refresh()` 불필요
- **SSR props가 소스인 페이지** (exams 등): `router.refresh()` + `invalidateQueries` 이중 필요

**mutation 훅 위치**: `src/hooks/mutations/use-*-mutations.ts`
**query 훅 위치**: `src/hooks/queries/use-*-query.ts`

#### Zustand 스토어 (`src/lib/stores/`)

| 파일 | 용도 | persist 키 |
|------|------|------------|
| `ui.store.ts` | 사이드바 접힘, 모바일 메뉴 | `acadesk-ui` (sidebarCollapsed만) |
| `dashboard.store.ts` | 편집 모드, 최대화, KPI 기간, 자동 새로고침 | `acadesk-dashboard` (autoRefreshEnabled, kpiPeriod) |
| `consultation.store.ts` | 다이얼로그 discriminated union | persist 없음 |

**다이얼로그 통합 패턴** — 여러 dialog를 discriminated union으로 통합:
```typescript
// ❌ BAD — 여러 dialogOpen + target 쌍
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

// ✅ GOOD — activeDialog 하나로 통합 (consultation.store.ts 참고)
const { activeDialog, setActiveDialog, closeDialog } = useConsultationStore()
setActiveDialog({ type: 'deleteNote', noteId })
<Dialog open={activeDialog?.type === 'deleteNote'} onOpenChange={(open) => !open && closeDialog()} />
```

#### mutation 표준 패턴

```typescript
// src/hooks/mutations/use-*.ts
export function useDeleteXMutation() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteX(id)
      if (!result.success) throw new Error(result.error || '삭제 실패')  // ServerActionResult 언래핑
    },
    onSuccess: () => toast({ title: '삭제 완료' }),
    onError: (error: Error) => toast({ variant: 'destructive', title: '삭제 오류', description: error.message }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.domain.list() }),
  })
}

// 컴포넌트에서 사용
const deleteMutation = useDeleteXMutation()
// isPending 사용 — actionLoading: string | null 패턴 금지
<Button disabled={deleteMutation.isPending}>...</Button>
<ConfirmationDialog isLoading={deleteMutation.isPending} />
```

**DevTools**: 개발환경에서 좌하단 TanStack Query DevTools 아이콘으로 캐시 상태 확인 가능

### Error Handling

- User-facing errors: Short, actionable messages in Korean (e.g., "권한이 없습니다")
- Server logging: `console.error('[actionName] Error:', error)`
- Custom error types in `lib/error-types.ts`:
  - `ValidationError`, `AuthorizationError`, `NotFoundError`, `DatabaseError`, `DomainError`
- Server Actions always return `ServerActionResult` — never throw to the client

### Testing Strategy

- **Unit tests**: Co-located as `*.test.ts` with Vitest (see `src/app/actions/` for examples)
- **E2E tests**: `tests/e2e/*.spec.ts` with Playwright
- **Test data**: Use `supabase/migrations/` sample data fixtures

### Git Workflow

- **Branch naming**: `feature/*`, `fix/*`, `chore/*`
- **Commits**: **반드시 한국어로 작성** (Conventional Commits 형식)
  - `feat: 학생 등록 폼 추가`
  - `fix: RLS 정책 누락 수정`
  - `feat(알림): 카카오 알림톡 연동 추가`
  - `fix(리포트): 월간 리포트 성적 누락 수정`
- **PRs**: Include summary, migration file links if schema changed, screenshots

### Database Migrations

- **Location**: `supabase/migrations/`
- **Naming**: `YYYYMMDDNNNNNN_descriptive_name.sql`
- **Include**: Schema + RLS policies in each migration
- **Zero-downtime**: Add nullable column → populate data → add constraint → remove old column

## Common Patterns

### Adding a New Feature

1. **Define types** in `core/types/[domain].types.ts`
2. **Create Server Actions** in `app/actions/[domain].ts` using `withServerAction`
3. **Build UI components** in `components/features/[domain]/`
4. **Register feature flag** in `src/lib/features.config.ts` (start with `inactive`)
5. **Add route** in `app/(dashboard)/[domain]/`
6. **Add database migration** in `supabase/migrations/` with schema + RLS policies

### Feature Flags

All features are registered in `src/lib/features.config.ts` with one of five statuses:

| Status | Meaning |
|--------|---------|
| `active` | Fully released, all users can access |
| `beta` | Accessible but marked with beta badge |
| `inactive` | Not yet released — shows "Coming Soon" page |
| `maintenance` | Temporarily down — shows maintenance page |
| `deprecated` | Being phased out — shows deprecation warning |

```typescript
import { isFeatureAvailable, isFeatureBeta } from '@/lib/features.config'

if (!isFeatureAvailable('batchCenter')) redirect('/coming-soon')
{isFeatureBeta('batchCenter') && <Badge>Beta</Badge>}
```

Every new top-level feature/route must have a corresponding feature flag.

### Accessing Data in Components

```typescript
// Server Component — call action directly
export default async function StudentsPage() {
  const result = await getStudents()
  const students = result.success ? result.data : []
  return <StudentList students={students} />
}

// Client Component — use React Query
export function StudentListClient() {
  const { data: result } = useQuery({
    queryKey: ['students'],
    queryFn: () => getStudents(),
  })
  const students = result?.success ? result.data : []
  return <StudentList students={students} />
}
```

### Handling Forms

```typescript
const studentSchema = z.object({ name: z.string().min(1), grade: z.string() })

const form = useForm<z.infer<typeof studentSchema>>({
  resolver: zodResolver(studentSchema),
})

async function onSubmit(data: z.infer<typeof studentSchema>) {
  const result = await createStudent(data)
  if (!result.success) toast({ title: result.error, variant: 'destructive' })
}
```

### Confirmation Dialogs

Always use `ConfirmationDialog` instead of native `confirm()`:

```typescript
import { ConfirmationDialog } from '@ui/confirmation-dialog'

<ConfirmationDialog
  open={deleteDialogOpen}
  onOpenChange={setDeleteDialogOpen}
  title="정말로 삭제하시겠습니까?"
  description="이 작업은 되돌릴 수 없습니다."
  confirmText="삭제"
  variant="destructive"
  isLoading={isDeleting}
  onConfirm={handleConfirmDelete}
/>
```

### Handling Empty States

```typescript
import { EmptyState, NoSearchResultsEmptyState } from '@ui/empty-state'

{filteredData.length === 0 ? (
  searchTerm ? (
    <NoSearchResultsEmptyState searchTerm={searchTerm} onClearSearch={() => setSearchTerm('')} />
  ) : (
    <EmptyState
      icon={Users}
      title="등록된 학생이 없습니다"
      description="새로운 학생을 등록하여 시작하세요"
      action={<Button onClick={handleCreate}>학생 등록</Button>}
    />
  )
) : (
  <StudentList data={filteredData} />
)}
```

## Important Files

### Architecture & Development
- `docs/DEPLOYMENT_GUIDE.md` - Complete deployment guide for Local/Staging/Production
- `docs/error-and-loading-strategy.md` - Error handling and async widget strategy
- `docs/ASYNC_WIDGETS_GUIDE.md` - Async widgets quick start
- `docs/SKELETON_GUIDE.md` - Skeleton and empty state component guide
- `internal/tech/Architecture.md` - System architecture and deployment
- `internal/tech/ERD.md` - Database schema design principles
- `internal/tech/CodeGuideline.md` - Detailed coding standards (Korean)
- `internal/product/PRD.md` - Product requirements and priorities

### Configuration
- `components.json` - shadcn/ui configuration
- `vitest.config.ts` - Test configuration
- `playwright.config.ts` - E2E test configuration
- `src/lib/env.ts` - Type-safe environment variables validation
- `src/lib/features.config.ts` - Feature flags
