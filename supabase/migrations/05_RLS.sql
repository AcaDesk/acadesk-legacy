-- ============================================================
-- 05) RLS (Row Level Security)  — Hardened Version
-- ------------------------------------------------------------
-- Purpose: Enable RLS and define least-privilege policies
-- Prerequisites: 01_extensions.sql, 02_schema.sql, 03_helpers.sql
-- Notes:
--  - Uses helper fns: current_user_tenant_id(), is_owner(), is_teacher(), is_ta(), is_staff()
--  - Idempotent via DO $$ ... exception when duplicate_object ...
-- ============================================================

-- 1) Enable RLS on all relevant tables
alter table public.tenants               enable row level security;
alter table public.users                 enable row level security;
alter table public.students              enable row level security;
alter table public.guardians             enable row level security;
alter table public.student_guardians     enable row level security;
alter table public.subjects              enable row level security;
alter table public.classes               enable row level security;
alter table public.class_enrollments     enable row level security;
alter table public.attendance_sessions   enable row level security;
alter table public.attendance            enable row level security;
alter table public.student_schedules     enable row level security;
alter table public.student_todos         enable row level security;
alter table public.todo_templates        enable row level security;
alter table public.tenant_invitations    enable row level security;
alter table public.in_app_notifications  enable row level security;
alter table public.student_activity_logs enable row level security;

-- ============================================================
-- 2) Policies
-- ============================================================

-- tenants: 현재 사용자 테넌트만 조회 가능
do $$ begin
  create policy tenants_self_read
    on public.tenants
    for select
    using (id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- users: 본인 레코드 또는 같은 테넌트 조회 가능, 본인/스태프 업데이트
do $$ begin
  create policy users_self_select
    on public.users
    for select
    using (id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy users_same_tenant_select
    on public.users
    for select
    using (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy users_self_update
    on public.users
    for update
    using (id = auth.uid())
    with check (id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy users_staff_update
    on public.users
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_staff())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- students: 같은 테넌트 조회, 스태프만 쓰기, 삭제는 owner만
do $$ begin
  create policy students_read_same_tenant
    on public.students
    for select
    using (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy students_insert_staff
    on public.students
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy students_update_staff
    on public.students
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_staff())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy students_delete_owner_only
    on public.students
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

-- guardians: 읽기 same-tenant, 쓰기 staff, 삭제 owner
do $$ begin
  drop policy if exists guardians_same_tenant_all on public.guardians;
  create policy guardians_read_same_tenant
    on public.guardians
    for select
    using (tenant_id = public.current_user_tenant_id());
  create policy guardians_write_staff
    on public.guardians
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
  create policy guardians_update_staff
    on public.guardians
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_staff())
    with check (tenant_id = public.current_user_tenant_id());
  create policy guardians_delete_owner
    on public.guardians
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

-- student_guardians: 읽기 same-tenant, 쓰기 staff, 삭제 owner
do $$ begin
  drop policy if exists sg_same_tenant_all on public.student_guardians;
  create policy sg_read_same_tenant
    on public.student_guardians
    for select
    using (tenant_id = public.current_user_tenant_id());
  create policy sg_write_staff
    on public.student_guardians
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
  create policy sg_update_staff
    on public.student_guardians
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_staff())
    with check (tenant_id = public.current_user_tenant_id());
  create policy sg_delete_owner
    on public.student_guardians
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

-- subjects: 읽기 same-tenant, 쓰기 staff, 삭제 owner
do $$ begin
  drop policy if exists subjects_same_tenant_all on public.subjects;
  create policy subjects_read_same_tenant
    on public.subjects
    for select
    using (tenant_id = public.current_user_tenant_id());
  create policy subjects_write_staff
    on public.subjects
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
  create policy subjects_update_staff
    on public.subjects
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_staff())
    with check (tenant_id = public.current_user_tenant_id());
  create policy subjects_delete_owner
    on public.subjects
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

-- classes: 읽기 same-tenant, 쓰기 staff, 삭제 owner
do $$ begin
  drop policy if exists classes_same_tenant_all on public.classes;
  create policy classes_read_same_tenant
    on public.classes
    for select
    using (tenant_id = public.current_user_tenant_id());
  create policy classes_write_staff
    on public.classes
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
  create policy classes_update_staff
    on public.classes
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_staff())
    with check (tenant_id = public.current_user_tenant_id());
  create policy classes_delete_owner
    on public.classes
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

