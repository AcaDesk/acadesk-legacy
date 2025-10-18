-- 024_staff_invites.sql
create table if not exists public.staff_invites (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  email        citext not null,
  role_code    text not null check (role_code in ('instructor','assistant')),
  token        text not null unique,
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  created_by   uuid references public.users(id),
  created_at   timestamptz not null default now()
);

alter table public.staff_invites enable row level security;

-- 만든 사람 또는 같은 테넌트의 오너/강사만 조회
drop policy if exists staff_inv_select on public.staff_invites;
create policy staff_inv_select
  on public.staff_invites
  for select
  using (
    tenant_id = public.current_user_tenant_id()
    and (
      public.current_user_role() in ('owner','instructor')
      or created_by = auth.uid()
    )
  );

-- 오너/강사만 초대 생성 가능
drop policy if exists staff_inv_insert on public.staff_invites;
create policy staff_inv_insert
  on public.staff_invites
  for insert
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );

-- 만료/수락 마킹(업데이트)도 동일 권한
drop policy if exists staff_inv_update on public.staff_invites;
create policy staff_inv_update
  on public.staff_invites
  for update
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );

grant select, insert, update on public.staff_invites to authenticated;

create index if not exists idx_staff_inv_tenant_email on public.staff_invites(tenant_id, email);
create index if not exists idx_staff_inv_expires on public.staff_invites(expires_at);