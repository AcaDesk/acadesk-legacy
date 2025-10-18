-- 300_rls_core.sql
alter table public.tenants       enable row level security;
alter table public.users         enable row level security;
alter table public.students      enable row level security;
alter table public.student_todos enable row level security;

-- tenants
drop policy if exists tenants_select_own on public.tenants;
create policy tenants_select_own
  on public.tenants
  for select
  using (id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists tenants_update_owner on public.tenants;
create policy tenants_update_owner
  on public.tenants
  for update
  using (id = public.current_user_tenant_id() and public.current_user_role() = 'owner');

-- users
drop policy if exists users_select_self on public.users;
create policy users_select_self
  on public.users
  for select
  using (id = auth.uid() and deleted_at is null);

drop policy if exists users_select_tenant on public.users;
create policy users_select_tenant
  on public.users
  for select
  using (tenant_id = public.current_user_tenant_id() and approval_status = 'approved' and deleted_at is null);

drop policy if exists users_select_pending_owner on public.users;
create policy users_select_pending_owner
  on public.users
  for select
  using (tenant_id = public.current_user_tenant_id() and public.current_user_role() = 'owner' and approval_status = 'pending' and deleted_at is null);

drop policy if exists users_update_self on public.users;
create policy users_update_self
  on public.users
  for update
  using (id = auth.uid() and deleted_at is null)
  with check (id = auth.uid());

drop policy if exists users_update_owner on public.users;
create policy users_update_owner
  on public.users
  for update
  using (tenant_id = public.current_user_tenant_id() and public.current_user_role() = 'owner')
  with check (tenant_id = public.current_user_tenant_id());

-- insert guardrails
drop policy if exists users_insert_signup on public.users;
create policy users_insert_signup
  on public.users
  for insert
  with check (id = auth.uid() and tenant_id is null and role_code is null and approval_status is null and onboarding_completed = false);

drop policy if exists users_insert_staff on public.users;
create policy users_insert_staff
  on public.users
  for insert
  with check (public.current_user_role() in ('owner','instructor') and tenant_id = public.current_user_tenant_id() and coalesce(role_code,'student') in ('student') and coalesce(approval_status,'approved') in ('approved') and onboarding_completed = false);

-- students
drop policy if exists students_select_tenant on public.students;
create policy students_select_tenant
  on public.students
  for select
  using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists students_insert_staff on public.students;
create policy students_insert_staff
  on public.students
  for insert
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists students_update_staff on public.students;
create policy students_update_staff
  on public.students
  for update
  using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists students_delete_owner on public.students;
create policy students_delete_owner
  on public.students
  for delete
  using (tenant_id = public.current_user_tenant_id() and public.current_user_role() = 'owner');

-- todos
drop policy if exists todos_select_tenant on public.student_todos;
create policy todos_select_tenant
  on public.student_todos
  for select
  using (tenant_id = public.current_user_tenant_id() and deleted_at is null);

drop policy if exists todos_insert_staff on public.student_todos;
create policy todos_insert_staff
  on public.student_todos
  for insert
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists todos_update_staff on public.student_todos;
create policy todos_update_staff
  on public.student_todos
  for update
  using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'))
  with check (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));

drop policy if exists todos_delete_staff on public.student_todos;
create policy todos_delete_staff
  on public.student_todos
  for delete
  using (tenant_id = public.current_user_tenant_id() and public.current_user_role() in ('owner','instructor'));