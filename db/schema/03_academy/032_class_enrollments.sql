-- 032_class_enrollments.sql
create table if not exists public.class_enrollments(
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants(id) on delete cascade,
  class_id           uuid not null references public.classes(id) on delete cascade,
  student_id         uuid not null references public.students(id) on delete cascade,
  enrolled_at        timestamptz not null default now(),
  end_date           date,
  withdrawal_reason  text,
  notes              text,
  status             text not null default 'active',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (class_id, student_id)
);

create index if not exists idx_enroll_tenant_class_student on public.class_enrollments(tenant_id, class_id, student_id);
create index if not exists idx_enroll_end_date            on public.class_enrollments(tenant_id, end_date);