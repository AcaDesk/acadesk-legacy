-- 040_notifications.sql
create table if not exists public.in_app_notifications(
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  user_id        uuid not null references public.users(id) on delete cascade,
  type           text not null,
  title          text,
  message        text,
  reference_type text,
  reference_id   uuid,
  action_url     text,
  is_read        boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists idx_notif_user_created on public.in_app_notifications(user_id, created_at desc);