-- =====================================================================
-- 05_rls.sql
-- Row Level Security (최종본) — 온보딩 예외 + 역할별 정책 + 멱등성
-- Prereq: 01_extensions.sql, 02_schema.sql, 03_helpers.sql, 04_triggers.sql
-- Helpers: current_user_tenant_id(), is_owner(), is_teacher(), is_ta(), is_staff()
-- =====================================================================

-- 1) Enable RLS
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

-- 2) tenants
do $$ begin
  create policy tenants_self_read
    on public.tenants
    for select
    using (id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- 3) users — 온보딩 예외(본인 조회/수정 허용)
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
      and coalesce(role_code,'') <> 'owner'
    );
exception when duplicate_object then null; end $$;

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
      and coalesce(role_code,'') <> 'owner'
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy users_owner_update_any
    on public.users
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_owner())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

-- 4) students
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

-- 5) guardians / student_guardians
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

-- 6) subjects
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

-- 7) classes — teacher는 본인 담당 수업만 UPDATE
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

do $$ begin
  create policy classes_update_owner_any
    on public.classes
    for update
    using (tenant_id = public.current_user_tenant_id() and public.is_owner())
    with check (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

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

-- 8) class_enrollments — teacher는 본인 수업만
do $$ begin
  create policy enroll_read_same_tenant
    on public.class_enrollments
    for select
    using (tenant_id = public.current_user_tenant_id());
exception when duplicate_object then null; end $$;

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

-- 9) attendance_sessions / attendance / student_schedules
do $$ begin
  drop policy if exists att_sess_same_tenant_all on public.attendance_sessions;
  create policy att_sess_read_same_tenant
    on public.attendance_sessions
    for select
    using (tenant_id = public.current_user_tenant_id());
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

do $$ begin
  drop policy if exists att_same_tenant_all on public.attendance;
  create policy att_read_same_tenant
    on public.attendance
    for select
    using (tenant_id = public.current_user_tenant_id());
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

do $$ begin
  drop policy if exists sched_same_tenant_all on public.student_schedules;
  create policy sched_read_same_tenant
    on public.student_schedules
    for select
    using (tenant_id = public.current_user_tenant_id());
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

-- 10) student_todos — 스태프/학생 분리
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

-- 11) todo_templates
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

-- 12) tenant_invitations — owner 전권
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

-- 13) in_app_notifications
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

-- 14) student_activity_logs
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