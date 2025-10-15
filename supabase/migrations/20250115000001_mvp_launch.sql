-- ============================================================
-- MVP Launch Migration (1차 출시)
-- ------------------------------------------------------------
-- 목적: 학생관리 + TODO관리 + 대시보드를 위한 최소 스키마 및 RLS
-- 포함 기능:
--   1. Extensions
--   2. 핵심 테이블 (tenants, users, students, student_todos)
--   3. Helper 함수
--   4. Triggers
--   5. 최소 RLS 정책
-- ============================================================

-- ============================================================
-- 1) Extensions
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "btree_gin";

-- ============================================================
-- 2) Reference: Roles
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
-- 3) Core Tables
-- ============================================================

-- Tenants
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

-- Users
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

-- Students
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

-- Student TODOs
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

-- ============================================================
-- 4) Helper Functions
-- ============================================================

-- Updated_at 자동 갱신용 트리거 함수
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- 멱등성 키 저장 테이블 (중복 요청 방지용)
create table if not exists public.idempotency_keys(
  tenant_id uuid not null,
  key text not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, key)
);

-- 현재 로그인된 사용자의 tenant_id 반환
create or replace function public.current_user_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.users where id = auth.uid()
$$;

-- 멱등성 키 검사 함수
create or replace function public.ensure_once(_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.idempotency_keys(tenant_id, key)
  values (public.current_user_tenant_id(), _key);
exception
  when unique_violation then
    raise exception 'duplicate submission';
end
$$;

-- 현재 로그인된 사용자의 role_code 반환
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_code from public.users where id = auth.uid()
$$;

-- Owner 여부 확인
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(role_code = 'owner', false) from public.users where id = auth.uid()
$$;

-- Teacher 여부 확인
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(role_code = 'teacher', false) from public.users where id = auth.uid()
$$;

-- TA 여부 확인
create or replace function public.is_ta()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(role_code = 'ta', false) from public.users where id = auth.uid()
$$;

-- Staff 여부 확인 (owner, teacher, ta 모두 포함)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(role_code in ('owner','teacher','ta'), false) from public.users where id = auth.uid()
$$;

-- 이메일을 소문자/공백제거로 정규화
create or replace function public.normalize_email(_email text)
returns text
language sql
immutable
as $$
  select case when _email is null then null else lower(trim(_email)) end
$$;

-- 소셜로그인(Google, Kakao 등 포함) 기준 대표 이메일 추출
create or replace function public.primary_email(_auth_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_identities jsonb;
begin
  select email, identities
  into v_email, v_identities
  from auth.users
  where id = _auth_user_id;

  v_email := public.normalize_email(v_email);
  if v_email is not null then
    return v_email;
  end if;

  if v_identities is not null then
    v_email := public.normalize_email(
      (select (i->'identity_data'->>'email')
         from jsonb_array_elements(v_identities) i
        where (i->>'provider') = 'google'
        limit 1)
    );
    if v_email is not null then
      return v_email;
    end if;

    v_email := public.normalize_email(
      (select (i->'identity_data'->>'email')
         from jsonb_array_elements(v_identities) i
        where (i->>'provider') = 'kakao'
        limit 1)
    );
    if v_email is not null then
      return v_email;
    end if;
  end if;

  return null;
end
$$;

-- ============================================================
-- 5) Triggers
-- ============================================================

-- Tenants updated_at trigger
drop trigger if exists update_tenants_updated_at on public.tenants;
create trigger update_tenants_updated_at
  before update on public.tenants
  for each row
  execute function public.update_updated_at_column();

-- Users updated_at trigger
drop trigger if exists update_users_updated_at on public.users;
create trigger update_users_updated_at
  before update on public.users
  for each row
  execute function public.update_updated_at_column();

-- Students updated_at trigger
drop trigger if exists update_students_updated_at on public.students;
create trigger update_students_updated_at
  before update on public.students
  for each row
  execute function public.update_updated_at_column();

-- Student TODOs updated_at trigger
drop trigger if exists update_student_todos_updated_at on public.student_todos;
create trigger update_student_todos_updated_at
  before update on public.student_todos
  for each row
  execute function public.update_updated_at_column();

-- ============================================================
-- 6) Row Level Security (RLS) - 최소 정책
-- ============================================================

-- Enable RLS
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.student_todos enable row level security;

-- ============================================================
-- Tenants RLS
-- ============================================================
drop policy if exists tenants_self_read on public.tenants;
create policy tenants_self_read
  on public.tenants
  for select
  using (id = public.current_user_tenant_id());

-- ============================================================
-- Users RLS (온보딩 예외 포함)
-- ============================================================

