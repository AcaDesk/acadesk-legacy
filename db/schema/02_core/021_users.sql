-- 021_users.sql
create table if not exists public.users (
  id                       uuid primary key default uuid_generate_v4(),
  tenant_id                uuid references public.tenants (id),
  email                    citext,
  name                     text not null,
  phone                    text,
  role_code                text references public.ref_roles (code),
  onboarding_completed     boolean not null default false,
  onboarding_completed_at  timestamptz,
  approval_status          text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  approval_reason          text,
  approved_at              timestamptz,
  approved_by              uuid,
  settings                 jsonb not null default '{}'::jsonb,
  preferences              jsonb not null default '{}'::jsonb,
  address                  text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz
);

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'users_email_key') then
    alter table public.users drop constraint users_email_key;
  end if;
exception when others then null;
end $$;

drop index if exists idx_users_email;
create unique index if not exists uq_users_email_active
  on public.users (email)
  where deleted_at is null;

drop index if exists uq_users_email_active;
create unique index if not exists uq_users_email_active
  on public.users (email)
  where deleted_at is null and email is not null; 

create index if not exists idx_users_tenant_role on public.users (tenant_id, role_code) where deleted_at is null;
create index if not exists idx_users_approval    on public.users (approval_status)       where deleted_at is null;