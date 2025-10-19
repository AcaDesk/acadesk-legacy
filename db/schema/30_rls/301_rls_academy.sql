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
alter table public.exams                 enable row level security;
alter table public.exam_scores           enable row level security;
alter table public.books                 enable row level security;
alter table public.book_lendings         enable row level security;
alter table public.reports               enable row level security;

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

-- write policies for todo_templates
drop policy if exists tmpl_insert_staff on public.todo_templates;
create policy tmpl_insert_staff
  on public.todo_templates
  for insert with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists tmpl_update_staff on public.todo_templates;
create policy tmpl_update_staff
  on public.todo_templates
  for update using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

-- write policies for attendance sessions/records
drop policy if exists att_sess_insert_staff on public.attendance_sessions;
create policy att_sess_insert_staff
  on public.attendance_sessions
  for insert with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists att_sess_update_staff on public.attendance_sessions;
create policy att_sess_update_staff
  on public.attendance_sessions
  for update using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists att_sess_delete_staff on public.attendance_sessions;
create policy att_sess_delete_staff
  on public.attendance_sessions
  for delete using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists attendance_insert_staff on public.attendance;
create policy attendance_insert_staff
  on public.attendance
  for insert with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists attendance_update_staff on public.attendance;
create policy attendance_update_staff
  on public.attendance
  for update using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists attendance_delete_staff on public.attendance;
create policy attendance_delete_staff
  on public.attendance
  for delete using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

-- guardians delete (UI needs deletion)
drop policy if exists guardians_delete_staff on public.guardians;
create policy guardians_delete_staff
  on public.guardians
  for delete using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

-- exams
drop policy if exists exams_select_same_tenant on public.exams;
create policy exams_select_same_tenant
  on public.exams
  for select using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists exams_insert_staff on public.exams;
create policy exams_insert_staff
  on public.exams
  for insert with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists exams_update_staff on public.exams;
create policy exams_update_staff
  on public.exams
  for update using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists exams_delete_staff on public.exams;
create policy exams_delete_staff
  on public.exams
  for delete using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

-- exam_scores
drop policy if exists exam_scores_select_same_tenant on public.exam_scores;
create policy exam_scores_select_same_tenant
  on public.exam_scores
  for select using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists exam_scores_insert_staff on public.exam_scores;
create policy exam_scores_insert_staff
  on public.exam_scores
  for insert with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists exam_scores_update_staff on public.exam_scores;
create policy exam_scores_update_staff
  on public.exam_scores
  for update using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

-- books
drop policy if exists books_select_same_tenant on public.books;
create policy books_select_same_tenant
  on public.books
  for select using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists books_write_staff on public.books;
create policy books_write_staff
  on public.books
  for all using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

-- book_lendings
drop policy if exists lendings_select_same_tenant on public.book_lendings;
create policy lendings_select_same_tenant
  on public.book_lendings
  for select using (tenant_id = public.current_user_tenant_id());

drop policy if exists lendings_write_staff on public.book_lendings;
create policy lendings_write_staff
  on public.book_lendings
  for all using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

-- reports
drop policy if exists reports_select_same_tenant on public.reports;
create policy reports_select_same_tenant
  on public.reports
  for select using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists reports_write_staff on public.reports;
create policy reports_write_staff
  on public.reports
  for all using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));
