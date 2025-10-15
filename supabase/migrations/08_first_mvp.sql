-- ============================================================
-- MVP 1차 출시 마이그레이션 (Trigger 최소 / RPC 포함)
-- 기능: 학생 관리, TODO 관리, 대시보드, 키오스크 모드, 회원가입/승인
-- ============================================================

-- ============================================================
-- 0) Extensions
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ============================================================
-- 1) Reference Tables
-- ============================================================
create table if not exists public.ref_roles (
  code text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

insert into public.ref_roles (code, name, description) values
  ('owner',      '원장',   '학원 소유자 및 최고 관리자'),
  ('instructor', '강사',   '수업 담당 강사'),
  ('assistant',  '조교',   '수업 보조 및 행정 업무')
on conflict (code) do nothing;

-- ============================================================
-- 2) Core Tables
-- ============================================================

-- 2-1) Tenants (학원)
create table if not exists public.tenants (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  slug       text unique not null,
  timezone   text not null default 'Asia/Seoul',
  settings   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_tenants_slug      on public.tenants(slug) where deleted_at is null;
create index if not exists idx_tenants_deleted   on public.tenants(deleted_at);

-- 2-2) Users (앱 사용자)
--  (권장) auth.users FK는 운영상/권한 이슈가 많아 제거. id는 auth.users.id와 동일한 uuid를 저장.
create table if not exists public.users (
  id                       uuid primary key,            -- == auth.users.id
  tenant_id                uuid references public.tenants(id),
  email                    citext not null,             -- 테이블 UNIQUE 제거 → 부분 유니크 인덱스 사용
  name                     text not null,
  phone                    text,
  role_code                text references public.ref_roles(code),
  onboarding_completed     boolean not null default false,
  approval_status          text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  approval_reason          text,
  approved_at              timestamptz,
  approved_by              uuid,
  settings                 jsonb not null default '{}'::jsonb,
  preferences              jsonb not null default '{}'::jsonb,
  address                  text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz
);

-- 테이블 전역 UNIQUE(email) 제거(있다면) → 소프트삭제 허용을 위해 부분 유니크 인덱스로 전환
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'users_email_key') then
    alter table public.users drop constraint users_email_key;
  end if;
exception when others then null; end $$;

drop index if exists idx_users_email;
create unique index if not exists uq_users_email_active
  on public.users(email)
  where deleted_at is null;

create index if not exists idx_users_tenant_role on public.users(tenant_id, role_code) where deleted_at is null;
create index if not exists idx_users_approval    on public.users(approval_status) where deleted_at is null;

-- 2-3) Students
create table if not exists public.students (
  id                     uuid primary key default uuid_generate_v4(),
  tenant_id              uuid not null references public.tenants(id),
  user_id                uuid,                               -- 학생이 앱 계정과 매핑될 경우
  student_code           text not null,                      -- 전역 UNIQUE 금지
  name                   text not null,
  birth_date             date,
  gender                 text check (gender in ('male','female','other')),
  student_phone          text,
  profile_image_url      text,
  grade                  text,
  school                 text,
  enrollment_date        date default current_date,
  withdrawal_date        date,
  emergency_contact      text,
  notes                  text,
  commute_method         text,
  marketing_source       text,
  kiosk_pin              text,                               -- bcrypt 해시 저장
  meta                   jsonb not null default '{}'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);

-- (중요) 테넌트 범위 + 소프트삭제 고려 유니크
-- 기존 전역 UNIQUE 제약이 있었다면 제거
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'students_student_code_key') then
    alter table public.students drop constraint students_student_code_key;
  end if;
exception when others then null; end $$;

drop index if exists idx_students_student_code;
create unique index if not exists uq_students_tenant_code_active
  on public.students(tenant_id, student_code)
  where deleted_at is null;

create index if not exists idx_students_tenant_created on public.students(tenant_id, created_at desc) where deleted_at is null;
create index if not exists idx_students_grade          on public.students(grade) where deleted_at is null;
create index if not exists idx_students_user_id        on public.students(user_id) where deleted_at is null;

-- 2-4) Student TODOs
create table if not exists public.student_todos (
  id                         uuid primary key default uuid_generate_v4(),
  tenant_id                  uuid not null references public.tenants(id),
  student_id                 uuid not null references public.students(id) on delete cascade,
  title                      text not null,
  description                text,
  subject                    text,
  due_date                   date not null,
  priority                   text not null default 'medium' check (priority in ('low','medium','high')),
  estimated_duration_minutes int,
  completed_at               timestamptz,
  verified_at                timestamptz,
  verified_by                uuid references public.users(id),
  notes                      text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  deleted_at                 timestamptz
);

