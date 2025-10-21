-- 045_views.sql — Helpful views (siblings, subjects, todos, etc.)

------------------------------------------------------------
-- 1) 형제자매 뷰: 동일 보호자를 공유하는 학생들
------------------------------------------------------------
create or replace view public.v_student_siblings as
select
  sg1.student_id as id,              -- UI용 고유 키
  sg1.student_id,
  sg2.student_id as sibling_id,
  s2.student_code as sibling_code,
  s2.name         as sibling_name,
  s2.grade        as sibling_grade,
  s2.birth_date   as sibling_birth_date
from public.student_guardians sg1
join public.student_guardians sg2
  on sg1.guardian_id = sg2.guardian_id
 and sg1.student_id <> sg2.student_id
join public.students s2
  on s2.id = sg2.student_id
 and s2.deleted_at is null;

grant select on public.v_student_siblings to authenticated;


------------------------------------------------------------
-- 2) 과목 통계 뷰: 과목 + 해당 과목을 사용하는 클래스 수
------------------------------------------------------------
create or replace view public.subject_statistics as
select
  s.id,
  s.tenant_id,
  s.name,
  s.code,
  s.color,
  s.sort_order,
  s.active,
  s.meta,
  s.created_at,
  s.updated_at,
  s.deleted_at,
  coalesce(
    (select count(*)
       from public.classes c
      where c.subject_id = s.id
        and c.deleted_at is null), 0
  ) as class_count
from public.subjects s
where s.deleted_at is null;

grant select on public.subject_statistics to authenticated;


------------------------------------------------------------
-- 3) 출결 레코드 호환 뷰 (attendance_records)
------------------------------------------------------------
create or replace view public.attendance_records as
  select * from public.attendance;

grant select, update on public.attendance_records to authenticated;


------------------------------------------------------------
-- 4) 직원 초대 호환 뷰 (staff_invitations)
-- ⚠️ public.staff_invites 테이블이 존재해야 합니다.
------------------------------------------------------------
create or replace view public.staff_invitations as
select
  id,
  tenant_id,
  created_by as invited_by,
  email,
  role_code,
  token,
  status,
  expires_at,
  accepted_at,
  created_at
from public.staff_invites;

grant select, update on public.staff_invitations to authenticated;


------------------------------------------------------------
-- 5) TODO 호환 뷰 (todos → student_todos)
------------------------------------------------------------
create or replace view public.todos as
  select * from public.student_todos;

grant select on public.todos to authenticated;