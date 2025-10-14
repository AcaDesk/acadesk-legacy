# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/` using Next.js App Router.
  - `src/app/` routes and API (`src/app/api/*`).
  - `src/components/` UI (shadcn/ui + Tailwind). Components are PascalCase; route folders are kebab-case.
  - `src/services/` domain logic (`*.service.ts`) and data access (`*.repository.ts`).
  - `src/lib/` utilities (e.g., `src/lib/supabase/*`), `src/hooks/`, `src/contexts/`, `src/types/`.
- Assets: `public/`.
- Tooling: `eslint.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`.
- Backend config: `supabase/` (migrations, docs). See `SETUP.md` and `SUPABASE_AUTH_SETUP.md`.

## Build, Test, and Development Commands
- `pnpm dev`: Run Next.js dev server (Turbopack) at `http://localhost:3000`.
- `pnpm build`: Production build.
- `pnpm start`: Start production server.
- `pnpm lint`: Run ESLint (`next/core-web-vitals` + TypeScript rules).
- `pnpm test`: Run Vitest in watch mode (jsdom + Testing Library).
- `pnpm test:run` / `pnpm test:ui`: CI-style run / UI runner.

## Coding Style & Naming Conventions
- Language: TypeScript, React 19, Next.js 15 (App Router).
- Formatting: Follow ESLint config; adhere to `STYLEGUIDE.md` for UI patterns, spacing, and color tokens.
- Naming: Components `PascalCase.tsx`; hooks `use-*.ts`; route folders/files kebab-case; services `*.service.ts`; repositories `*.repository.ts`.
- Imports: Use `@` alias for `src/` (see `vitest.config.ts`).

## Testing Guidelines
- Framework: Vitest + `@testing-library/react` with jsdom.
- Location: Co-locate as `*.test.ts(x)` next to units (e.g., `src/lib/utils.test.ts`).
- Setup: `vitest.config.ts` references `src/test/setup.ts` (add if missing for Testing Library globals).
- Coverage: Prefer meaningful unit tests for services and utils; add basic render tests for complex components.

## Commit & Pull Request Guidelines
- Commits: Use short, imperative messages. Prefer existing convention: `[Feat]`, `[Fix]`, `[Chore]`, `[Docs]` (optionally add scope), e.g., `[Feat]: 학생 관리 페이지 개선`.
- PRs: Include description, linked issues (e.g., `Closes #123`), screenshots/GIFs for UI changes, and test notes. Ensure `pnpm lint` and `pnpm build` pass.

## Security & Configuration Tips
- Secrets: Never commit `.env.local`; start from `.env.example`.
- Supabase: Apply migrations in `supabase/migrations/*` and enable RLS per `SETUP.md`. Do not expose service role keys to the client.
