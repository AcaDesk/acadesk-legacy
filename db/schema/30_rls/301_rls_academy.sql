-- 301_rls_academy.sql
alter table public.subjects              enable row level security;
alter table public.classes               enable row level security;
alter table public.class_enrollments     enable row level security;
alter table public.attendance_sessions   enable row level security;
alter table public.attendance            enable row level security;
alter table public.guardians             enable row level security;
alter table public.student_guardians     enable row level security;
alter table public.student_schedules     enable row level security;
alter table public.todo_templates        enable row level security;
alter table public.in_app_notifications  enable row level security;
alter table public.student_activity_logs enable row level security;

-- select만 우선
drop policy if exists subjects_select_same_tenant on public.subjects;
create policy subjects_select_same_tenant
  on public.subjects
  for select using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists classes_select_same_tenant on public.classes;
create policy classes_select_same_tenant
  on public.classes
  for select using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists enroll_select_same_tenant on public.class_enrollments;
create policy enroll_select_same_tenant
  on public.class_enrollments
  for select using (tenant_id = public.current_user_tenant_id());

drop policy if exists att_sess_select_same_tenant on public.attendance_sessions;
create policy att_sess_select_same_tenant
  on public.attendance_sessions
  for select using (tenant_id = public.current_user_tenant_id());

drop policy if exists attendance_select_same_tenant on public.attendance;
create policy attendance_select_same_tenant
  on public.attendance
  for select using (tenant_id = public.current_user_tenant_id());

drop policy if exists guardians_select_same_tenant on public.guardians;
create policy guardians_select_same_tenant
  on public.guardians
  for select using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists sg_select_same_tenant on public.student_guardians;
create policy sg_select_same_tenant
  on public.student_guardians
  for select using (tenant_id = public.current_user_tenant_id());

drop policy if exists sched_select_same_tenant on public.student_schedules;
create policy sched_select_same_tenant
  on public.student_schedules
  for select using (tenant_id = public.current_user_tenant_id());

drop policy if exists tmpl_select_same_tenant on public.todo_templates;
create policy tmpl_select_same_tenant
  on public.todo_templates
  for select using (tenant_id = public.current_user_tenant_id());

drop policy if exists notif_select_same_user_tenant on public.in_app_notifications;
create policy notif_select_same_user_tenant
  on public.in_app_notifications
  for select using (tenant_id = public.current_user_tenant_id() and user_id = auth.uid());

drop policy if exists logs_select_same_tenant on public.student_activity_logs;
create policy logs_select_same_tenant
  on public.student_activity_logs
  for select using (tenant_id = public.current_user_tenant_id() and deleted_at is null);