create index if not exists idx_todos_tenant_due   on public.student_todos(tenant_id, due_date) where deleted_at is null;
create index if not exists idx_todos_student      on public.student_todos(student_id) where deleted_at is null;
create index if not exists idx_todos_completed    on public.student_todos(tenant_id, completed_at) where deleted_at is null;
create index if not exists idx_todos_verified     on public.student_todos(tenant_id, verified_at) where deleted_at is null;

-- ============================================================
-- 3) Helper & Utility Functions
-- ============================================================

-- updated_at 자동 갱신 트리거 함수 (선호시 사용)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- 이메일(대표) 추출: auth.users에서 email 또는 identities
create or replace function public.primary_email(_auth_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_email     text;
  v_ident     jsonb;
begin
  select email, identities into v_email, v_ident
  from auth.users where id = _auth_user_id;

  v_email := case when v_email is null then null else lower(trim(v_email)) end;
  if v_email is not null then return v_email; end if;

  if v_ident is not null then
    v_email := lower(trim(
      (select (i->'identity_data'->>'email')
         from jsonb_array_elements(v_ident) i
        where (i->>'provider') in ('google','kakao')
        limit 1)
    ));
    if v_email is not null then return v_email; end if;
  end if;

  return null;
end
$$;

-- 현재 로그인 사용자의 tenant_id (자기 행만 읽음)
create or replace function public.current_user_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.users
  where id = auth.uid()
    and deleted_at is null
$$;

-- 현재 로그인 사용자의 role (자기 행만 읽음)
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_code
  from public.users
  where id = auth.uid()
    and deleted_at is null
$$;

-- ============================================================
-- 4) RPC Functions (트리거 대신 명시 호출)
-- ============================================================

-- 4-1) 회원가입 후 사용자 프로필 생성 (앱에서 최초 1회 호출)
create or replace function public.create_user_profile()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_exists  boolean;
begin
  if v_user_id is null then
    return json_build_object('success', false, 'error', '인증되지 않은 사용자입니다.');
  end if;

  select exists(select 1 from public.users where id = v_user_id) into v_exists;
  if v_exists then
    return json_build_object('success', true, 'message', '이미 프로필이 존재합니다.');
  end if;

  v_email := public.primary_email(v_user_id);

  insert into public.users(id, email, name, role_code, onboarding_completed, approval_status)
  values (v_user_id, coalesce(v_email, ''), coalesce(v_email, ''), null, false, 'pending');

  return json_build_object('success', true, 'message', '프로필이 생성되었습니다.');
exception
  when others then
    return json_build_object('success', false, 'error', SQLERRM);
end
$$;

-- 4-2) 승인 상태 확인
create or replace function public.check_approval_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_status   text;
  v_reason   text;
  v_tenant   uuid;
begin
  if v_user_id is null then
    return json_build_object('success', false, 'error', '인증되지 않은 사용자입니다.');
  end if;

  select approval_status, approval_reason, tenant_id
    into v_status, v_reason, v_tenant
  from public.users
  where id = v_user_id and deleted_at is null;

  if v_status is null then
    return json_build_object('success', false, 'error', '사용자 정보를 찾을 수 없습니다.');
  end if;

  return json_build_object(
    'success',   true,
    'status',    v_status,
    'reason',    v_reason,
    'tenant_id', v_tenant
  );
end
$$;

-- 4-3) 첫 Owner 계정/테넌트 생성 (수동 실행용; auth.users에 계정이 있어야 함)
create or replace function public.create_first_owner(
  p_email       text,
  p_name        text,
  p_tenant_name text,
  p_tenant_slug text
)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id  uuid;
  v_tenant   uuid;
  v_exists   boolean;
begin
  select id into v_user_id from auth.users where email = p_email;
  if v_user_id is null then
    return json_build_object('success', false, 'error', '먼저 Supabase Auth 회원가입이 필요합니다.');
  end if;

  insert into public.tenants(name, slug)
  values (p_tenant_name, p_tenant_slug)
  returning id into v_tenant;

  select exists(select 1 from public.users where id = v_user_id) into v_exists;

  if v_exists then
    update public.users
       set tenant_id = v_tenant,
           email     = coalesce(email, public.primary_email(v_user_id)),
           name      = p_name,
           role_code = 'owner',
           onboarding_completed = true,
           approval_status      = 'approved',
           approved_at          = now(),
           updated_at           = now()
     where id = v_user_id;
  else
    insert into public.users(
      id, tenant_id, email, name, role_code,
      onboarding_completed, approval_status, approved_at
    )
    values (
      v_user_id, v_tenant, coalesce(public.primary_email(v_user_id), p_email), p_name, 'owner',
      true, 'approved', now()
    );
  end if;

  return json_build_object('success', true, 'tenant_id', v_tenant, 'user_id', v_user_id);
exception
  when others then
    return json_build_object('success', false, 'error', SQLERRM);
end
$$;

