-- ============================================================
-- 06) RPC Functions
-- ------------------------------------------------------------
-- Purpose: Define server-side functions (RPC) used by the app
-- Prerequisites: 01_extensions.sql, 02_schema.sql, 03_helpers.sql, 05_rls.sql
-- ============================================================

-- ============================================================
-- A) Onboarding helpers (필수 가드용)
-- ============================================================

-- A-1) 온보딩 상태 확인: 최초 진입시 이 함수만 호출하여 라우팅 결정
create or replace function public.get_onboarding_state()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user auth.users%rowtype;
  v_app_user  public.users%rowtype;
begin
  select * into v_auth_user from auth.users where id = auth.uid();
  select * into v_app_user from public.users where id = auth.uid();

  return json_build_object(
    'auth_user_id', v_auth_user.id,
    'email_confirmed', (v_auth_user.email_confirmed_at is not null),
    'app_user_exists', (v_app_user.id is not null),
    'tenant_id', v_app_user.tenant_id,
    'role_code', v_app_user.role_code,
    'onboarding_completed', coalesce(v_app_user.onboarding_completed, false),
    'approval_status', coalesce(v_app_user.approval_status, 'pending')
  );
end
$$;

-- A-2) 초대 토큰 검증 (읽기 전용)
create or replace function public.validate_invitation_token(_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
begin
  select id, tenant_id, email, role_code, status, expires_at
    into v_inv
  from public.tenant_invitations
  where token = _token;

  if not found then
    return json_build_object('valid', false, 'reason', 'not_found');
  end if;

  if v_inv.status <> 'pending' then
    return json_build_object('valid', false, 'reason', 'status_'||v_inv.status);
  end if;

  if v_inv.expires_at <= now() then
    return json_build_object('valid', false, 'reason', 'expired');
  end if;

  return json_build_object(
    'valid', true,
    'tenant_id', v_inv.tenant_id,
    'email', v_inv.email,
    'role_code', v_inv.role_code,
    'expires_at', v_inv.expires_at
  );
end
$$;

-- ============================================================
-- 1) Dashboard Summary (홈 대시보드 요약용)
-- ============================================================
create or replace function public.get_dashboard_data(today_param date default current_date)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_stats jsonb;
  v_students int;
  v_active_classes int;
  v_todos_pending int;
  v_today_sessions int;
  v_recent_students jsonb;
  v_recent_logs jsonb;
begin
  select tenant_id into v_tenant_id from public.users where id = auth.uid();

  select count(*) into v_students
  from public.students
  where tenant_id = v_tenant_id and deleted_at is null;

  select count(*) into v_active_classes
  from public.classes
  where tenant_id = v_tenant_id and active is true;

  select count(*) into v_todos_pending
  from public.student_todos
  where tenant_id = v_tenant_id
    and completed_at is null;

  select count(*) into v_today_sessions
  from public.attendance_sessions
  where tenant_id = v_tenant_id
    and session_date = today_param;

  select jsonb_agg(jsonb_build_object(
    'id', s.id,
    'name', u.name,
    'grade', s.grade,
    'school', s.school,
    'created_at', s.created_at
  ))
  into v_recent_students
  from public.students s
  join public.users u on s.user_id = u.id
  where s.tenant_id = v_tenant_id
  order by s.created_at desc
  limit 10;

  select jsonb_agg(jsonb_build_object(
    'id', l.id,
    'student_id', l.student_id,
    'activity_type', l.activity_type,
    'description', l.description,
    'created_at', l.created_at
  ))
  into v_recent_logs
  from public.student_activity_logs l
  where l.tenant_id = v_tenant_id
  order by l.created_at desc
  limit 20;

  v_stats := jsonb_build_object(
    'total_students', v_students,
    'active_classes', v_active_classes,
    'pending_todos', v_todos_pending,
    'today_sessions', v_today_sessions,
    'recent_students', coalesce(v_recent_students, '[]'::jsonb),
    'recent_logs', coalesce(v_recent_logs, '[]'::jsonb)
  );

  return to_json(v_stats);
end
$$;

