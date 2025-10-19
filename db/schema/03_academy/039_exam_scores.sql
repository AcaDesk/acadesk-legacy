-- 039_exam_scores.sql
create table if not exists public.exam_scores (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  exam_id       uuid not null references public.exams(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  score         int not null,
  total_points  int not null,
  percentage    numeric(5,2) not null,
  feedback      text,
  is_retest     boolean not null default false,
  retest_count  int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (exam_id, student_id)
);

create index if not exists idx_exam_scores_exam       on public.exam_scores(exam_id) where deleted_at is null;
create index if not exists idx_exam_scores_student    on public.exam_scores(student_id) where deleted_at is null;
create index if not exists idx_exam_scores_percentage on public.exam_scores(percentage);
