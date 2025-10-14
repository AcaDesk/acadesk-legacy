-- ============================================================
-- 02) Schema
-- ------------------------------------------------------------
-- Purpose: Define all database tables in correct dependency order
-- Prerequisites: 01_extensions.sql
-- ============================================================

-- ============================================================
-- Reference: Roles
-- ============================================================
create table if not exists public.ref_roles(
  code text primary key,
  label text not null,
  description text,
  sort_order int default 0,
  active boolean default true
);

insert into public.ref_roles(code,label,description,sort_order,active) values
  ('owner','Owner','학원 원장',1,true),
  ('teacher','Teacher','강사',2,true),
  ('ta','Teaching Assistant','조교',3,true)
on conflict (code) do update
  set label=excluded.label, description=excluded.description,
      sort_order=excluded.sort_order, active=true;

-- ============================================================
-- Core: Tenants & Users
-- ============================================================
create table if not exists public.tenants(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'Asia/Seoul',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_tenants_created on public.tenants(created_at desc);

create table if not exists public.users(
  id uuid primary key, -- same as auth.users.id
  tenant_id uuid references public.tenants(id) on delete cascade,
  email text,
  name text not null,
  role_code text references public.ref_roles(code),
  phone text,
  avatar_url text,
  approval_status text default 'approved',
  approved_at timestamptz,
  approved_by uuid,
  onboarding_completed boolean default false,
  onboarding_completed_at timestamptz,
  settings jsonb default '{}'::jsonb,
  preferences jsonb default '{}'::jsonb,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);
create index if not exists idx_users_tenant_role on public.users(tenant_id, role_code);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_prefs_gin on public.users using gin (preferences);

-- ============================================================
-- Invitations (Staff)
-- ============================================================
create table if not exists public.tenant_invitations(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  email text,
  role_code text not null references public.ref_roles(code),
  token text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid,
  accepted_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_inv_tenant_status_due on public.tenant_invitations(tenant_id, status, expires_at desc);
create index if not exists idx_inv_email on public.tenant_invitations(email);

-- ============================================================
-- Students / Guardians / Link
-- ============================================================
create table if not exists public.students(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  student_code text not null,
  name text not null,
  grade text,
  school text,
  enrollment_date date default current_date,
  gender text check (gender in ('male','female','other')),
  student_phone text,
  emergency_contact text,
  commute_method text,
  marketing_source text,
  notes text,
  meta jsonb not null default '{}'::jsonb,
  birth_date date,
  profile_image_url text,
  kiosk_pin text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, student_code)
);
create index if not exists idx_students_tenant_created on public.students(tenant_id, created_at desc);
create index if not exists idx_students_enrollment_date on public.students(enrollment_date);
create index if not exists idx_students_gender on public.students(gender);
create index if not exists idx_students_trgm_name on public.students using gin (name gin_trgm_ops) where deleted_at is null;

create table if not exists public.guardians(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  relationship text,
  emergency_phone text,
  occupation text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.student_guardians(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  is_primary boolean not null default false,
  can_pickup boolean not null default true,
  can_view_reports boolean not null default true,
  relation text,
  created_at timestamptz not null default now(),
  unique (student_id, guardian_id)
);
create index if not exists idx_sg_tenant_student on public.student_guardians(tenant_id, student_id);
create unique index if not exists uq_student_primary_guardian on public.student_guardians(student_id) where is_primary;

-- ============================================================
-- Subjects
-- ============================================================
create table if not exists public.subjects(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  code text,
  color text not null default '#3b82f6',
  sort_order int not null default 0,
  active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, code)
);
create index if not exists idx_subjects_tenant_sort on public.subjects(tenant_id, active, sort_order);

-- ============================================================
-- Classes / Enrollments / Attendance
-- ============================================================
create table if not exists public.classes(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text,
  instructor_id uuid references public.users(id),
  subject text,
  subject_id uuid references public.subjects(id) on delete set null,
  grade_level text,
  capacity int,
  schedule jsonb,
  room text,
  status text not null default 'active',
  active boolean not null default true,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_classes_tenant_status on public.classes(tenant_id, status);
create index if not exists idx_classes_instructor on public.classes(instructor_id);
create index if not exists idx_classes_subject_id on public.classes(subject_id);

create table if not exists public.class_enrollments(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  end_date date,
  withdrawal_reason text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, student_id)
);
create index if not exists idx_enroll_tenant_class_student on public.class_enrollments(tenant_id, class_id, student_id);
create index if not exists idx_enroll_end_date on public.class_enrollments(tenant_id, end_date);

create table if not exists public.attendance_sessions(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  session_date date not null,
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  status text not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_att_sess_tenant_date on public.attendance_sessions(tenant_id, session_date desc);

create table if not exists public.attendance(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null check (status in ('present','absent','late','left_early')),
  check_in_at timestamptz,
  check_out_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);
create index if not exists idx_att_tenant_session_student on public.attendance(tenant_id, session_id, student_id);

-- ============================================================
-- Student Schedules
-- ============================================================
create table if not exists public.student_schedules(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  scheduled_arrival_time time without time zone not null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, day_of_week)
);
create index if not exists idx_sched_tenant_student on public.student_schedules(tenant_id, student_id);
create index if not exists idx_sched_active on public.student_schedules(tenant_id, active);

-- ============================================================
-- TODOs & Templates
-- ============================================================
create table if not exists public.student_todos(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  description text,
  subject text,
  due_date date,
  due_day_of_week int check (due_day_of_week between 0 and 6),
  priority text not null default 'normal',
  completed_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_todos_tenant_due on public.student_todos(tenant_id, due_date);
create index if not exists idx_todos_student on public.student_todos(student_id);
create index if not exists idx_todos_completed on public.student_todos(tenant_id, completed_at);
create index if not exists idx_todos_verified on public.student_todos(tenant_id, verified_at);

create table if not exists public.todo_templates(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  subject text,
  day_of_week int check (day_of_week between 0 and 6),
  estimated_duration_minutes int,
  priority text not null default 'normal',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_tmpl_tenant_active on public.todo_templates(tenant_id, active, day_of_week);

-- ============================================================
-- Notifications & Activity Logs
-- ============================================================
create table if not exists public.in_app_notifications(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text,
  message text,
  reference_type text,
  reference_id uuid,
  action_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user_created on public.in_app_notifications(user_id, created_at desc);

create table if not exists public.student_activity_logs(
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  activity_type text not null,
  activity_date timestamptz not null default now(),
  title text,
  description text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists idx_logs_student on public.student_activity_logs(tenant_id, student_id, created_at desc);