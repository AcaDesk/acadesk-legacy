-- 022_students.sql
create table if not exists public.students (
  id                uuid primary key default uuid_generate_v4(),
  tenant_id         uuid not null references public.tenants (id),
  user_id           uuid references public.users (id),
  student_code      text not null,
  name              text not null,
  birth_date        date,
  gender            text check (gender in ('male','female','other')),
  student_phone     text,
  profile_image_url text,
  grade             text,
  school            text,
  enrollment_date   date default current_date,
  withdrawal_date   date,
  emergency_contact text,
  notes             text,
  commute_method    text,
  marketing_source  text,
  kiosk_pin         text,
  meta              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'students_student_code_key') then
    alter table public.students drop constraint students_student_code_key;
  end if;
exception when others then null;
end $$;

drop index if exists idx_students_student_code;
create unique index if not exists uq_students_tenant_code_active
  on public.students (tenant_id, student_code)
  where deleted_at is null;

create index if not exists idx_students_tenant_created on public.students (tenant_id, created_at desc) where deleted_at is null;
create index if not exists idx_students_grade          on public.students (grade)                      where deleted_at is null;
create index if not exists idx_students_user_id        on public.students (user_id)                   where deleted_at is null;

-- optional: 이름 검색 최적화
create index if not exists idx_students_name_trgm
  on public.students using gin (name gin_trgm_ops)
  where deleted_at is null;