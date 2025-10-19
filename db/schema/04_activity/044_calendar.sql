-- 044_calendar.sql — Calendar Events
create table if not exists public.calendar_events (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade,
  title                 text not null,
  description           text,
  event_type            text not null default 'event',
  start_at              timestamptz not null,
  end_at                timestamptz not null,
  all_day               boolean not null default false,
  color                 text,
  class_id              uuid references public.classes(id) on delete set null,
  student_id            uuid references public.students(id) on delete set null,
  guardian_id           uuid references public.guardians(id) on delete set null,
  exam_id               uuid references public.exams(id) on delete set null,
  consultation_id       uuid references public.consultations(id) on delete set null,
  recurrence_rule       text,
  recurrence_exception  text[],
  parent_event_id       uuid references public.calendar_events(id) on delete cascade,
  reminder_minutes      int,
  meta                  jsonb not null default '{}'::jsonb,
  created_by            uuid references public.users(id) on delete set null,
  updated_by            uuid references public.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);

create index if not exists idx_calendar_tenant_time on public.calendar_events(tenant_id, start_at, end_at) where deleted_at is null;
create index if not exists idx_calendar_type          on public.calendar_events(event_type);

alter table public.calendar_events enable row level security;
drop policy if exists calendar_select_same_tenant on public.calendar_events;
create policy calendar_select_same_tenant
  on public.calendar_events
  for select using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists calendar_write_staff on public.calendar_events;
create policy calendar_write_staff
  on public.calendar_events
  for all using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));
