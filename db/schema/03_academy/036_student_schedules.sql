create table if not exists public.student_schedules (
  id                         uuid primary key default gen_random_uuid(),
  tenant_id                  uuid not null references public.tenants(id) on delete cascade,
  student_id                 uuid not null references public.students(id) on delete cascade,
  day_of_week                int not null check (day_of_week between 0 and 6),
  scheduled_arrival_time     time without time zone not null,
  notes                      text,
  active                     boolean not null default true,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (student_id, day_of_week)
);

create index if not exists idx_sched_tenant_student on public.student_schedules(tenant_id, student_id);
create index if not exists idx_sched_active         on public.student_schedules(tenant_id, active);