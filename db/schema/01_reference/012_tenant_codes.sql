-- 012_tenant_codes.sql — Optional per-tenant code lists
create table if not exists public.tenant_codes (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid references public.tenants(id) on delete cascade,
  code_type  text not null,
  code       text not null,
  label      text,
  sort_order int not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_tenant_codes on public.tenant_codes(tenant_id, code_type, code);
alter table public.tenant_codes enable row level security;

drop policy if exists tenant_codes_select_same_tenant on public.tenant_codes;
create policy tenant_codes_select_same_tenant
  on public.tenant_codes
  for select using (tenant_id = public.current_user_tenant_id());

drop policy if exists tenant_codes_write_owner on public.tenant_codes;
create policy tenant_codes_write_owner
  on public.tenant_codes
  for all using (tenant_id = public.current_user_tenant_id() and public.is_owner())
  with check (tenant_id = public.current_user_tenant_id() and public.is_owner());

grant select on table public.tenant_codes to authenticated;
