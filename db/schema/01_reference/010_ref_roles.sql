-- 010_ref_roles.sql
create table if not exists public.ref_roles (
  code        text primary key,
  label       text not null,
  description text,
  created_at  timestamptz not null default now()
);

insert into public.ref_roles (code, label, description) values
  ('owner',      '원장',   '학원 소유자 및 최고 관리자'),
  ('instructor', '강사',   '수업 담당 강사'),
  ('assistant',  '조교',   '수업 보조 및 행정 업무')
  ('student',    '학생',   '수강 학생'),                -- ✅ 추가
  ('parent',     '보호자', '학생 보호자/학부모')         -- ⓘ 선택: 보호자계정 쓸 경우
on conflict (code) do nothing;