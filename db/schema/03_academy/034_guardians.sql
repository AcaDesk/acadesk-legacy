-- 034_guardians.sql
create table if not exists public.guardians(
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  user_id           uuid references public.users(id) on delete set null,
  relationship      text,
  emergency_phone   text,
  occupation        text,
  address           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index if not exists idx_guardians_tenant on public.guardians(tenant_id) where deleted_at is null;

create table if not exists public.student_guardians(
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  student_id        uuid not null references public.students(id) on delete cascade,
  guardian_id       uuid not null references public.guardians(id) on delete cascade,
  is_primary        boolean not null default false,
  can_pickup        boolean not null default true,
  can_view_reports  boolean not null default true,
  relation          text,
  created_at        timestamptz not null default now(),
  unique (student_id, guardian_id)
);
create index if not exists idx_sg_tenant_student on public.student_guardians(tenant_id, student_id);
create unique index if not exists uq_student_primary_guardian on public.student_guardians(student_id) where is_primary;