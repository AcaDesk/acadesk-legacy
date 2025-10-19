-- 040_books.sql
create table if not exists public.books (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  title      text not null,
  author     text,
  barcode    text,
  meta       jsonb not null default '{}'::jsonb,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, barcode)
);

create index if not exists idx_books_tenant_active on public.books(tenant_id, active) where deleted_at is null;
create index if not exists idx_books_barcode       on public.books(barcode) where deleted_at is null;
