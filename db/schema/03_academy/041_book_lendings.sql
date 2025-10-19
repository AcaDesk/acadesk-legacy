-- 041_book_lendings.sql
create table if not exists public.book_lendings (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  book_id          uuid not null references public.books(id) on delete cascade,
  student_id       uuid not null references public.students(id) on delete cascade,
  borrowed_at      date not null default current_date,
  due_date         date not null,
  returned_at      date,
  return_condition text,
  reminder_sent_at timestamptz,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_lendings_tenant_dates on public.book_lendings(tenant_id, borrowed_at desc, due_date desc);
create index if not exists idx_lendings_student       on public.book_lendings(student_id);
create index if not exists idx_lendings_book          on public.book_lendings(book_id);
