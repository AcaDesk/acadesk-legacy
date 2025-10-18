-- 030_subjects.sql
create table if not exists public.subjects(
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  name       text not null,
  code       text,
  color      text not null default '#3b82f6',
  sort_order int not null default 0,
  active     boolean not null default true,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, code)
);

create unique index if not exists uq_subjects_tenant_code_active
  on public.subjects(tenant_id, code)
  where deleted_at is null and code is not null;

create index if not exists idx_subjects_tenant_sort on public.subjects(tenant_id, active, sort_order);
create index if not exists idx_subjects_tenant_active_sort on public.subjects(tenant_id, active, deleted_at, sort_order);