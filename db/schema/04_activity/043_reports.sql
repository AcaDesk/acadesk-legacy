-- 043_reports.sql
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  report_type  text not null check (report_type in ('weekly','monthly')),
  period_start date not null,
  period_end   date not null,
  content      jsonb not null,
  generated_at timestamptz not null default now(),
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists idx_reports_tenant_period on public.reports(tenant_id, period_start, period_end) where deleted_at is null;
create index if not exists idx_reports_student        on public.reports(student_id) where deleted_at is null;
