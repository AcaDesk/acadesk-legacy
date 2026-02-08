-- 20260208000001_attendance_session_unique_constraint.sql
-- Fix: attendance_sessions 테이블에 (tenant_id, class_id, session_date) 유니크 제약 추가
-- 동시 요청으로 인한 세션 중복 생성 방지

-- 1. 기존 중복 데이터 정리 (중복 시 최신 세션만 유지, 나머지 삭제)
-- 먼저 중복된 세션 중 가장 오래된 것에 연결된 출석 레코드를 최신 세션으로 이동
with duplicates as (
  select
    id,
    tenant_id,
    class_id,
    session_date,
    row_number() over (
      partition by tenant_id, class_id, session_date
      order by created_at desc
    ) as rn
  from public.attendance_sessions
),
keeper as (
  select id, tenant_id, class_id, session_date
  from duplicates
  where rn = 1
),
to_delete as (
  select d.id as old_id, k.id as new_id
  from duplicates d
  join keeper k
    on d.tenant_id = k.tenant_id
    and d.class_id = k.class_id
    and d.session_date = k.session_date
  where d.rn > 1
)
update public.attendance a
set session_id = td.new_id
from to_delete td
where a.session_id = td.old_id;

-- 중복 세션 삭제
with duplicates as (
  select
    id,
    row_number() over (
      partition by tenant_id, class_id, session_date
      order by created_at desc
    ) as rn
  from public.attendance_sessions
)
delete from public.attendance_sessions
where id in (select id from duplicates where rn > 1);

-- 2. 유니크 인덱스 추가
create unique index if not exists idx_att_sess_tenant_class_date
  on public.attendance_sessions (tenant_id, class_id, session_date);
