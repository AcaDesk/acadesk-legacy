-- 031_classes.sql
create table if not exists public.classes(
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  name           text not null,
  description    text,
  instructor_id  uuid references public.users(id) on delete set null,
  subject        text,
  subject_id     uuid references public.subjects(id) on delete set null,
  grade_level    text,
  capacity       int,
  schedule       jsonb,
  room           text,
  status         text not null default 'active',
  active         boolean not null default true,
  meta           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create index if not exists idx_classes_tenant_status on public.classes(tenant_id, status) where deleted_at is null;
create index if not exists idx_classes_active       on public.classes(tenant_id, active)  where deleted_at is null;
create index if not exists idx_classes_instructor   on public.classes(instructor_id)      where deleted_at is null;
create index if not exists idx_classes_subject_id   on public.classes(subject_id)         where deleted_at is null;