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

create table if not exists public.attendance(
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  session_id    uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  status        text not null check (status in ('present','absent','late','left_early')),
  check_in_at   timestamptz,
  check_out_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (session_id, student_id)
);
create index if not exists idx_att_tenant_session_student on public.attendance(tenant_id, session_id, student_id);