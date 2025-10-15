-- ============================================================
-- MVP 1차 출시 마이그레이션 (트리거 없음)
-- 기능: 학생 관리, TODO 관리, 대시보드, 키오스크 모드, 회원가입 승인
-- ============================================================

-- ============================================================
-- 1) Extensions
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 2) Reference Tables
-- ============================================================

-- 역할 참조 테이블
create table if not exists public.ref_roles (
  code text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

insert into public.ref_roles (code, name, description) values
  ('owner', '원장', '학원 소유자 및 최고 관리자'),
  ('instructor', '강사', '수업 담당 강사'),
  ('assistant', '조교', '수업 보조 및 행정 업무')
on conflict (code) do nothing;

-- ============================================================
-- 3) Core Tables
-- ============================================================

-- 3-1) 테넌트 (학원)
create table if not exists public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  timezone text not null default 'Asia/Seoul',
  settings jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_tenants_slug on public.tenants(slug) where deleted_at is null;
create index if not exists idx_tenants_deleted_at on public.tenants(deleted_at);

-- 3-2) 사용자
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id),
  email citext unique not null,
  name text not null,
  phone text,
  role_code text references public.ref_roles(code),
  onboarding_completed boolean not null default false,
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  approval_reason text,
  approved_at timestamptz,
  approved_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_users_tenant_id on public.users(tenant_id) where deleted_at is null;
create index if not exists idx_users_email on public.users(email) where deleted_at is null;
create index if not exists idx_users_approval_status on public.users(approval_status) where deleted_at is null;

-- 3-3) 학생
create table if not exists public.students (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id),
  user_id uuid references public.users(id) on delete cascade,
  student_code text unique not null,
  name text not null,
  birth_date date,
  gender text check (gender in ('male', 'female', 'other')),
  student_phone text,
  profile_image_url text,
  grade text,
  school text,
  enrollment_date date default current_date,
  withdrawal_date date,
  emergency_contact text,
  notes text,
  commute_method text,
  marketing_source text,
  kiosk_pin text, -- bcrypt 해시된 PIN
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists idx_students_student_code on public.students(student_code) where deleted_at is null;
create index if not exists idx_students_tenant_id on public.students(tenant_id) where deleted_at is null;
create index if not exists idx_students_grade on public.students(grade) where deleted_at is null;

-- 3-4) 학생 TODO
create table if not exists public.student_todos (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id),
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null,
  description text,
  subject text,
  due_date date not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  estimated_duration_minutes int,
  completed_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_student_todos_tenant_id on public.student_todos(tenant_id) where deleted_at is null;
create index if not exists idx_student_todos_student_id on public.student_todos(student_id) where deleted_at is null;
create index if not exists idx_student_todos_due_date on public.student_todos(due_date) where deleted_at is null;

-- ============================================================
-- 4) Helper Functions
-- ============================================================

-- 4-1) 이메일 추출
create or replace function public.primary_email(user_id uuid)
returns text
language sql
stable
as $$
  select coalesce(
    email,
    raw_user_meta_data->>'email',
    ''
  )::text
  from auth.users
  where id = user_id
$$;

-- 4-2) 현재 사용자의 tenant_id 가져오기
create or replace function public.current_user_tenant_id()
returns uuid
language sql
stable
as $$
  select tenant_id
  from public.users
  where id = auth.uid()
  and deleted_at is null
$$;

-- 4-3) 현재 사용자의 role 가져오기
create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select role_code
  from public.users
  where id = auth.uid()
  and deleted_at is null
$$;

-- ============================================================
-- 5) RPC Functions (트리거 대체)
-- ============================================================

-- 5-1) 회원가입 후 사용자 프로필 생성 (클라이언트에서 호출)
create or replace function public.create_user_profile()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_email text;
  v_exists boolean;
  v_result json;
begin
  -- 현재 인증된 사용자 확인
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'error', '인증되지 않은 사용자입니다.');
  end if;

  -- 이미 프로필이 있는지 확인
  select exists(select 1 from public.users where id = v_user_id) into v_exists;
  if v_exists then
    return json_build_object('success', true, 'message', '이미 프로필이 존재합니다.');
  end if;

  -- auth.users에서 이메일 가져오기
  v_email := public.primary_email(v_user_id);

  -- public.users에 프로필 생성 (pending 상태로)
  insert into public.users(id, email, name, role_code, onboarding_completed, approval_status)
  values (v_user_id, v_email, coalesce(v_email, ''), null, false, 'pending');

  return json_build_object(
    'success', true,
    'message', '프로필이 생성되었습니다. 관리자 승인을 기다려주세요.'
  );

exception
  when others then
    return json_build_object('success', false, 'error', SQLERRM);
end
$$;

grant execute on function public.create_user_profile() to anon, authenticated;

-- 5-2) 사용자 승인 상태 확인
create or replace function public.check_approval_status()
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_status text;
  v_reason text;
  v_tenant_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return json_build_object('success', false, 'error', '인증되지 않은 사용자입니다.');
  end if;

  select approval_status, approval_reason, tenant_id
  into v_status, v_reason, v_tenant_id
  from public.users
  where id = v_user_id
  and deleted_at is null;

  if v_status is null then
    return json_build_object('success', false, 'error', '사용자 정보를 찾을 수 없습니다.');
  end if;

  return json_build_object(
    'success', true,
    'status', v_status,
    'reason', v_reason,
    'tenant_id', v_tenant_id
  );
end
$$;

grant execute on function public.check_approval_status() to authenticated;

-- 5-3) 첫 번째 Owner 계정 생성 (수동 실행)
create or replace function public.create_first_owner(
  p_email text,
  p_name text,
  p_tenant_name text,
  p_tenant_slug text
)
returns json
language plpgsql
security definer
as $$
declare
  v_tenant_id uuid;
  v_user_id uuid;
begin
  -- auth.users에서 사용자 찾기
  select id into v_user_id
  from auth.users
  where email = p_email;

  if v_user_id is null then
    return json_build_object('success', false, 'error', '해당 이메일로 가입된 사용자가 없습니다. 먼저 회원가입을 해주세요.');
  end if;

  -- 테넌트 생성
  insert into public.tenants(name, slug)
  values (p_tenant_name, p_tenant_slug)
  returning id into v_tenant_id;

  -- 사용자를 Owner로 업데이트하고 승인
  update public.users
  set
    tenant_id = v_tenant_id,
    name = p_name,
    role_code = 'owner',
    onboarding_completed = true,
    approval_status = 'approved',
    approved_at = now()
  where id = v_user_id;

  return json_build_object(
    'success', true,
    'message', 'Owner 계정이 생성되었습니다.',
    'tenant_id', v_tenant_id,
    'user_id', v_user_id
  );

exception
  when others then
    return json_build_object('success', false, 'error', SQLERRM);
end
$$;

-- Owner만 실행 가능하도록 제한
grant execute on function public.create_first_owner(text, text, text, text) to authenticated;

-- ============================================================
-- 6) Row Level Security (RLS)
-- ============================================================

-- RLS 활성화
alter table public.tenants       enable row level security;
alter table public.users         enable row level security;
alter table public.students      enable row level security;
alter table public.student_todos enable row level security;

-- ----------------------------
-- Tenants 정책
-- ----------------------------

-- 자신의 테넌트만 조회
create policy "tenants_select_own"
  on public.tenants for select
  using (id = public.current_user_tenant_id());

-- Owner만 수정
create policy "tenants_update_owner"
  on public.tenants for update
  using (
    id = public.current_user_tenant_id()
    and public.current_user_role() = 'owner'
  );

-- ----------------------------
-- Users 정책
-- ----------------------------

-- 자신의 프로필 조회
create policy "users_select_self"
  on public.users for select
  using (id = auth.uid());

-- 같은 테넌트 사용자 조회 (승인된 사용자만)
create policy "users_select_tenant"
  on public.users for select
  using (
    tenant_id = public.current_user_tenant_id()
    and approval_status = 'approved'
  );

-- Owner는 pending 사용자도 조회 가능
create policy "users_select_pending_owner"
  on public.users for select
  using (
    public.current_user_role() = 'owner'
    and approval_status = 'pending'
  );

-- 자신의 프로필 수정
create policy "users_update_self"
  on public.users for update
  using (id = auth.uid());

-- Owner는 같은 테넌트 사용자 수정
create policy "users_update_owner"
  on public.users for update
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() = 'owner'
  );

-- 신규 사용자 생성 (회원가입)
create policy "users_insert_signup"
  on public.users for insert
  with check (id = auth.uid());

-- ----------------------------
-- Students 정책
-- ----------------------------

-- 같은 테넌트 학생만 조회
create policy "students_select_tenant"
  on public.students for select
  using (tenant_id = public.current_user_tenant_id());

-- 학생 생성 (Owner, Instructor)
create policy "students_insert_staff"
  on public.students for insert
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner', 'instructor')
  );

-- 학생 수정 (Owner, Instructor)
create policy "students_update_staff"
  on public.students for update
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner', 'instructor')
  );

-- 학생 삭제 (Owner만)
create policy "students_delete_owner"
  on public.students for delete
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() = 'owner'
  );

-- ----------------------------
-- Student TODOs 정책
-- ----------------------------

-- 같은 테넌트 TODO 조회
create policy "todos_select_tenant"
  on public.student_todos for select
  using (tenant_id = public.current_user_tenant_id());

-- TODO 생성 (Owner, Instructor)
create policy "todos_insert_staff"
  on public.student_todos for insert
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner', 'instructor')
  );

-- TODO 수정 (Owner, Instructor)
create policy "todos_update_staff"
  on public.student_todos for update
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner', 'instructor')
  );

-- TODO 삭제 (Owner, Instructor)
create policy "todos_delete_staff"
  on public.student_todos for delete
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner', 'instructor')
  );

-- ============================================================
-- 7) 키오스크 모드 전용 함수
-- ============================================================

-- 키오스크용 TODO 조회 (RLS 우회)
create or replace function public.get_student_todos_for_kiosk(
  p_student_id uuid,
  p_date date
)
returns json
language plpgsql
security definer
as $$
declare
  v_todos json;
begin
  select json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'subject', subject,
      'priority', priority,
      'completed_at', completed_at,
      'verified_at', verified_at,
      'notes', notes,
      'description', description,
      'estimated_duration_minutes', estimated_duration_minutes
    )
  )
  into v_todos
  from public.student_todos
  where student_id = p_student_id
  and due_date = p_date
  and deleted_at is null
  order by created_at;

  return coalesce(v_todos, '[]'::json);
end
$$;

-- 익명 사용자도 실행 가능 (PIN 인증은 애플리케이션 레벨에서)
grant execute on function public.get_student_todos_for_kiosk(uuid, date) to anon;

-- ============================================================
-- 8) 초기 데이터 설정 도우미
-- ============================================================

-- 사용 예시 (수동 실행):
-- 1. 먼저 Supabase Auth에서 계정 생성
-- 2. 다음 함수 실행:
-- select public.create_first_owner(
--   'admin@myschool.com',
--   '김원장',
--   '우리학원',
--   'myschool'
-- );