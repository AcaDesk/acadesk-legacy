-- ============================================================
-- 206_students_bulk.sql
-- 학생 일괄처리 (등록/수정/삭제/복구/수업배정/PIN발급)
-- ============================================================

-- 1) 일괄 등록 (학생 + 보호자)
create or replace function public.bulk_create_students_with_guardians(_items jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_user_tenant_id();
  v_role text := public.current_user_role();
  v_item jsonb;
  v_student jsonb;
  v_guardians jsonb;
  v_student_id uuid;
  v_g jsonb;
  v_guardian_id uuid;
  v_created_ids uuid[] := '{}';
begin
  if v_tenant is null then
    return public._err('tenant_not_found','테넌트가 없습니다.');
  end if;
  if v_role not in ('owner','instructor') then
    return public._err('forbidden','권한이 없습니다.');
  end if;

  for v_item in select * from jsonb_array_elements(_items) loop
    v_student := v_item->'student';
    v_guardians := coalesce(v_item->'guardians', '[]'::jsonb);

    insert into public.students (
      tenant_id, name, grade, school, student_phone, created_at, updated_at
    ) values (
      v_tenant,
      v_student->>'name',
      v_student->>'grade',
      v_student->>'school',
      v_student->>'student_phone',
      now(), now()
    ) returning id into v_student_id;

    v_created_ids := array_append(v_created_ids, v_student_id);

    for v_g in select * from jsonb_array_elements(v_guardians) loop
      select id into v_guardian_id
        from public.guardians
       where tenant_id = v_tenant
         and phone = v_g->>'phone'
         and deleted_at is null
       limit 1;

      if v_guardian_id is null then
        insert into public.guardians (
          tenant_id, relationship, phone, created_at, updated_at
        ) values (
          v_tenant,
          v_g->>'relationship',
          v_g->>'phone',
          now(), now()
        ) returning id into v_guardian_id;
      end if;

      insert into public.student_guardians (
        tenant_id, student_id, guardian_id,
        is_primary, can_pickup, can_view_reports, relation, created_at
      ) values (
        v_tenant, v_student_id, v_guardian_id,
        coalesce((v_g->>'is_primary')::boolean,false),
        coalesce((v_g->>'can_pickup')::boolean,true),
        coalesce((v_g->>'can_view_reports')::boolean,true),
        v_g->>'relationship',
        now()
      )
      on conflict (student_id, guardian_id) do update
        set is_primary       = excluded.is_primary,
            can_pickup       = excluded.can_pickup,
            can_view_reports = excluded.can_view_reports,
            updated_at       = now();
    end loop;
  end loop;

  return public._ok(jsonb_build_object('student_ids', v_created_ids));
exception when others then
  return public._err('exception', SQLERRM);
end
$$;

grant execute on function public.bulk_create_students_with_guardians(jsonb) to authenticated;


-- 2) 일괄 업데이트
create or replace function public.bulk_update_students(_updates jsonb)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_user_tenant_id();
  v_role text := public.current_user_role();
  v_item jsonb;
begin
  if v_tenant is null then
    return public._err('tenant_not_found','테넌트가 없습니다.');
  end if;
  if v_role not in ('owner','instructor') then
    return public._err('forbidden','권한이 없습니다.');
  end if;

  for v_item in select * from jsonb_array_elements(_updates) loop
    update public.students
       set grade = coalesce(v_item->>'grade', grade),
           school = coalesce(v_item->>'school', school),
           student_phone = coalesce(v_item->>'student_phone', student_phone),
           updated_at = now()
     where id = (v_item->>'id')::uuid and tenant_id = v_tenant;
  end loop;

  return public._ok(jsonb_build_object('updated', true));
exception when others then
  return public._err('exception', SQLERRM);
end
$$;

grant execute on function public.bulk_update_students(jsonb) to authenticated;


-- 3) 일괄 삭제 / 복구
create or replace function public.bulk_soft_delete_students(_student_ids uuid[])
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.students
     set deleted_at = now(), updated_at = now()
   where id = any(_student_ids)
     and tenant_id = public.current_user_tenant_id()
     and public.current_user_role() = 'owner';

  return public._ok(jsonb_build_object('deleted', true));
exception when others then
  return public._err('exception', SQLERRM);
end
$$;

grant execute on function public.bulk_soft_delete_students(uuid[]) to authenticated;


create or replace function public.bulk_restore_students(_student_ids uuid[])
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.students
     set deleted_at = null, updated_at = now()
   where id = any(_student_ids)
     and tenant_id = public.current_user_tenant_id()
     and public.current_user_role() = 'owner';

  return public._ok(jsonb_build_object('restored', true));
exception when others then
  return public._err('exception', SQLERRM);
end
$$;

grant execute on function public.bulk_restore_students(uuid[]) to authenticated;
