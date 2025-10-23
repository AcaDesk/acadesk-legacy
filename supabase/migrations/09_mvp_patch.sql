-- ============================================================
-- PATCH: Add missing tables / FKs / RLS for MVP v1
-- Safe to run after your MVP v1 migration
-- ============================================================

-- 확장 (이미 있으면 스킵)
create extension if not exists "pg_trgm";

-- ------------------------------------------------------------
-- 1) Subjects
-- ------------------------------------------------------------
create table if not exists public.subjects(
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  name       text not null,
  code       text,
  color      text not null default '#3b82f6',
  sort_order int not null default 0,
  active     boolean not null default true,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, code)
);

create index if not exists idx_subjects_tenant_sort
  on public.subjects(tenant_id, active, sort_order);

-- ------------------------------------------------------------
-- 2) Classes
-- ------------------------------------------------------------
create table if not exists public.classes(
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  name           text not null,
  description    text,
  instructor_id  uuid references public.users(id) on delete set null,
  subject        text,
  subject_id     uuid references public.subjects(id) on delete set null,
  grade_level    text,
  capacity       int,
  schedule       jsonb,
  room           text,
  status         text not null default 'active',
  active         boolean not null default true,
  meta           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create index if not exists idx_classes_tenant_status
  on public.classes(tenant_id, status) where deleted_at is null;
create index if not exists idx_classes_active
  on public.classes(tenant_id, active) where deleted_at is null;
create index if not exists idx_classes_instructor
  on public.classes(instructor_id) where deleted_at is null;
create index if not exists idx_classes_subject_id
  on public.classes(subject_id) where deleted_at is null;

-- ------------------------------------------------------------
-- 3) Class Enrollments (학생-수업 연결)
-- ------------------------------------------------------------
create table if not exists public.class_enrollments(
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants(id) on delete cascade,
  class_id           uuid not null references public.classes(id) on delete cascade,
  student_id         uuid not null references public.students(id) on delete cascade,
  enrolled_at        timestamptz not null default now(),
  end_date           date,
  withdrawal_reason  text,
  notes              text,
  status             text not null default 'active',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (class_id, student_id)
);

create index if not exists idx_enroll_tenant_class_student
  on public.class_enrollments(tenant_id, class_id, student_id);
create index if not exists idx_enroll_end_date
  on public.class_enrollments(tenant_id, end_date);

-- ------------------------------------------------------------
-- 4) Attendance Sessions & Attendance
-- ------------------------------------------------------------
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

create index if not exists idx_att_sess_tenant_date
  on public.attendance_sessions(tenant_id, session_date desc);

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

create index if not exists idx_att_tenant_session_student
  on public.attendance(tenant_id, session_id, student_id);

-- ------------------------------------------------------------
-- 5) Guardians & Link (보호자)
-- ------------------------------------------------------------
create table if not exists public.guardians(
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  user_id           uuid references public.users(id) on delete set null,
  relationship      text,
  emergency_phone   text,
  occupation        text,
  address           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists idx_guardians_tenant
  on public.guardians(tenant_id) where deleted_at is null;

create table if not exists public.student_guardians(
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null references public.tenants(id) on delete cascade,
  student_id             uuid not null references public.students(id) on delete cascade,
  guardian_id            uuid not null references public.guardians(id) on delete cascade,
  is_primary_contact     boolean not null default false,
  can_pickup             boolean not null default true,
  can_view_reports       boolean not null default true,
  relation               text,
  receives_notifications boolean not null default true,
  receives_billing       boolean not null default false,
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz,
  created_at             timestamptz not null default now(),
  unique (student_id, guardian_id)
);

create index if not exists idx_sg_tenant_student
  on public.student_guardians(tenant_id, student_id);
create unique index if not exists uq_student_primary_guardian
  on public.student_guardians(student_id) where is_primary_contact;

-- ------------------------------------------------------------
-- 6) Student Schedules (요일별 도착 예정 시간)
-- ------------------------------------------------------------
create table if not exists public.student_schedules(
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

create index if not exists idx_sched_tenant_student
  on public.student_schedules(tenant_id, student_id);
create index if not exists idx_sched_active
  on public.student_schedules(tenant_id, active);

-- ------------------------------------------------------------
-- 7) Todo Templates (반복 템플릿)
-- ------------------------------------------------------------
create table if not exists public.todo_templates(
  id                         uuid primary key default gen_random_uuid(),
  tenant_id                  uuid not null references public.tenants(id) on delete cascade,
  title                      text not null,
  description                text,
  subject                    text,
  day_of_week                int check (day_of_week between 0 and 6),
  estimated_duration_minutes int,
  priority                   text not null default 'normal'
                               check (priority in ('low','normal','high','urgent')),
  active                     boolean not null default true,
  created_at                 timestamptz not null default now()
);

