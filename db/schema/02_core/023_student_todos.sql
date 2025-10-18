-- 023_student_todos.sql
create table if not exists public.student_todos (
  id                           uuid primary key default uuid_generate_v4(),
  tenant_id                    uuid not null references public.tenants (id),
  student_id                   uuid not null references public.students (id) on delete cascade,
  title                        text not null,
  description                  text,
  subject                      text,
  due_date                     date not null,
  due_day_of_week              int not null default 0 check (due_day_of_week between 0 and 6),
  priority                     text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  estimated_duration_minutes   int,
  completed_at                 timestamptz,
  verified_at                  timestamptz,
  verified_by                  uuid references public.users (id),
  notes                        text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now(),
  deleted_at                   timestamptz
);

create index if not exists idx_todos_tenant_due on public.student_todos (tenant_id, due_date);
create index if not exists idx_todos_student    on public.student_todos (student_id);
create index if not exists idx_todos_completed  on public.student_todos (tenant_id, completed_at);
create index if not exists idx_todos_verified   on public.student_todos (tenant_id, verified_at);