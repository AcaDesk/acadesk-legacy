-- 101_triggers.sql — Attach updated_at triggers to tables (idempotent)

do $$
begin
  -- helper to attach trigger if column exists
  perform 1;
end $$;

-- Core
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_tenants_updated_at'
  ) then
    create trigger trg_tenants_updated_at
      before update on public.tenants
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_users_updated_at') then
    create trigger trg_users_updated_at
      before update on public.users
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_students_updated_at') then
    create trigger trg_students_updated_at
      before update on public.students
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_student_todos_updated_at') then
    create trigger trg_student_todos_updated_at
      before update on public.student_todos
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

-- Academy
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_subjects_updated_at') then
    create trigger trg_subjects_updated_at
      before update on public.subjects
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_classes_updated_at') then
    create trigger trg_classes_updated_at
      before update on public.classes
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_enrollments_updated_at') then
    create trigger trg_enrollments_updated_at
      before update on public.class_enrollments
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_attendance_sessions_updated_at') then
    create trigger trg_attendance_sessions_updated_at
      before update on public.attendance_sessions
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_attendance_updated_at') then
    create trigger trg_attendance_updated_at
      before update on public.attendance
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_guardians_updated_at') then
    create trigger trg_guardians_updated_at
      before update on public.guardians
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_student_guardians_updated_at') then
    create trigger trg_student_guardians_updated_at
      before update on public.student_guardians
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_student_schedules_updated_at') then
    create trigger trg_student_schedules_updated_at
      before update on public.student_schedules
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_todo_templates_updated_at') then
    create trigger trg_todo_templates_updated_at
      before update on public.todo_templates
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

-- Grades / Library / Reports
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_exams_updated_at') then
    create trigger trg_exams_updated_at
      before update on public.exams
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_exam_scores_updated_at') then
    create trigger trg_exam_scores_updated_at
      before update on public.exam_scores
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_books_updated_at') then
    create trigger trg_books_updated_at
      before update on public.books
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_book_lendings_updated_at') then
    create trigger trg_book_lendings_updated_at
      before update on public.book_lendings
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_reports_updated_at') then
    create trigger trg_reports_updated_at
      before update on public.reports
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

-- Calendar / Class sessions / Consultations / Tenant codes
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_calendar_events_updated_at') then
    create trigger trg_calendar_events_updated_at
      before update on public.calendar_events
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_class_sessions_updated_at') then
    create trigger trg_class_sessions_updated_at
      before update on public.class_sessions
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_consultations_updated_at') then
    create trigger trg_consultations_updated_at
      before update on public.consultations
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_tenant_codes_updated_at') then
    create trigger trg_tenant_codes_updated_at
      before update on public.tenant_codes
      for each row execute procedure public.update_updated_at_column();
  end if;
end $$;
