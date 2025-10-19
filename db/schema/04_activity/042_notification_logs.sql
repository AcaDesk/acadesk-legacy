-- 042_notification_logs.sql
create table if not exists public.notification_logs (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid references public.tenants(id) on delete set null,
  student_id         uuid references public.students(id) on delete set null,
  session_id         uuid references public.attendance_sessions(id) on delete set null,
  notification_type  text not null check (notification_type in ('sms','email')),
  status             text not null check (status in ('sent','failed')),
  message            text not null,
  error_message      text,
  sent_at            timestamptz not null,
  created_at         timestamptz not null default now()
);

create index if not exists idx_notif_logs_student      on public.notification_logs(student_id, sent_at desc);
create index if not exists idx_notif_logs_tenant_type  on public.notification_logs(tenant_id, notification_type);

alter table public.notification_logs enable row level security;

drop policy if exists notif_logs_select_same_tenant on public.notification_logs;
create policy notif_logs_select_same_tenant
  on public.notification_logs
  for select using (tenant_id is null or tenant_id = public.current_user_tenant_id());

drop policy if exists notif_logs_insert_same_tenant on public.notification_logs;
create policy notif_logs_insert_same_tenant
  on public.notification_logs
  for insert with check (
    coalesce(tenant_id, public.current_user_tenant_id()) = public.current_user_tenant_id()
  );

grant select, insert on table public.notification_logs to authenticated;
