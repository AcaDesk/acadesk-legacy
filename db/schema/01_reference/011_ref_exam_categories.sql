-- 011_ref_exam_categories.sql
create table if not exists public.ref_exam_categories (
  code       text primary key,
  label      text not null,
  active     boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

insert into public.ref_exam_categories(code, label, sort_order) values
  ('midterm', '중간고사', 10),
  ('final',   '기말고사', 20),
  ('quiz',    '퀴즈',     30),
  ('mock',    '모의고사', 40),
  ('practice','연습시험', 50)
on conflict (code) do nothing;

grant select on table public.ref_exam_categories to authenticated;
