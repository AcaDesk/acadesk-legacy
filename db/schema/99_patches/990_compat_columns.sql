-- 990_compat_columns.sql
-- Backward-compatibility columns used by UI queries

-- students.student_number (alias of student_code for some queries)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'students' and column_name = 'student_number'
  ) then
    alter table public.students add column student_number text;
    update public.students set student_number = student_code where student_number is null;
  end if;
end $$;

