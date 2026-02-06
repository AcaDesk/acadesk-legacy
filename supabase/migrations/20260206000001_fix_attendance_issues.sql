-- 20260206000001_fix_attendance_issues.sql
-- Fix: attendance_date 자동 채움 트리거, RLS 정책 추가

-- ============================================================
-- 0. RLS Helper Functions (없으면 생성)
-- ============================================================

-- current_user_tenant_id: JWT에서 현재 사용자의 tenant_id 추출
create or replace function public.current_user_tenant_id()
returns uuid
language sql
stable
security definer
as $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid,
    (select tenant_id from public.users where id = auth.uid())
  );
$$;

-- current_user_role: JWT에서 현재 사용자의 role 추출
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    (select role_code from public.users where id = auth.uid())
  );
$$;

-- ============================================================
-- 1. attendance_date 자동 채움 트리거
-- ============================================================

-- attendance 레코드 생성/수정 시 session_date로 attendance_date 자동 채움
create or replace function public.set_attendance_date()
returns trigger as $$
begin
  -- session_id가 있으면 해당 세션의 날짜를 attendance_date에 설정
  if new.session_id is not null then
    select session_date into new.attendance_date
    from public.attendance_sessions
    where id = new.session_id;
  end if;
  return new;
end;
$$ language plpgsql;

-- 트리거 생성 (INSERT/UPDATE 시)
drop trigger if exists trg_set_attendance_date on public.attendance;
create trigger trg_set_attendance_date
  before insert or update on public.attendance
  for each row
  execute function public.set_attendance_date();

-- 기존 데이터 중 attendance_date가 null인 레코드 업데이트
update public.attendance a
set attendance_date = s.session_date
from public.attendance_sessions s
where a.session_id = s.id
  and a.attendance_date is null;

-- ============================================================
-- 2. attendance_sessions RLS 정책
-- ============================================================
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

-- ============================================================
-- 3. attendance RLS 정책
-- ============================================================
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

-- Grant execute on helper functions
grant execute on function public.current_user_tenant_id() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
