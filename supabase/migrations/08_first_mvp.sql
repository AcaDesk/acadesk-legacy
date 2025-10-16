-- ============================================================
-- MVP v1 Migration (Triggers minimal / RPC included)
-- Features: Tenants, Users, Students, Student TODOs,
--           Onboarding(Owner), Kiosk (PIN), Basic RLS
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
  code        text primary key,
  label       text not null,
  description text,
  created_at  timestamptz not null default now()
);

insert into public.ref_roles (code, label, description) values
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

create index if not exists idx_tenants_slug    on public.tenants (slug) where deleted_at is null;
create index if not exists idx_tenants_deleted on public.tenants (deleted_at);

-- 2-2) Users (앱 사용자)
--  ⚠ auth.users FK는 운영·권한 이슈 방지를 위해 연결하지 않고, 동일 uuid만 저장
create table if not exists public.users (
  id                     uuid primary key default uuid_generate_v4(),  -- 학생용 레코드는 자동 생성
  tenant_id              uuid references public.tenants (id),
  email                  citext not null,                -- 전역 UNIQUE 대신 부분 유니크 인덱스
  name                   text not null,
  phone                  text,
  role_code              text references public.ref_roles (code),
  onboarding_completed   boolean not null default false,
  onboarding_completed_at timestamptz,
  approval_status        text not null default 'pending'
                           check (approval_status in ('pending','approved','rejected')),
  approval_reason        text,
  approved_at            timestamptz,
  approved_by            uuid,
  settings               jsonb not null default '{}'::jsonb,
  preferences            jsonb not null default '{}'::jsonb,
  address                text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);

-- (전역 UNIQUE on email이 있었다면 제거 → 소프트 삭제 고려한 부분 유니크 인덱스로 전환)
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'users_email_key') then
    alter table public.users drop constraint users_email_key;
  end if;
exception when others then null;
end $$;

drop index if exists idx_users_email;
create unique index if not exists uq_users_email_active
  on public.users (email)
  where deleted_at is null;

create index if not exists idx_users_tenant_role on public.users (tenant_id, role_code) where deleted_at is null;
create index if not exists idx_users_approval    on public.users (approval_status)       where deleted_at is null;

-- 2-3) Students
create table if not exists public.students (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references public.tenants (id),
  user_id           uuid references public.users (id),        -- 학생-앱 사용자 매핑 FK
  student_code      text not null,                            -- 전역 UNIQUE 금지
  name              text not null,
  birth_date        date,
  gender            text check (gender in ('male','female','other')),
  student_phone     text,
  profile_image_url text,
  grade             text,
  school            text,
  enrollment_date   date default current_date,
  withdrawal_date   date,
  emergency_contact text,
  notes             text,
  commute_method    text,
  marketing_source  text,
  kiosk_pin         text,                                     -- bcrypt 해시 저장
  meta              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

-- (기존 전역 UNIQUE가 있었다면 제거하고, 테넌트 범위 부분 유니크로 교체)
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'students_student_code_key') then
    alter table public.students drop constraint students_student_code_key;
  end if;
exception when others then null;
end $$;

drop index if exists idx_students_student_code;
create unique index if not exists uq_students_tenant_code_active
  on public.students (tenant_id, student_code)
  where deleted_at is null;

create index if not exists idx_students_tenant_created on public.students (tenant_id, created_at desc) where deleted_at is null;
create index if not exists idx_students_grade          on public.students (grade)                      where deleted_at is null;
create index if not exists idx_students_user_id        on public.students (user_id)                   where deleted_at is null;

-- 2-4) Student TODOs
create table if not exists public.student_todos (
  id                           uuid primary key default uuid_generate_v4(),
  tenant_id                    uuid not null references public.tenants (id),
  student_id                   uuid not null references public.students (id) on delete cascade,
  title                        text not null,
  description                  text,
  subject                      text,
  due_date                     date not null,
  due_day_of_week              int not null default 0
                                 check (due_day_of_week >= 0 and due_day_of_week <= 6),
  priority                     text not null default 'normal'
                                 check (priority in ('low','normal','high','urgent')),
  estimated_duration_minutes   int,
  completed_at                 timestamptz,
  verified_at                  timestamptz,
  verified_by                  uuid references public.users (id),
  notes                        text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  deleted_at                   timestamptz
);

create index if not exists idx_todos_tenant_due on public.student_todos (tenant_id, due_date);
create index if not exists idx_todos_student    on public.student_todos (student_id);
create index if not exists idx_todos_completed  on public.student_todos (tenant_id, completed_at);
create index if not exists idx_todos_verified   on public.student_todos (tenant_id, verified_at);

-- ============================================================
-- 3) Helper & Utility Functions
-- ============================================================

-- updated_at 자동 갱신 트리거 함수 (선호 시 사용)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- 대표 이메일 추출 (auth.users/identities 기반)
create or replace function public.primary_email(_auth_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  -- 1) auth.users.email
  select lower(trim(email)) into v_email
  from auth.users
  where id = _auth_user_id;

  if v_email is not null and v_email <> '' then
    return v_email;
  end if;

  -- 2) auth.users.raw_user_meta_data->>'email'
  select lower(trim(raw_user_meta_data->>'email')) into v_email
  from auth.users
  where id = _auth_user_id;

  if v_email is not null and v_email <> '' then
    return v_email;
  end if;

  -- 3) auth.identities.identity_data->>'email' (google/kakao 등)
  select lower(trim(identity_data->>'email')) into v_email
  from auth.identities
  where user_id = _auth_user_id
    and provider in ('google','kakao')
    and (identity_data->>'email') is not null
  order by created_at
  limit 1;

  return v_email; -- 없으면 NULL
end
$$;

-- 현재 로그인 사용자의 tenant_id
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

-- 현재 로그인 사용자의 role_code
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

-- 슬러그 유틸
create or replace function public.slugify(_t text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(trim(_t)), '[^a-z0-9]+', '-', 'g')
$$;

create or replace function public.gen_unique_slug(_name text)
returns text
language plpgsql
as $$
declare
  base text := coalesce(public.slugify(_name), 'academy');
  s    text := base;
  i    int  := 0;
begin
  while exists (select 1 from public.tenants where slug = s) loop
    i := i + 1;
    s := base || '-' || lpad(i::text, 2, '0');
    if i > 50 then
      s := base || '-' || encode(gen_random_bytes(3), 'hex');
      exit;
    end if;
  end loop;
  return s;
end
$$;

-- ============================================================
-- 4) RPC Functions (트리거 대신 명시 호출)
-- ============================================================

-- 4-0) 온보딩 상태 조회
create or replace function public.get_onboarding_state()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid := auth.uid();
  v_user  record;
begin
  if v_id is null then
    return json_build_object(
      'onboarding_completed', false,
      'role_code',            null,
      'tenant_id',            null,
      'approval_status',      null
    );
  end if;

  select
    onboarding_completed,
    role_code,
    tenant_id,
    approval_status
  into v_user
  from public.users
  where id = v_id
    and deleted_at is null;

  if not found then
    return json_build_object(
      'onboarding_completed', false,
      'role_code',            null,
      'tenant_id',            null,
      'approval_status',      null
    );
  end if;

  return json_build_object(
    'onboarding_completed', coalesce(v_user.onboarding_completed, false),
    'role_code',            v_user.role_code,
    'tenant_id',            v_user.tenant_id,
    'approval_status',      v_user.approval_status
  );
end
$$;

grant execute on function public.get_onboarding_state() to authenticated;

-- 4-1) 회원가입 후 사용자 프로필 생성 (앱 최초 1회)
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

  insert into public.users (id, email, name, role_code, onboarding_completed, approval_status)
  values (v_user_id, coalesce(v_email, ''), coalesce(v_email, ''), null, false, 'pending');

  return json_build_object('success', true, 'message', '프로필이 생성되었습니다.');
exception
  when others then
    return json_build_object('success', false, 'error', SQLERRM);
end
$$;

grant execute on function public.create_user_profile() to authenticated, anon;

-- 4-2) 승인 상태 확인
create or replace function public.check_approval_status()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status  text;
  v_reason  text;
  v_tenant  uuid;
begin
  if v_user_id is null then
    return json_build_object('success', false, 'error', '인증되지 않은 사용자입니다.');
  end if;

  select approval_status, approval_reason, tenant_id
    into v_status, v_reason, v_tenant
  from public.users
  where id = v_user_id
    and deleted_at is null;

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

grant execute on function public.check_approval_status() to authenticated;

-- 4-3) 원장 온보딩(트랜잭션): 테넌트 생성 + 사용자 업데이트
create or replace function public.complete_owner_onboarding(
  _user_id      uuid,
  _name         text,
  _academy_name text,
  _slug         text default null
)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_tenant_id uuid;
  v_slug      text := coalesce(_slug, public.gen_unique_slug(_academy_name));
  v_email     text;
begin
  -- auth.users 최소 존재 확인
  select email into v_email from auth.users where id = _user_id;
  if v_email is null then
    return json_build_object('success', false, 'error', 'Auth user not found');
  end if;

  -- 테넌트 생성
  insert into public.tenants (name, slug)
  values (_academy_name, v_slug)
  returning id into v_tenant_id;

  -- users 업서트: 없으면 생성, 있으면 owner로 갱신
  insert into public.users as u (
    id, email, name, role_code, tenant_id,
    onboarding_completed, onboarding_completed_at,
    approval_status, approved_at, updated_at
  )
  values (
    _user_id,
    coalesce(public.primary_email(_user_id), v_email, ''),
    _name,
    'owner',
    v_tenant_id,
    true,
    now(),
    'approved',
    now(),
    now()
  )
  on conflict (id) do update
    set name                   = excluded.name,
        role_code              = 'owner',
        tenant_id              = excluded.tenant_id,
        onboarding_completed   = true,
        onboarding_completed_at= now(),
        approval_status        = 'approved',
        approved_at            = now(),
        updated_at             = now();

  return json_build_object(
    'success', true,
    'user',   json_build_object('id', _user_id, 'name', _name, 'role_code', 'owner', 'tenant_id', v_tenant_id),
    'tenant', json_build_object('id', v_tenant_id, 'name', _academy_name, 'slug', v_slug)
  );
exception
  when others then
    return json_build_object('success', false, 'error', SQLERRM);
end
$$;

grant execute on function public.complete_owner_onboarding(uuid, text, text, text) to authenticated;

-- 4-4) 원장 학원 설정 마무리
create or replace function public.finish_owner_academy_setup(
  _academy_name text,
  _timezone     text default 'Asia/Seoul',
  _settings     jsonb default '{}'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_tenant uuid;
begin
  if v_uid is null then
    return json_build_object('success', false, 'error', 'unauthenticated');
  end if;

  select tenant_id into v_tenant
  from public.users
  where id = v_uid and deleted_at is null;

  if v_tenant is null then
    return json_build_object('success', false, 'error', 'tenant_not_found');
  end if;

  update public.tenants
     set name = _academy_name,
         timezone = coalesce(_timezone, 'Asia/Seoul'),
         settings = coalesce(_settings, '{}'::jsonb),
         updated_at = now()
   where id = v_tenant;

  update public.users
     set onboarding_completed = true,
         onboarding_completed_at = now(),
         updated_at = now()
   where id = v_uid;

  return json_build_object('success', true);
exception
  when others then
    return json_build_object('success', false, 'error', SQLERRM);
end
$$;

grant execute on function public.finish_owner_academy_setup(text, text, jsonb) to authenticated;

-- 4-5) 키오스크: 학생 TODO 조회 (PIN 검증 포함)
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
  ) order by created_at)
  into v_todos
  from public.student_todos
  where student_id = p_student_id
    and due_date   = p_date
    and deleted_at is null;

  return coalesce(v_todos, '[]'::json);
end
$$;

grant execute on function public.get_student_todos_for_kiosk(uuid, date, text) to anon;

-- 4-6) 대시보드 데이터 (Stub)
create or replace function public.get_dashboard_data(today_param date default current_date)
returns json
language sql
stable
as $$
  select json_build_object(
    'stats', json_build_object(
      'totalStudents', 0, 'activeClasses', 0, 'todayAttendance', 0,
      'pendingTodos', 0, 'totalReports', 0, 'unsentReports', 0
    ),
    'recentStudents', '[]'::json,
    'todaySessions', '[]'::json,
    'birthdayStudents', '[]'::json,
    'scheduledConsultations', '[]'::json,
    'studentAlerts', json_build_object('longAbsence','[]'::json,'pendingAssignments','[]'::json),
    'financialData', json_build_object('currentMonthRevenue',0,'previousMonthRevenue',0,'unpaidTotal',0,'unpaidCount',0),
    'classStatus','[]'::json,
    'parentsToContact','[]'::json,
    'calendarEvents','[]'::json,
    'activityLogs','[]'::json
  );
$$;

grant execute on function public.get_dashboard_data(date) to authenticated;

-- ============================================================
-- 5) Triggers (선호 시 사용; 미사용 가능)
-- ============================================================
drop trigger if exists trg_tenants_updated_at  on public.tenants;
create trigger trg_tenants_updated_at
  before update on public.tenants
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_users_updated_at    on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
  before update on public.students
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_todos_updated_at    on public.student_todos;
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
  on public.tenants
  for select
  using (id = public.current_user_tenant_id());

drop policy if exists tenants_update_owner on public.tenants;
create policy tenants_update_owner
  on public.tenants
  for update
  using (
    id = public.current_user_tenant_id()
    and public.current_user_role() = 'owner'
  );

-- Users: 본인 조회/수정 + 같은 테넌트(승인된 사용자) 조회 + Owner의 pending 조회
drop policy if exists users_select_self on public.users;
create policy users_select_self
  on public.users
  for select
  using (id = auth.uid());

drop policy if exists users_select_tenant on public.users;
create policy users_select_tenant
  on public.users
  for select
  using (
    tenant_id = public.current_user_tenant_id()
    and approval_status = 'approved'
  );

drop policy if exists users_select_pending_owner on public.users;
create policy users_select_pending_owner
  on public.users
  for select
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() = 'owner'
    and approval_status = 'pending'
  );

drop policy if exists users_update_self on public.users;
create policy users_update_self
  on public.users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists users_update_owner on public.users;
create policy users_update_owner
  on public.users
  for update
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() = 'owner'
  )
  with check (tenant_id = public.current_user_tenant_id());

-- Users: 회원가입 직후 프로필 INSERT 허용 (auth.uid() == id)
drop policy if exists users_insert_signup on public.users;
create policy users_insert_signup
  on public.users
  for insert
  with check (id = auth.uid());

-- Users: Staff(owner/instructor)가 학생용 users 레코드 생성 가능
drop policy if exists users_insert_staff on public.users;
create policy users_insert_staff
  on public.users
  for insert
  with check (
    public.current_user_role() in ('owner', 'instructor')
    and tenant_id = public.current_user_tenant_id()
  );

-- Students: 같은 테넌트 조회 / Owner·Instructor INSERT/UPDATE / Owner DELETE
drop policy if exists students_select_tenant on public.students;
create policy students_select_tenant
  on public.students
  for select
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists students_insert_staff on public.students;
create policy students_insert_staff
  on public.students
  for insert
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );

drop policy if exists students_update_staff on public.students;
create policy students_update_staff
  on public.students
  for update
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );

drop policy if exists students_delete_owner on public.students;
create policy students_delete_owner
  on public.students
  for delete
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() = 'owner'
  );

-- Student TODOs: 같은 테넌트 조회 / Owner·Instructor CUD
drop policy if exists todos_select_tenant on public.student_todos;
create policy todos_select_tenant
  on public.student_todos
  for select
  using (tenant_id = public.current_user_tenant_id());

drop policy if exists todos_insert_staff on public.student_todos;
create policy todos_insert_staff
  on public.student_todos
  for insert
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );

drop policy if exists todos_update_staff on public.student_todos;
create policy todos_update_staff
  on public.student_todos
  for update
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  )
  with check (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );

drop policy if exists todos_delete_staff on public.student_todos;
create policy todos_delete_staff
  on public.student_todos
  for delete
  using (
    tenant_id = public.current_user_tenant_id()
    and public.current_user_role() in ('owner','instructor')
  );

-- ============================================================
-- 7) Grants (권한)
-- ============================================================
grant usage on schema public to authenticated, anon;

-- 테이블 권한 (RLS가 실제 접근을 제한)
grant select, insert, update, delete on table public.tenants       to authenticated;
grant select, insert, update, delete on table public.users         to authenticated;
grant select, insert, update, delete on table public.students      to authenticated;
grant select, insert, update, delete on table public.student_todos to authenticated;

-- 익명은 테이블 직접 권한 없음 (키오스크는 security definer RPC로 접근)