-- ============================================================
-- 2) Verify multiple student TODOs
-- ============================================================
create or replace function public.verify_todos(todo_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from public.users where id = auth.uid();

  update public.student_todos
  set verified_at = now(),
      verified_by = auth.uid()
  where tenant_id = v_tenant_id
    and id = any(todo_ids)
    and completed_at is not null
    and verified_at is null;
end
$$;

-- ============================================================
-- 3) Upsert attendance record
-- ============================================================
create or replace function public.upsert_attendance(
  _session_id uuid,
  _student_id uuid,
  _status text,
  _check_in timestamptz default null,
  _check_out timestamptz default null,
  _notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from public.users where id = auth.uid();

  insert into public.attendance(session_id, student_id, tenant_id, status, check_in_at, check_out_at, notes)
  values (_session_id, _student_id, v_tenant_id, _status, _check_in, _check_out, _notes)
  on conflict (session_id, student_id)
  do update set
    status = excluded.status,
    check_in_at = excluded.check_in_at,
    check_out_at = excluded.check_out_at,
    notes = excluded.notes,
    updated_at = now();
end
$$;

-- ============================================================
-- 4) Get Student Detail (학생 상세 페이지용)
-- ============================================================
create or replace function public.get_student_detail(_student_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_info jsonb;
  v_classes jsonb;
  v_todos jsonb;
  v_guardians jsonb;
begin
  select tenant_id into v_tenant_id from public.users where id = auth.uid();

  select jsonb_build_object(
    'id', s.id,
    'user_id', s.user_id,
    'name', u.name,
    'grade', s.grade,
    'school', s.school,
    'birth_date', s.birth_date,
    'student_phone', s.student_phone,
    'commute_method', s.commute_method,
    'marketing_source', s.marketing_source,
    'enrollment_date', s.enrollment_date,
    'gender', s.gender,
    'notes', s.notes
  )
  into v_info
  from public.students s
  join public.users u on u.id = s.user_id
  where s.id = _student_id and s.tenant_id = v_tenant_id;

  select jsonb_agg(jsonb_build_object(
    'class_id', c.id,
    'class_name', c.name,
    'subject', c.subject,
    'instructor_id', c.instructor_id,
    'status', e.status,
    'enrolled_at', e.enrolled_at,
    'end_date', e.end_date,
    'withdrawal_reason', e.withdrawal_reason,
    'notes', e.notes
  ))
  into v_classes
  from public.class_enrollments e
  join public.classes c on c.id = e.class_id
  where e.student_id = _student_id and e.tenant_id = v_tenant_id;

  select jsonb_agg(jsonb_build_object(
    'id', t.id,
    'title', t.title,
    'subject', t.subject,
    'due_date', t.due_date,
    'priority', t.priority,
    'completed_at', t.completed_at,
    'verified_at', t.verified_at
  ))
  into v_todos
  from public.student_todos t
  where t.student_id = _student_id and t.tenant_id = v_tenant_id
  order by t.due_date desc
  limit 20;

  select jsonb_agg(jsonb_build_object(
    'guardian_id', g.id,
    'relation', sg.relation,
    'user_name', ug.name,
    'email', ug.email,
    'phone', ug.phone
  ))
  into v_guardians
  from public.student_guardians sg
  join public.guardians g on g.id = sg.guardian_id
  join public.users ug on ug.id = g.user_id
  where sg.student_id = _student_id and sg.tenant_id = v_tenant_id;

  return to_json(jsonb_build_object(
    'student_info', coalesce(v_info, '{}'::jsonb),
    'enrollments', coalesce(v_classes, '[]'::jsonb),
    'todos', coalesce(v_todos, '[]'::jsonb),
    'guardians', coalesce(v_guardians, '[]'::jsonb)
  ));
end
$$;

-- ============================================================
-- 5) Verify student kiosk PIN
-- ============================================================
create or replace function public.verify_student_kiosk_pin(_student_id uuid, _pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_pin text;
begin
  select tenant_id, kiosk_pin into v_tenant_id, v_pin
  from public.students
  where id = _student_id;

  if v_tenant_id != public.current_user_tenant_id() then
    return false;
  end if;

  if v_pin is null then
    return false;
  end if;

  return crypt(_pin, v_pin) = v_pin;
end
$$;

-- ============================================================
-- 6) Create staff invitation
--    NOTE: 02_schema.sql의 컬럼명(created_by)와 일치시킴
-- ============================================================
create or replace function public.create_staff_invitation(
  _email text,
  _role text default 'teacher',
  _expires interval default interval '7 days'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_token text;
  v_id uuid;
begin
  select tenant_id into v_tenant_id from public.users where id = auth.uid();
  v_token := encode(gen_random_bytes(16), 'hex');

  insert into public.tenant_invitations(
    tenant_id, created_by, email, role_code, token, expires_at, status
  )
  values (
    v_tenant_id,
    auth.uid(),
    lower(trim(_email)),
    _role,
    v_token,
    now() + _expires,
    'pending'
  )
  returning id into v_id;

  return v_id;
end
$$;