-- 4-4) 키오스크: 학생 TODO 조회 (PIN 검증 추가)
create or replace function public.get_student_todos_for_kiosk(
  p_student_id uuid,
  p_date       date,
  p_pin        text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash  text;
  v_ok    boolean := false;
  v_todos json;
begin
  select kiosk_pin into v_hash
  from public.students
  where id = p_student_id
    and deleted_at is null;

  if v_hash is null then
    return '[]'::json;
  end if;

  -- bcrypt 검증
  v_ok := crypt(p_pin, v_hash) = v_hash;
  if not v_ok then
    return '[]'::json;
  end if;

  select json_agg(json_build_object(
    'id', id,
    'title', title,
    'subject', subject,
    'priority', priority,
    'completed_at', completed_at,
    'verified_at', verified_at,
    'notes', notes,
    'description', description,
    'estimated_duration_minutes', estimated_duration_minutes
  ))
  into v_todos
  from public.student_todos
  where student_id = p_student_id
    and due_date   = p_date
    and deleted_at is null
  order by created_at;

  return coalesce(v_todos, '[]'::json);
end
$$;

-- 권한 (함수 실행)
grant usage on schema public to authenticated, anon;
grant execute on function public.create_user_profile()                                       to authenticated, anon;
grant execute on function public.check_approval_status()                                     to authenticated;
grant execute on function public.create_first_owner(text, text, text, text)                  to authenticated;
grant execute on function public.get_student_todos_for_kiosk(uuid, date, text)               to anon;

-- ============================================================
-- 5) Triggers (선호 시 사용; 아니면 이 섹션 생략 가능)
-- ============================================================
drop trigger if exists trg_tenants_updated_at      on public.tenants;
create trigger trg_tenants_updated_at
  before update on public.tenants
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_users_updated_at        on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_students_updated_at     on public.students;
create trigger trg_students_updated_at
  before update on public.students
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_todos_updated_at        on public.student_todos;
create trigger trg_todos_updated_at
  before update on public.student_todos
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- 6) Row Level Security (최소 정책)
-- ============================================================

alter table public.tenants       enable row level security;
alter table public.users         enable row level security;
alter table public.students      enable row level security;
alter table public.student_todos enable row level security;

-- Tenants: 내 테넌트만 조회, Owner만 수정
drop policy if exists tenants_select_own   on public.tenants;
create policy tenants_select_own
  on public.tenants for select
  using (id = public.current_user_tenant_id());

drop policy if exists tenants_update_owner on public.tenants;
create policy tenants_update_owner
  on public.tenants for update
  using (
    id = public.current_user_tenant_id()
    and public.current_user_role() = 'owner'
  );

-- Users: 본인 조회/수정 + 같은 테넌트 조회(승인된 사용자), Owner는 pending도 조회
drop policy if exists users_select_self            on public.users;
create policy users_select_self
  on public.users for select
  using (id = auth.uid());

drop policy if exists users_select_tenant          on public.users;
create policy users_select_tenant
  on public.users for select
  using (tenant_id = public.current_user_tenant_id() and approval_status = 'approved');

drop policy if exists users_select_pending_owner   on public.users;
create policy users_select_pending_owner
  on public.users for select
  using (public.current_user_role() = 'owner' and approval_status = 'pending');

drop policy if exists users_update_self            on public.users;
create policy users_update_self
  on public.users for update
  using (id = auth.uid());

drop policy if exists users_update_owner           on public.users;
create policy users_update_owner
  on public.users for update
  using (tenant_id = public.current_user_tenant_id() and public.current_user_role() = 'owner');

-- INSERT: 회원가입 직후 프로필 생성 허용 (auth.uid() == id)
drop policy if exists users_insert_signup          on public.users;
create policy users_insert_signup
  on public.users for insert
  with check (id = auth.uid());

-- Students: 같은 테넌트만 조회, Owner/Instructor가 생성/수정, Owner만 삭제
drop policy if exists students_select_tenant       on public.students;
create policy students_select_tenant
  on public.students for select
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists students_insert_staff        on public.students;
create policy students_insert_staff
  on public.students for insert
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );

drop policy if exists students_update_staff        on public.students;
create policy students_update_staff
  on public.students for update
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );

drop policy if exists students_delete_owner        on public.students;
create policy students_delete_owner
  on public.students for delete
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() = 'owner'
  );

-- Student TODOs: 같은 테넌트, Owner/Instructor 생성/수정/삭제
drop policy if exists todos_select_tenant          on public.student_todos;
create policy todos_select_tenant
  on public.student_todos for select
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists todos_insert_staff           on public.student_todos;
create policy todos_insert_staff
  on public.student_todos for insert
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );

drop policy if exists todos_update_staff           on public.student_todos;
create policy todos_update_staff
  on public.student_todos for update
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );

drop policy if exists todos_delete_staff           on public.student_todos;
create policy todos_delete_staff
  on public.student_todos for delete
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );