-- ============================================================
-- 05) RLS (Row Level Security) — 최종본 (온보딩 예외 + 강화 정책 포함)
-- ------------------------------------------------------------
-- Prereq: 01_extensions.sql, 02_schema.sql, 03_helpers.sql
-- Helpers used: current_user_tenant_id(), is_owner(), is_teacher(), is_ta(), is_staff()
-- Notes:
--  - 멱등성 보장: CREATE POLICY는 DO $$ ... EXCEPTION WHEN duplicate_object ...
--  - Postgres 정책은 단일 동작만 허용(SELECT/INSERT/UPDATE/DELETE).
--    따라서 INSERT/UPDATE 통합 대신 각각 생성합니다. (콤마 구문 금지)
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
-- 2) Tenants
-- ============================================================
do $$ begin
  create policy tenants_self_read
    on public.tenants
    for select
    using (id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- ============================================================
-- 3) Users — 온보딩 예외 포함 (자기 레코드 조회/수정 허용)
-- ============================================================

-- SELECT: 같은 테넌트 or 본인 레코드(온보딩 전/후 모두 허용)
do $$ begin
  drop policy if exists users_self_select on public.users;
  create policy users_self_select
    on public.users
    for select
    using (
      id = auth.uid()
      or tenant_id = public.current_user_tenant_id()
    );
exception when duplicate_object then null; end $$;

-- UPDATE: 본인 레코드 갱신 허용(온보딩 단계 포함, owner 승격 방지)
do $$ begin
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
      and coalesce(role_code, '') <> 'owner'
    );
exception when duplicate_object then null; end $$;

-- UPDATE: 스태프가 같은 테넌트의 'owner가 아닌' 사용자 수정 가능 (승격 금지)
do $$ begin
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
      and coalesce(role_code, '') <> 'owner'
    );
exception when duplicate_object then null; end $$;

-- UPDATE: 원장은 같은 테넌트의 모든 사용자 수정 가능
do $$ begin
  create policy users_owner_update_any
    on public.users
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_owner())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- ============================================================
-- 4) Students
-- ============================================================
do $$ begin
  create policy students_read_same_tenant
    on public.students
    for select
    using (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists students_insert_staff on public.students;
  create policy students_insert_staff
    on public.students
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists students_update_staff on public.students;
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

-- ============================================================
-- 5) Guardians / Student_Guardians
-- ============================================================

-- guardians
do $$ begin
  drop policy if exists guardians_same_tenant_all on public.guardians;
  create policy guardians_read_same_tenant
    on public.guardians
    for select
    using (tenant_id = public.current_user_tenant_id());
  drop policy if exists guardians_write_staff on public.guardians;
  create policy guardians_insert_staff
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

-- student_guardians
do $$ begin
  drop policy if exists sg_same_tenant_all on public.student_guardians;
  create policy sg_read_same_tenant
    on public.student_guardians
    for select
    using (tenant_id = public.current_user_tenant_id());
  drop policy if exists sg_write_staff on public.student_guardians;
  create policy sg_insert_staff
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

-- ============================================================
-- 6) Subjects
-- ============================================================
do $$ begin
  drop policy if exists subjects_same_tenant_all on public.subjects;
  create policy subjects_read_same_tenant
    on public.subjects
    for select
    using (tenant_id = public.current_user_tenant_id());
  drop policy if exists subjects_write_staff on public.subjects;
  create policy subjects_insert_staff
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

-- ============================================================
-- 7) Classes — 강사: 본인이 담당(instructor_id)하는 수업만 UPDATE 가능
-- ============================================================
do $$ begin
  drop policy if exists classes_same_tenant_all on public.classes;
  create policy classes_read_same_tenant
    on public.classes
    for select
    using (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy classes_insert_staff
    on public.classes
    for insert
    with check (tenant_id = public.current_user_tenant_id() and public.is_staff());
exception when duplicate_object then null; end $$;

-- owner는 모든 수업 업데이트 가능
do $$ begin
  create policy classes_update_owner_any
    on public.classes
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_owner())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- teacher는 본인이 담당하는 수업만 업데이트 가능
do $$ begin
  create policy classes_update_teacher_own
    on public.classes
    for update
    using (
      tenant_id = public.current_user_tenant_id()
      and public.is_teacher()
      and instructor_id = auth.uid()
    )
    with check (
      tenant_id = public.current_user_tenant_id()
      and instructor_id = auth.uid()
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy classes_delete_owner
    on public.classes
    for delete
    using (tenant_id = public.current_user_tenant_id() and public.is_owner());
exception when duplicate_object then null; end $$;

-- ============================================================
-- 8) Class Enrollments — 강사 범위를 해당 수업으로 제한
-- ============================================================
do $$ begin
  create policy enroll_read_same_tenant
    on public.class_enrollments
    for select
    using (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- INSERT: owner or 해당 수업 담당 teacher
do $$ begin
  drop policy if exists enroll_insert_teacher_plus on public.class_enrollments;
  create policy enroll_insert_owner_or_class_teacher
    on public.class_enrollments
    for insert
    with check (
      tenant_id = public.current_user_tenant_id()
      and (
        public.is_owner()
        or (
          public.is_teacher()
          and exists (
            select 1 from public.classes c
            where c.id = class_id
              and c.tenant_id = public.current_user_tenant_id()
              and c.instructor_id = auth.uid()
          )
        )
      )
    );
exception when duplicate_object then null; end $$;

-- UPDATE: owner or 해당 수업 담당 teacher
do $$ begin
  drop policy if exists enroll_update_teacher_plus on public.class_enrollments;
  create policy enroll_update_owner_or_class_teacher
    on public.class_enrollments
    for update
    using (
      tenant_id = public.current_user_tenant_id()
      and (
        public.is_owner()
        or (
          public.is_teacher()
          and exists (
            select 1 from public.classes c
            where c.id = class_id
              and c.tenant_id = public.current_user_tenant_id()
              and c.instructor_id = auth.uid()
          )
        )
      )
    )
    with check (
      tenant_id = public.current_user_tenant_id()
      and (
        public.is_owner()
        or (
          public.is_teacher()
          and exists (
            select 1 from public.classes c
            where c.id = class_id
              and c.tenant_id = public.current_user_tenant_id()
              and c.instructor_id = auth.uid()
          )
        )
      )
    );
exception when duplicate_object then null; end $$;

-- DELETE: owner or 해당 수업 담당 teacher
do $$ begin
  drop policy if exists enroll_delete_teacher_plus on public.class_enrollments;
  create policy enroll_delete_owner_or_class_teacher
    on public.class_enrollments
    for delete
    using (
      tenant_id = public.current_user_tenant_id()
      and (
        public.is_owner()
        or (
          public.is_teacher()
          and exists (
            select 1 from public.classes c
            where c.id = class_id
              and c.tenant_id = public.current_user_tenant_id()
              and c.instructor_id = auth.uid()
          )
        )
      )
    );
exception when duplicate_object then null; end $$;

-- ============================================================
-- 9) Attendance Sessions / Attendance / Student Schedules
-- ============================================================

-- attendance_sessions
do $$ begin
  drop policy if exists att_sess_same_tenant_all on public.attendance_sessions;
  create policy att_sess_read_same_tenant
    on public.attendance_sessions
    for select
    using (tenant_id = public.current_user_tenant_id());
  drop policy if exists att_sess_write_staff on public.attendance_sessions;
  create policy att_sess_insert_staff
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

-- attendance
do $$ begin
  drop policy if exists att_same_tenant_all on public.attendance;
  create policy att_read_same_tenant
    on public.attendance
    for select
    using (tenant_id = public.current_user_tenant_id());
  drop policy if exists att_write_staff on public.attendance;
  create policy att_insert_staff
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

-- student_schedules
do $$ begin
  drop policy if exists sched_same_tenant_all on public.student_schedules;
  create policy sched_read_same_tenant
    on public.student_schedules
    for select
    using (tenant_id = public.current_user_tenant_id());
  drop policy if exists sched_write_staff on public.student_schedules;
  create policy sched_insert_staff
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

-- ============================================================
-- 10) Student Todos — 스태프/학생 분리
-- ============================================================

-- 스태프: 읽기
do $$ begin
  create policy todos_staff_read_same_tenant
    on public.student_todos
    for select
    using (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher() or public.is_ta())
    );
exception when duplicate_object then null; end $$;

-- 스태프: 쓰기(강사/원장)
do $$ begin
  drop policy if exists todos_insert_teacher_plus on public.student_todos;
  create policy todos_insert_teacher_plus
    on public.student_todos
    for insert
    with check (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher())
    );
exception when duplicate_object then null; end $$;

do $$ begin
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
exception when duplicate_object then null; end $$;

do $$ begin
  drop policy if exists todos_delete_teacher_plus on public.student_todos;
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

-- 학생: 본인 항목 완료(검증 전)
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

-- ============================================================
-- 11) Todo Templates — 스태프 전권(같은 테넌트)
-- ============================================================
do $$ begin
  create policy tmpl_same_tenant_staff_select
    on public.todo_templates
    for select
    using (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher() or public.is_ta())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy tmpl_same_tenant_staff_insert
    on public.todo_templates
    for insert
    with check (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher() or public.is_ta())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy tmpl_same_tenant_staff_update
    on public.todo_templates
    for update
    using (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher() or public.is_ta())
    )
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy tmpl_same_tenant_staff_delete
    on public.todo_templates
    for delete
    using (
      tenant_id = public.current_user_tenant_id()
      and (public.is_owner() or public.is_teacher() or public.is_ta())
    );
exception when duplicate_object then null; end $$;

-- ============================================================
-- 12) Tenant Invitations — 오너 전권(같은 테넌트)
-- ============================================================
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

-- ============================================================
-- 13) In-app Notifications
-- ============================================================
do $$ begin
  drop policy if exists notif_same_tenant_all on public.in_app_notifications;
  create policy notif_read_same_tenant
    on public.in_app_notifications
    for select
    using (tenant_id = public.current_user_tenant_id());
  create policy notif_insert_staff
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

-- ============================================================
-- 14) Student Activity Logs
-- ============================================================
do $$ begin
  drop policy if exists logs_same_tenant_all on public.student_activity_logs;
  create policy logs_read_same_tenant
    on public.student_activity_logs
    for select
    using (tenant_id = public.current_user_tenant_id());
  create policy logs_insert_staff
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