create index if not exists idx_tmpl_tenant_active
  on public.todo_templates(tenant_id, active, day_of_week);

-- ------------------------------------------------------------
-- 8) Notifications & Activity Logs
-- ------------------------------------------------------------
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

create index if not exists idx_notif_user_created
  on public.in_app_notifications(user_id, created_at desc);

create table if not exists public.student_activity_logs(
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  activity_type text not null,
  activity_date timestamptz not null default now(),
  title         text,
  description   text,
  created_by    uuid references public.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists idx_logs_student
  on public.student_activity_logs(tenant_id, student_id, created_at desc);

-- ------------------------------------------------------------
-- 9) RLS (enable + 최소 조회 정책) - 존재 시 스킵
-- ------------------------------------------------------------
alter table public.subjects              enable row level security;
alter table public.classes               enable row level security;
alter table public.class_enrollments     enable row level security;
alter table public.attendance_sessions   enable row level security;
alter table public.attendance            enable row level security;
alter table public.guardians             enable row level security;
alter table public.student_guardians     enable row level security;
alter table public.student_schedules     enable row level security;
alter table public.todo_templates        enable row level security;
alter table public.in_app_notifications  enable row level security;
alter table public.student_activity_logs enable row level security;

do $$
begin
  -- subjects
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subjects' and policyname='subjects_select_same_tenant') then
    create policy subjects_select_same_tenant on public.subjects
      for select using (tenant_id = public.current_user_tenant_id());
  end if;

  -- classes
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='classes' and policyname='classes_select_same_tenant') then
    create policy classes_select_same_tenant on public.classes
      for select using (tenant_id = public.current_user_tenant_id());
  end if;

  -- class_enrollments
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='class_enrollments' and policyname='enroll_select_same_tenant') then
    create policy enroll_select_same_tenant on public.class_enrollments
      for select using (tenant_id = public.current_user_tenant_id());
  end if;

  -- attendance_sessions
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='attendance_sessions' and policyname='att_sess_select_same_tenant') then
    create policy att_sess_select_same_tenant on public.attendance_sessions
      for select using (tenant_id = public.current_user_tenant_id());
  end if;

  -- attendance
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='attendance' and policyname='attendance_select_same_tenant') then
    create policy attendance_select_same_tenant on public.attendance
      for select using (tenant_id = public.current_user_tenant_id());
  end if;

  -- guardians
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='guardians' and policyname='guardians_select_same_tenant') then
    create policy guardians_select_same_tenant on public.guardians
      for select using (tenant_id = public.current_user_tenant_id());
  end if;

  -- student_guardians
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='student_guardians' and policyname='sg_select_same_tenant') then
    create policy sg_select_same_tenant on public.student_guardians
      for select using (tenant_id = public.current_user_tenant_id());
  end if;

  -- student_schedules
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='student_schedules' and policyname='sched_select_same_tenant') then
    create policy sched_select_same_tenant on public.student_schedules
      for select using (tenant_id = public.current_user_tenant_id());
  end if;

  -- todo_templates
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='todo_templates' and policyname='tmpl_select_same_tenant') then
    create policy tmpl_select_same_tenant on public.todo_templates
      for select using (tenant_id = public.current_user_tenant_id());
  end if;

  -- in_app_notifications (자기 자신만)
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='in_app_notifications' and policyname='notif_select_same_user_tenant') then
    create policy notif_select_same_user_tenant on public.in_app_notifications
      for select using (tenant_id = public.current_user_tenant_id() and user_id = auth.uid());
  end if;

  -- student_activity_logs
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='student_activity_logs' and policyname='logs_select_same_tenant') then
    create policy logs_select_same_tenant on public.student_activity_logs
      for select using (tenant_id = public.current_user_tenant_id());
  end if;
end $$;

-- ------------------------------------------------------------
-- 10) Grants (읽기 권한만; RLS로 제한)
-- ------------------------------------------------------------
grant usage on schema public to authenticated;

grant select on table
  public.subjects,
  public.classes,
  public.class_enrollments,
  public.attendance_sessions,
  public.attendance,
  public.guardians,
  public.student_guardians,
  public.student_schedules,
  public.todo_templates,
  public.in_app_notifications,
  public.student_activity_logs
to authenticated;

-- ------------------------------------------------------------
-- 11) Schema cache reload (PostgREST)
-- ------------------------------------------------------------
select pg_notify('pgrst', 'reload schema');