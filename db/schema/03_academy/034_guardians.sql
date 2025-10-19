create table if not exists public.guardians (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  user_id       uuid references public.users(id) on delete set null, -- 보호자 계정 (선택)
  name          text not null,
  phone         text,
  email         citext,
  relationship  text, -- 모/부/조모 등
  occupation    text,
  address       text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists idx_guardians_tenant       on public.guardians(tenant_id) where deleted_at is null;
create index if not exists idx_guardians_tenant_phone on public.guardians(tenant_id, phone) where deleted_at is null;
create index if not exists idx_guardians_tenant_email on public.guardians(tenant_id, email) where deleted_at is null;