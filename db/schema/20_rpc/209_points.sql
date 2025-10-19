-- 209_points.sql — Stubbed student points RPCs to avoid client errors

-- 현재 포인트 기능은 UI 안전을 위한 스텁 구현입니다.
-- 실제 구현 시 student_points/point_history 테이블 설계 후 교체하세요.

create or replace function public.get_student_point_balance(p_student_id uuid)
returns int
language sql
stable
as $$
  select 0::int
$$;

-- 반환 스키마: id, point_type, point_label, points, reason, awarded_date, awarded_by_name, created_at
create or replace function public.get_student_point_history(p_student_id uuid, p_limit int default 20)
returns table (
  id uuid,
  point_type text,
  point_label text,
  points int,
  reason text,
  awarded_date date,
  awarded_by_name text,
  created_at timestamptz
)
language sql
stable
as $$
  select null::uuid, null::text, null::text, 0::int, null::text, null::date, null::text, now()
  where false
$$;

grant execute on function public.get_student_point_balance(uuid) to authenticated;
grant execute on function public.get_student_point_history(uuid, int) to authenticated;
