create table if not exists public.students (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id),
  user_id           uuid references public.users (id), -- 학생 계정이 있을 경우 연결
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
  notes             text,
  commute_method    text,
  marketing_source  text,
  emergency_contact text,
  kiosk_pin         text, -- bcrypt hash 등
  meta              jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

-- 동일 학원 내 학번(unique)
create unique index if not exists uq_students_tenant_code_active
  on public.students (tenant_id, student_code)
  where deleted_at is null;

-- 조회 성능 인덱스
create index if not exists idx_students_tenant_created on public.students (tenant_id, created_at desc) where deleted_at is null;
create index if not exists idx_students_grade          on public.students (grade)                      where deleted_at is null;
create index if not exists idx_students_user_id        on public.students (user_id)                   where deleted_at is null;

-- 이름 검색 최적화
create extension if not exists pg_trgm;
create index if not exists idx_students_name_trgm
  on public.students using gin (name gin_trgm_ops)
  where deleted_at is null;
