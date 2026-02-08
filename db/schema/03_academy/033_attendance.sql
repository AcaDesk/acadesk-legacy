-- 033_attendance.sql
create table if not exists public.attendance_sessions(
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants(id) on delete cascade,
  class_id           uuid not null references public.classes(id) on delete cascade,
  session_date       date not null,
  scheduled_start_at timestamptz,
  scheduled_end_at   timestamptz,
  actual_start_at    timestamptz,
  actual_end_at      timestamptz,
  status             text not null default 'scheduled',
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_att_sess_tenant_date on public.attendance_sessions(tenant_id, session_date desc);

-- Compatibility column for certain APIs: start_time derived from scheduled_start_at
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='attendance_sessions' and column_name='start_time'
  ) then
    alter table public.attendance_sessions add column start_time time;
    update public.attendance_sessions
      set start_time = (scheduled_start_at at time zone 'UTC')::time
      where scheduled_start_at is not null;
  end if;
end $$;

create table if not exists public.attendance(
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  session_id    uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  status        text not null check (status in ('present','absent','late','excused','left_early')),
  check_in_at   timestamptz,
  check_out_at  timestamptz,
  notes         text,
  -- optional denormalized date for analytics/reporting (nullable; not required by app)
  attendance_date date,
  notification_sent_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (session_id, student_id)
);
create index if not exists idx_att_tenant_session_student on public.attendance(tenant_id, session_id, student_id);

-- Keep attendance_date aligned with the session's date (for day-based reporting).
create or replace function public.set_attendance_date_from_session()
returns trigger
language plpgsql
as $$
begin
  select s.session_date
    into new.attendance_date
    from public.attendance_sessions s
   where s.id = new.session_id;

  return new;
end;
$$;

drop trigger if exists trg_set_attendance_date on public.attendance;
create trigger trg_set_attendance_date
before insert or update of session_id on public.attendance
for each row
execute function public.set_attendance_date_from_session();

-- If a session date changes, keep linked attendance dates in sync.
create or replace function public.sync_attendance_dates_on_session_update()
returns trigger
language plpgsql
as $$
begin
  if new.session_date is distinct from old.session_date then
    update public.attendance
       set attendance_date = new.session_date
     where session_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_attendance_dates on public.attendance_sessions;
create trigger trg_sync_attendance_dates
after update of session_date on public.attendance_sessions
for each row
execute function public.sync_attendance_dates_on_session_update();

-- Backfill existing rows (idempotent).
update public.attendance a
set attendance_date = s.session_date
from public.attendance_sessions s
where a.session_id = s.id
  and a.attendance_date is null;


-- RLS: attendance_sessions
alter table public.attendance_sessions enable row level security;

drop policy if exists attendance_sessions_select_same_tenant on public.attendance_sessions;
create policy attendance_sessions_select_same_tenant
  on public.attendance_sessions
  for select using (tenant_id = public.current_user_tenant_id());

drop policy if exists attendance_sessions_write_staff on public.attendance_sessions;
create policy attendance_sessions_write_staff
  on public.attendance_sessions
  for all using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner', 'instructor', 'assistant')
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner', 'instructor', 'assistant')
  );

-- RLS: attendance
alter table public.attendance enable row level security;

drop policy if exists attendance_select_same_tenant on public.attendance;
create policy attendance_select_same_tenant
  on public.attendance
  for select using (tenant_id = public.current_user_tenant_id());

drop policy if exists attendance_write_staff on public.attendance;
create policy attendance_write_staff
  on public.attendance
  for all using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner', 'instructor', 'assistant')
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner', 'instructor', 'assistant')
  );
