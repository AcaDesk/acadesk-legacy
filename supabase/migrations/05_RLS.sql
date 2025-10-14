-- ============================================================
-- 05) RLS (Row Level Security)
-- ------------------------------------------------------------
-- Purpose: Enable RLS and define all row-level policies
-- Prerequisites: 01_extensions.sql, 02_schema.sql, 03_helpers.sql
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

-- users: 같은 테넌트만 조회, 본인 업데이트 허용, 스태프는 같은 테넌트 사용자 업데이트 허용
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

-- guardians: 같은 테넌트 전체 권한
do $$ begin
  create policy guardians_same_tenant_all
    on public.guardians
    for all
    using (tenant_id = public.current_user_tenant_id())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- student_guardians: 같은 테넌트 전체 권한
do $$ begin
  create policy sg_same_tenant_all
    on public.student_guardians
    for all
    using (tenant_id = public.current_user_tenant_id())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- subjects: 같은 테넌트 전체 권한
do $$ begin
  create policy subjects_same_tenant_all
    on public.subjects
    for all
    using (tenant_id = public.current_user_tenant_id())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- classes: 같은 테넌트 전체 권한
do $$ begin
  create policy classes_same_tenant_all
    on public.classes
    for all
    using (tenant_id = public.current_user_tenant_id())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- class_enrollments: 조회는 같은 테넌트, 쓰기는 owner/teacher
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

-- attendance_sessions: 같은 테넌트 전체 권한
do $$ begin
  create policy att_sess_same_tenant_all
    on public.attendance_sessions
    for all
    using (tenant_id = public.current_user_tenant_id())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- attendance: 같은 테넌트 전체 권한
do $$ begin
  create policy att_same_tenant_all
    on public.attendance
    for all
    using (tenant_id = public.current_user_tenant_id())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- student_schedules: 같은 테넌트 전체 권한
do $$ begin
  create policy sched_same_tenant_all
    on public.student_schedules
    for all
    using (tenant_id = public.current_user_tenant_id())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- student_todos:
--   - 생성/수정/삭제: owner 또는 teacher
--   - 학생 본인은 자신의 항목 조회 가능
--   - 학생 본인은 자신의 항목을 완료(complete) 갱신 허용(검증 전까지만)
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

-- tenant_invitations: 같은 테넌트 + owner만 조회/등록
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

-- in_app_notifications: 같은 테넌트 전체 권한
do $$ begin
  create policy notif_same_tenant_all
    on public.in_app_notifications
    for all
    using (tenant_id = public.current_user_tenant_id())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- student_activity_logs: 같은 테넌트 전체 권한
do $$ begin
  create policy logs_same_tenant_all
    on public.student_activity_logs
    for all
    using (tenant_id = public.current_user_tenant_id())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;