-- ============================================================
-- 04) Triggers
-- ------------------------------------------------------------
-- Purpose: Define all trigger functions and triggers for auto-updates,
--           onboarding, synchronization, and security
-- Prerequisites: 01_extensions.sql, 02_schema.sql, 03_helpers.sql
-- ============================================================

-- ============================================================
-- 1. Onboarding: handle user creation (auth.users → public.users)
-- ============================================================

create or replace function public.handle_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _tenant_id uuid;
  _role text;
  _academy_name text;
  _invitation_token text;
begin
  _role := coalesce(new.raw_user_meta_data->>'role', 'owner');
  _academy_name := coalesce(new.raw_user_meta_data->>'academy_name', 'My Academy');
  _invitation_token := new.raw_user_meta_data->>'invitation_token';

  -- 초대 토큰이 있는 경우: 기존 학원에 합류
  if _invitation_token is not null then
    update public.tenant_invitations
      set status = 'accepted', accepted_at = now(), accepted_by = new.id
      where token = _invitation_token and status = 'pending' and expires_at > now()
      returning tenant_id into _tenant_id;

    if _tenant_id is not null then
      insert into public.users(id, tenant_id, email, name, role_code, approval_status, onboarding_completed)
      values (
        new.id,
        _tenant_id,
        coalesce(new.email, public.primary_email(new.id)),
        coalesce(new.raw_user_meta_data->>'name', 'Unknown'),
        'teacher',
        'approved',
        true
      );
      return new;
    end if;
  end if;

  -- owner인 경우 신규 학원 생성
  if _role = 'owner' then
    insert into public.tenants(name, slug)
    values (
      _academy_name,
      lower(replace(_academy_name, ' ', '-'))
    )
    returning id into _tenant_id;

    insert into public.users(id, tenant_id, email, name, role_code, approval_status)
    values (
      new.id,
      _tenant_id,
      coalesce(new.email, public.primary_email(new.id)),
      coalesce(new.raw_user_meta_data->>'name', 'Unknown'),
      'owner',
      'approved'
    );
  end if;

  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_user_created();

-- ============================================================
-- 2. Sync: class.subject_id → class.subject
-- ============================================================

create or replace function public.sync_class_subject_fields()
returns trigger
language plpgsql
as $$
declare
  _subject text;
begin
  if new.subject_id is not null then
    select name into _subject from public.subjects where id = new.subject_id;
    new.subject := _subject;
  end if;
  return new;
end
$$;

drop trigger if exists trg_sync_class_subject on public.classes;
create trigger trg_sync_class_subject
before insert or update on public.classes
for each row execute function public.sync_class_subject_fields();

-- ============================================================
-- 3. Sync: student.name ← user.name
-- ============================================================

create or replace function public.sync_student_name_from_user()
returns trigger
language plpgsql
as $$
begin
  update public.students
     set name = new.name,
         updated_at = now()
   where user_id = new.id;
  return new;
end
$$;

drop trigger if exists trg_sync_student_name_from_user on public.users;
create trigger trg_sync_student_name_from_user
after update of name on public.users
for each row execute function public.sync_student_name_from_user();

-- ============================================================
-- 4. Auto-updated_at triggers
-- ============================================================

-- 각 테이블별 updated_at 자동 갱신
drop trigger if exists trg_u_tenants on public.tenants;
create trigger trg_u_tenants
before update on public.tenants
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_users on public.users;
create trigger trg_u_users
before update on public.users
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_students on public.students;
create trigger trg_u_students
before update on public.students
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_guardians on public.guardians;
create trigger trg_u_guardians
before update on public.guardians
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_subjects on public.subjects;
create trigger trg_u_subjects
before update on public.subjects
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_classes on public.classes;
create trigger trg_u_classes
before update on public.classes
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_class_enrollments on public.class_enrollments;
create trigger trg_u_class_enrollments
before update on public.class_enrollments
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_attendance_sessions on public.attendance_sessions;
create trigger trg_u_attendance_sessions
before update on public.attendance_sessions
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_attendance on public.attendance;
create trigger trg_u_attendance
before update on public.attendance
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_student_schedules on public.student_schedules;
create trigger trg_u_student_schedules
before update on public.student_schedules
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_student_todos on public.student_todos;
create trigger trg_u_student_todos
before update on public.student_todos
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_todo_templates on public.todo_templates;
create trigger trg_u_todo_templates
before update on public.todo_templates
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_in_app_notifications on public.in_app_notifications;
create trigger trg_u_in_app_notifications
before update on public.in_app_notifications
for each row execute function public.update_updated_at_column();

drop trigger if exists trg_u_student_activity_logs on public.student_activity_logs;
create trigger trg_u_student_activity_logs
before update on public.student_activity_logs
for each row execute function public.update_updated_at_column();

-- ============================================================
-- 5. Security: Hash student kiosk PIN before save
-- ============================================================

create or replace function public.hash_kiosk_pin_before_update()
returns trigger
language plpgsql
as $$
begin
  if new.kiosk_pin is not null and new.kiosk_pin <> old.kiosk_pin then
    new.kiosk_pin := crypt(new.kiosk_pin, gen_salt('bf'));
  end if;
  return new;
end
$$;

drop trigger if exists trg_hash_kiosk_pin on public.students;
create trigger trg_hash_kiosk_pin
before insert or update of kiosk_pin on public.students
for each row execute function public.hash_kiosk_pin_before_update();