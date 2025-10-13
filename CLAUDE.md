# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Acadesk Web** is a SaaS platform for academy (cram school) management built with Next.js 15, TypeScript, Supabase, and Tailwind CSS. The system helps academies manage students, attendance, grades, reports, and learning activities with a focus on operational efficiency and parent satisfaction.

## Commands

### Development
```bash
pnpm dev              # Run development server with Turbopack
pnpm build            # Build for production with Turbopack
pnpm start            # Start production server
pnpm lint             # Run ESLint
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

See `SETUP.md` for detailed database setup and first-time migration instructions.

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

### Clean Architecture Layers

The codebase follows Clean Architecture principles with clear separation:

```
src/
├── app/                    # Next.js App Router (Presentation Layer)
│   ├── (dashboard)/        # Dashboard routes (grouped)
│   ├── api/                # API route handlers
│   └── auth/               # Authentication pages
│
├── application/            # Application Layer (Use Cases)
│   └── use-cases/          # Business logic orchestration
│
├── domain/                 # Domain Layer (Business Logic)
│   ├── entities/           # Core business entities
│   └── value-objects/      # Domain value objects
│
├── infrastructure/         # Infrastructure Layer
│   ├── database/           # Database implementations
│   └── external/           # External service integrations
│
├── repositories/           # Data Access Layer
│   └── *Repository.ts      # Repository implementations
│
├── services/               # Application Services
│   └── *.service.ts        # Domain services
│
├── components/             # UI Components
│   ├── ui/                 # shadcn/ui base components
│   ├── layout/             # Layout components
│   ├── features/           # Feature-specific components
│   └── auth/               # Auth-related components
│
├── lib/                    # Utilities and Helpers
│   ├── supabase/           # Supabase client helpers
│   ├── utils.ts            # General utilities (cn, etc.)
│   ├── validators.ts       # Zod schemas
│   ├── constants.ts        # App constants
│   ├── errors.ts           # Custom error classes
│   └── query-builder.ts    # Query utilities
│
├── types/                  # TypeScript Types
│   ├── database.types.ts   # Generated Supabase types
│   └── *.ts                # Domain types
│
└── hooks/                  # Custom React Hooks
```

### Key Architectural Patterns

1. **Multi-tenant Security (RLS)**
   - All database access enforced through Supabase Row Level Security
   - Helper functions: `get_current_tenant_id()`, `get_current_user_role()`
   - Every table has `tenant_id` for data isolation
   - PII data in separate `*_pii` tables with encryption

2. **Server/Client Separation**
   - Use `@/lib/supabase/server.ts` for Server Components and API routes
   - Use `@/lib/supabase/client.ts` for Client Components
   - Middleware handles auth session updates via `@/lib/supabase/middleware.ts`

3. **Component Library (shadcn/ui)**
   - Configured via `components.json`
   - Path aliases: `@/components`, `@/lib`, `@/components/ui`, `@/hooks`
   - Base color: slate with CSS variables for theming
   - Icons: Lucide React, Tabler Icons

4. **Forms & Validation**
   - React Hook Form for form state management
   - Zod schemas for runtime validation
   - Type inference with `z.infer<typeof schema>`
   - Server Actions for form submission

5. **Data Fetching**
   - Server Components: Direct Supabase calls with SSR/ISR
   - Client Components: React Query for caching and optimistic updates
   - Server Actions for mutations with proper revalidation

### Database Design Principles

From `internal/tech/ERD.md` and `internal/tech/CodeGuideline.md`:

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

### Code Style
- **Server Components by default** - only use `'use client'` when needed
- **File naming**:
  - Components: `PascalCase.tsx`
  - Hooks: `use*.ts`
  - Utils: `camelCase.ts`
- **No color hardcoding** - use Tailwind tokens (e.g., `bg-background`)
- **Extract reusable patterns** to `components/ui`

### State Management
- **SSR/ISR**: Use Server Components for lists, reports, dashboards
- **CSR with React Query**: Use for interactive forms, real-time updates
- **Server Actions**: Preferred for mutations with proper revalidation

### Error Handling
- User-facing errors: Short, actionable messages (e.g., "권한이 없습니다")
- Server logging: Structured JSON with context (`console.error({ tag, err, ctx })`)
- Production: Integrate Sentry/Logflare for monitoring

### Testing Strategy
- **Unit tests**: `src/lib/*.test.ts` with Vitest
- **E2E tests**: `tests/e2e/*.spec.ts` with Playwright
- **Test data**: Use `supabase/migrations/03_sample_data.sql` fixtures

### Git Workflow
- **Branch naming**: `feature/*`, `fix/*`, `chore/*`
- **Commits**: Follow Conventional Commits
  - `feat: 학생 등록 폼 추가`
  - `fix: RLS 정책 누락 수정`
- **PRs**: Include summary, migration file links if schema changed, screenshots

### Database Migrations
- **Location**: `supabase/migrations/`
- **Naming**: `YYYYMMDDNNNNNN_descriptive_name.sql` (timestamp + sequence)
- **Application**: Apply via Supabase dashboard SQL Editor (see SETUP.md) or `supabase db push`
- **Include**: Schema + RLS policies in each migration
- **Strategy**: Two-phase column additions for zero-downtime (add nullable → populate → add constraint → remove old)

## Business Context

From `internal/product/PRD.md`:

### Priority Roadmap
- **P0 (Weeks 1-2)**: Grade report automation (score entry → auto-calculation + graphs + PDF)
- **P1 (Weeks 3-5)**: Student management, attendance, exams, auto-notifications, todo lists
- **P2 (Weeks 6-8)**: Materials/progress tracking, consultations, library lending
- **P3 (Future)**: Parent portal/app, billing/subscriptions, AI analytics, MDM integration

### Core Features
- **Students**: Registration, profile management, enrollment tracking
- **Attendance**: Session-based tracking with late/absence rules, parent notifications
- **Grades**: Exam score entry (30/32 format), auto-calculation, trend graphs
- **Reports**: Weekly/monthly automated reports with charts, PDF export, parent delivery
- **Todo Lists**: Student tasks by day/week, completion tracking, parent visibility
- **Materials**: Textbook management, progress tracking
- **Library**: Book lending with barcode/ISBN support

### Success Metrics
- 80% reduction in report creation time
- 98%+ report delivery rate
- 50% reduction in data entry time
- 70%+ student todo completion rate
- Scale to 120 students per academy, 50+ concurrent users

## Important Files

- `internal/tech/Architecture.md` - System architecture and deployment
- `internal/tech/ERD.md` - Database schema design principles
- `internal/tech/CodeGuideline.md` - Detailed coding standards
- `internal/product/PRD.md` - Product requirements and priorities
- `SETUP.md` - Database setup and migration instructions
- `components.json` - shadcn/ui configuration
- `vitest.config.ts` - Test configuration
