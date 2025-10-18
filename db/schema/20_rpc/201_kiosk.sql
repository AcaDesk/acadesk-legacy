-- 201_kiosk.sql
-- anon 호출 허용이므로 SECURITY DEFINER + 테넌트 가드 적용
create or replace function public.get_student_todos_for_kiosk(
  p_student_id uuid,
  p_date       date,
  p_pin        text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash   text;
  v_tenant uuid;
  v_todos  json;
begin
  select kiosk_pin, tenant_id into v_hash, v_tenant
  from public.students
  where id = p_student_id and deleted_at is null;

  if v_hash is null then return '[]'::json; end if;
  if crypt(p_pin, v_hash) <> v_hash then return '[]'::json; end if;

  select json_agg(json_build_object(
    'id', id,
    'title', title,
    'subject', subject,
    'priority', priority,
    'completed_at', completed_at,
    'verified_at', verified_at,
    'notes', notes,
    'description', description,
    'estimated_duration_minutes', estimated_duration_minutes
  ) order by created_at)
  into v_todos
  from public.student_todos
  where student_id = p_student_id
    and tenant_id  = v_tenant
    and due_date   = p_date
    and deleted_at is null;

  return coalesce(v_todos, '[]'::json);
end
$$;

grant execute on function public.get_student_todos_for_kiosk(uuid, date, text) to anon;