-- 조회: 본인 또는 같은 테넌트
drop policy if exists users_self_select on public.users;
create policy users_self_select
  on public.users
  for select
  using (
    id = auth.uid()
    or tenant_id = public.current_user_tenant_id()
  );

-- 수정: 본인만 (온보딩 중에는 tenant_id 설정 가능, owner 역할은 수정 불가)
drop policy if exists users_self_update on public.users;
create policy users_self_update
  on public.users
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and (
      tenant_id is null
      or onboarding_completed is false
      or tenant_id = public.current_user_tenant_id()
    )
    and coalesce(role_code,'') <> 'owner'
  );

-- 수정: 스태프가 다른 사용자 수정 (owner 제외)
drop policy if exists users_staff_update on public.users;
create policy users_staff_update
  on public.users
  for update
  using (
    tenant_id = public.current_user_tenant_id()
    and public.is_staff()
    and role_code <> 'owner'
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and coalesce(role_code,'') <> 'owner'
  );

-- 수정: Owner는 모든 사용자 수정 가능
drop policy if exists users_owner_update_any on public.users;
create policy users_owner_update_any
  on public.users
  for update
  using (tenant_id = public.current_user_tenant_id() and public.is_owner())
  with check (tenant_id = public.current_user_tenant_id());

-- ============================================================
-- Students RLS
-- ============================================================

-- 조회: 같은 테넌트
drop policy if exists students_read_same_tenant on public.students;
create policy students_read_same_tenant
  on public.students
  for select
  using (tenant_id = public.current_user_tenant_id());

-- 생성: 스태프만
drop policy if exists students_insert_staff on public.students;
create policy students_insert_staff
  on public.students
  for insert
  with check (tenant_id = public.current_user_tenant_id() and public.is_staff());

-- 수정: 스태프만
drop policy if exists students_update_staff on public.students;
create policy students_update_staff
  on public.students
  for update
  using (tenant_id = public.current_user_tenant_id() and public.is_staff())
  with check (tenant_id = public.current_user_tenant_id());

-- 삭제: Owner만
drop policy if exists students_delete_owner_only on public.students;
create policy students_delete_owner_only
  on public.students
  for delete
  using (tenant_id = public.current_user_tenant_id() and public.is_owner());

-- ============================================================
-- Student TODOs RLS
-- ============================================================

-- 조회: 스태프는 모든 TODO 조회 가능
drop policy if exists todos_staff_read_same_tenant on public.student_todos;
create policy todos_staff_read_same_tenant
  on public.student_todos
  for select
  using (
    tenant_id = public.current_user_tenant_id()
    and (public.is_owner() or public.is_teacher() or public.is_ta())
  );

-- 조회: 학생은 본인 TODO만
drop policy if exists todos_student_read_self on public.student_todos;
create policy todos_student_read_self
  on public.student_todos
  for select
  using (
    tenant_id = public.current_user_tenant_id()
    and exists (
      select 1 from public.students s
      where s.id = student_id and s.user_id = auth.uid()
    )
  );

-- 생성: Owner, Teacher만
drop policy if exists todos_insert_teacher_plus on public.student_todos;
create policy todos_insert_teacher_plus
  on public.student_todos
  for insert
  with check (
    tenant_id = public.current_user_tenant_id()
    and (public.is_owner() or public.is_teacher())
  );

-- 수정: Owner, Teacher만
drop policy if exists todos_update_teacher_plus on public.student_todos;
create policy todos_update_teacher_plus
  on public.student_todos
  for update
  using (
    tenant_id = public.current_user_tenant_id()
    and (public.is_owner() or public.is_teacher())
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and (public.is_owner() or public.is_teacher())
  );

-- 수정: 학생은 본인 TODO 완료 처리만 가능 (verified_at은 수정 불가)
drop policy if exists todos_student_complete_self on public.student_todos;
create policy todos_student_complete_self
  on public.student_todos
  for update
  using (
    tenant_id = public.current_user_tenant_id()
    and exists (
      select 1 from public.students s
      where s.id = student_id and s.user_id = auth.uid()
    )
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and exists (
      select 1 from public.students s
      where s.id = student_id and s.user_id = auth.uid()
    )
    and verified_at is null
  );

-- 삭제: Owner, Teacher만
drop policy if exists todos_delete_teacher_plus on public.student_todos;
create policy todos_delete_teacher_plus
  on public.student_todos
  for delete
  using (
    tenant_id = public.current_user_tenant_id()
    and (public.is_owner() or public.is_teacher())
  );

-- ============================================================
-- 완료!
-- ============================================================
