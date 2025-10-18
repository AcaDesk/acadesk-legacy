-- 041_student_activity_logs.sql
create table if not exists public.student_activity_logs(
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  activity_type text not null,
  activity_date timestamptz not null default now(),
  title         text,
  description   text,
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists idx_logs_student on public.student_activity_logs(tenant_id, student_id, created_at desc);