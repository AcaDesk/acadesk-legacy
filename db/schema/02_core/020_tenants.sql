-- 020_tenants.sql
create table if not exists public.tenants (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  slug       text unique not null,
  timezone   text not null default 'Asia/Seoul',
  settings   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_tenants_slug    on public.tenants (slug) where deleted_at is null;
create index if not exists idx_tenants_deleted on public.tenants (deleted_at);