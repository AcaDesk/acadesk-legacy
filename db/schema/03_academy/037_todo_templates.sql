-- 037_todo_templates.sql
create table if not exists public.todo_templates (
  id                         uuid primary key default gen_random_uuid(),
  tenant_id                  uuid not null references public.tenants(id) on delete cascade,
  title                      text not null,
  description                text,
  subject                    text,
  estimated_duration_minutes int,
  priority                   text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  active                     boolean not null default true,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create index if not exists idx_tmpl_tenant_active on public.todo_templates(tenant_id, active);
create index if not exists idx_tmpl_tenant_subject on public.todo_templates(tenant_id, subject);
