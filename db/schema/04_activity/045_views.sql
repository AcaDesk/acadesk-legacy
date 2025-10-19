-- 045_views.sql — Helpful views (siblings etc.)

-- 학생 형제자매 뷰: 동일 보호자를 공유하는 학생들 간 연결
create or replace view public.v_student_siblings as
select
  -- use sibling_id as id for deterministic key (sufficient for UI list)
  sg1.student_id as id,
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
join public.students s2 on s2.id = sg2.student_id and s2.deleted_at is null;

grant select on public.v_student_siblings to authenticated;

-- 과목 통계 뷰: 과목 + 해당 과목을 사용하는 클래스 수
create or replace view public.subject_statistics as
select
  s.id,
  s.tenant_id,
  s.name,
  s.description,
  s.code,
  s.color,
  s.sort_order,
  s.active,
  s.meta,
  null::uuid as created_by,
  null::uuid as updated_by,
  s.created_at,
  s.updated_at,
  s.deleted_at,
  coalesce((select count(*) from public.classes c where c.subject_id = s.id and c.deleted_at is null), 0) as class_count
from public.subjects s
where s.deleted_at is null;

grant select on public.subject_statistics to authenticated;

-- 출결 레코드 호환 뷰 (업데이트 가능한 단순 뷰)
-- 일부 API에서 attendance_records 테이블명을 사용하므로, 동일 구조로 노출
create or replace view public.attendance_records as
  select * from public.attendance;

grant select, update on public.attendance_records to authenticated;

-- 직원 초대 호환 뷰 (코드에서 staff_invitations 이름 사용)
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

-- TODO 호환 뷰: 코드 일부가 todos 테이블명을 사용하므로 student_todos를 노출
create or replace view public.todos as
  select * from public.student_todos;

grant select on public.todos to authenticated;
