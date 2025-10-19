-- 042_class_sessions.sql — Per-class session logs/progress
create table if not exists public.class_sessions (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  class_id         uuid not null references public.classes(id) on delete cascade,
  session_date     date not null,
  topic            text not null,
  content          text,
  homework_assigned text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index if not exists idx_class_sessions_tenant_date on public.class_sessions(tenant_id, session_date desc) where deleted_at is null;
create index if not exists idx_class_sessions_class       on public.class_sessions(class_id) where deleted_at is null;

alter table public.class_sessions enable row level security;
drop policy if exists class_sessions_select_same_tenant on public.class_sessions;
create policy class_sessions_select_same_tenant
  on public.class_sessions
  for select using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists class_sessions_write_staff on public.class_sessions;
create policy class_sessions_write_staff
  on public.class_sessions
  for all using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));
