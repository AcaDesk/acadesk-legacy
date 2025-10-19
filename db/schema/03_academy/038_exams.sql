-- 038_exams.sql
create table if not exists public.exams (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  class_id        uuid references public.classes(id) on delete set null,
  name            text not null,
  category_code   text references public.ref_exam_categories(code) on delete set null,
  exam_type       text, -- written/oral/practical/quiz/project (optional)
  exam_date       timestamptz,
  total_questions int,
  is_recurring    boolean not null default false,
  recurring_schedule text,
  description     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index if not exists idx_exams_tenant_date on public.exams(tenant_id, exam_date desc) where deleted_at is null;
create index if not exists idx_exams_class        on public.exams(class_id) where deleted_at is null;
create index if not exists idx_exams_category     on public.exams(category_code) where deleted_at is null;
