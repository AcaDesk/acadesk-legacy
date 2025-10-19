-- 043_consultations.sql — Student consultations
create table if not exists public.consultations (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants(id) on delete cascade,
  student_id         uuid not null references public.students(id) on delete cascade,
  consultation_date  date not null,
  consultation_type  text,
  content            text,
  instructor_id      uuid references public.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create index if not exists idx_consult_tenant_date on public.consultations(tenant_id, consultation_date desc) where deleted_at is null;
create index if not exists idx_consult_student     on public.consultations(student_id) where deleted_at is null;

alter table public.consultations enable row level security;
drop policy if exists consult_select_same_tenant on public.consultations;
create policy consult_select_same_tenant
  on public.consultations
  for select using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists consult_write_staff on public.consultations;
create policy consult_write_staff
  on public.consultations
  for all using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));