-- class_enrollments: 읽기 same-tenant, 쓰기 owner/teacher, 삭제 owner/teacher
do $$ begin
  create policy enroll_read_same_tenant
    on public.class_enrollments
    for select
    using (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy enroll_insert_teacher_plus
    on public.class_enrollments
    for insert
    with check (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy enroll_update_teacher_plus
    on public.class_enrollments
    for update
    using (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher())
    )
    with check (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy enroll_delete_teacher_plus
    on public.class_enrollments
    for delete
    using (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher())
    );
exception when duplicate_object then null; end $$;

-- attendance_sessions: 읽기 same-tenant, 쓰기 staff, 삭제 owner
do $$ begin
  drop policy if exists att_sess_same_tenant_all on public.attendance_sessions;
  create policy att_sess_read_same_tenant
    on public.attendance_sessions
    for select
    using (tenant_id = public.current_user_tenant_id());
  create policy att_sess_write_staff
    on public.attendance_sessions
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
  create policy att_sess_update_staff
    on public.attendance_sessions
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_staff())
    with check (tenant_id = public.current_user_tenant_id());
  create policy att_sess_delete_owner
    on public.attendance_sessions
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

-- attendance: 읽기 same-tenant, 쓰기 staff, 삭제 owner
do $$ begin
  drop policy if exists att_same_tenant_all on public.attendance;
  create policy att_read_same_tenant
    on public.attendance
    for select
    using (tenant_id = public.current_user_tenant_id());
  create policy att_write_staff
    on public.attendance
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
  create policy att_update_staff
    on public.attendance
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_staff())
    with check (tenant_id = public.current_user_tenant_id());
  create policy att_delete_owner
    on public.attendance
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

-- student_schedules: 읽기 same-tenant, 쓰기 staff, 삭제 owner
do $$ begin
  drop policy if exists sched_same_tenant_all on public.student_schedules;
  create policy sched_read_same_tenant
    on public.student_schedules
    for select
    using (tenant_id = public.current_user_tenant_id());
  create policy sched_write_staff
    on public.student_schedules
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
  create policy sched_update_staff
    on public.student_schedules
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_staff())
    with check (tenant_id = public.current_user_tenant_id());
  create policy sched_delete_owner
    on public.student_schedules
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

-- student_todos:
--   - 스태프: same-tenant 읽기 + 생성/수정/삭제
--   - 학생: 본인 항목 읽기 + 완료 체크(검증 전까지만)
do $$ begin
  create policy todos_staff_read_same_tenant
    on public.student_todos
    for select
    using (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher() or public.is_ta())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy todos_insert_teacher_plus
    on public.student_todos
    for insert
    with check (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher())
    );
exception when duplicate_object then null; end $$;

do $$ begin
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
exception when duplicate_object then null; end $$;

do $$ begin
  create policy todos_delete_teacher_plus
    on public.student_todos
    for delete
    using (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher())
    );
exception when duplicate_object then null; end $$;

-- 학생: 본인 항목 조회
do $$ begin
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
exception when duplicate_object then null; end $$;

-- 학생: 본인 항목 완료(verified 전에만)
do $$ begin
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
exception when duplicate_object then null; end $$;

-- todo_templates: 같은 테넌트 + staff(owner/teacher/ta)만 전체 권한
do $$ begin
  create policy tmpl_same_tenant_staff
    on public.todo_templates
    for all
    using (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher() or public.is_ta())
    )
    with check (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher() or public.is_ta())
    );
exception when duplicate_object then null; end $$;

-- tenant_invitations: 같은 테넌트 + owner만 조회/등록/업데이트/삭제
do $$ begin
  create policy inv_owner_read
    on public.tenant_invitations
    for select
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy inv_owner_insert
    on public.tenant_invitations
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy inv_owner_update
    on public.tenant_invitations
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_owner())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy inv_owner_delete
    on public.tenant_invitations
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

-- in_app_notifications: 읽기 same-tenant, 쓰기 staff, 삭제 owner
do $$ begin
  drop policy if exists notif_same_tenant_all on public.in_app_notifications;
  create policy notif_read_same_tenant
    on public.in_app_notifications
    for select
    using (tenant_id = public.current_user_tenant_id());
  create policy notif_write_staff
    on public.in_app_notifications
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
  create policy notif_update_staff
    on public.in_app_notifications
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_staff())
    with check (tenant_id = public.current_user_tenant_id());
  create policy notif_delete_owner
    on public.in_app_notifications
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

-- student_activity_logs: 읽기 same-tenant, 쓰기 staff, 삭제 owner
do $$ begin
  drop policy if exists logs_same_tenant_all on public.student_activity_logs;
  create policy logs_read_same_tenant
    on public.student_activity_logs
    for select
    using (tenant_id = public.current_user_tenant_id());
  create policy logs_write_staff
    on public.student_activity_logs
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
  create policy logs_update_staff
    on public.student_activity_logs
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_staff())
    with check (tenant_id = public.current_user_tenant_id());
  create policy logs_delete_owner
    on public.student_activity_logs
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;