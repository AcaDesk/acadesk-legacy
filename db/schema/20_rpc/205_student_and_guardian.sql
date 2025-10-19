-- 205_student_guardian_crud.sql
-- 현재 스키마(guardians.phone, student_guardians.is_primary 등)에 맞춘 CRUD RPC 세트

------------------------------------------------------------
-- 학생 + 보호자 N명 동시 등록
-- _student: { name, student_code?, grade?, school?, student_phone?, notes?, emergency_contact? }
-- _guardians: [
--   { phone, relationship?, is_primary?, can_pickup?, can_view_reports? },
--   ...
-- ]
------------------------------------------------------------
create or replace function public.create_student_with_guardians(
  _student   jsonb,
  _guardians jsonb default '[]'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id  uuid := public.current_user_tenant_id();
  v_role       text := public.current_user_role();
  v_student_id uuid;
  v_g          jsonb;
  v_guardian_id uuid;
begin
  if v_tenant_id is null then
    return public._err('tenant_not_found','테넌트가 없습니다.');
  end if;
  if v_role not in ('owner','instructor') then
    return public._err('forbidden','권한이 없습니다.');
  end if;

  if coalesce(trim(_student->>'name'),'') = '' then
    return public._err('invalid_input','학생 이름(name)이 필요합니다.');
  end if;

  insert into public.students (
    tenant_id, name, student_code, grade, school,
    student_phone, notes, created_at, updated_at
  )
  values (
    v_tenant_id,
    _student->>'name',
    nullif(_student->>'student_code',''),
    nullif(_student->>'grade',''),
    nullif(_student->>'school',''),
    nullif(_student->>'student_phone',''),
    nullif(_student->>'notes',''),
    now(), now()
  )
  returning id into v_student_id;

  -- 학생 부가 속성 업데이트 필요 시 확장 가능

  -- 보호자들 생성/연결
  for v_g in select * from jsonb_array_elements(coalesce(_guardians,'[]'::jsonb)) loop
    -- 기존 보호자 탐색 (tenant_id + phone)
    select g.id into v_guardian_id
    from public.guardians g
    where g.tenant_id = v_tenant_id
      and g.phone = v_g->>'phone'
      and g.deleted_at is null
    limit 1;

    if v_guardian_id is null then
      insert into public.guardians(
        tenant_id, relationship, phone, occupation, address,
        created_at, updated_at
      )
      values (
        v_tenant_id,
        nullif(v_g->>'relationship',''),
        nullif(v_g->>'phone',''),
        null, null,
        now(), now()
      )
      returning id into v_guardian_id;
    else
      -- 간단 업데이트(관계 갱신)
      update public.guardians
         set relationship = coalesce(nullif(v_g->>'relationship',''), relationship),
             updated_at   = now()
       where id = v_guardian_id;
    end if;

    -- 연결 upsert
    insert into public.student_guardians(
      tenant_id, student_id, guardian_id,
      is_primary, can_pickup, can_view_reports, relation, created_at
    )
    values (
      v_tenant_id, v_student_id, v_guardian_id,
      coalesce((v_g->>'is_primary')::boolean,false),
      coalesce((v_g->>'can_pickup')::boolean,true),
      coalesce((v_g->>'can_view_reports')::boolean,true),
      nullif(v_g->>'relationship',''),
      now()
    )
    on conflict (student_id, guardian_id) do update
      set is_primary       = excluded.is_primary,
          can_pickup       = excluded.can_pickup,
          can_view_reports = excluded.can_view_reports,
          relation         = excluded.relation,
          updated_at       = now();
  end loop;

  return public._ok(json_build_object('student_id', v_student_id));
exception when others then
  return public._err('exception', SQLERRM);
end
$$;

grant execute on function public.create_student_with_guardians(jsonb, jsonb) to authenticated;

------------------------------------------------------------
-- 기존 학생에 보호자 추가/업서트 + 연결
------------------------------------------------------------
create or replace function public.upsert_guardian_and_link(
  _student_id   uuid,
  _phone        text,
  _relationship text default null,
  _is_primary   boolean default false,
  _can_pickup   boolean default true,
  _can_view_reports boolean default true
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id  uuid := public.current_user_tenant_id();
  v_role       text := public.current_user_role();
  v_guardian_id uuid;
begin
  if v_tenant_id is null then
    return public._err('tenant_not_found','테넌트가 없습니다.');
  end if;
  if v_role not in ('owner','instructor') then
    return public._err('forbidden','권한이 없습니다.');
  end if;

  if coalesce(trim(_phone),'') = '' then
    return public._err('invalid_input','phone는 필수입니다.');
  end if;

  -- 학생 존재/테넌트 검사
  if not exists (
    select 1 from public.students s
    where s.id = _student_id and s.tenant_id = v_tenant_id and s.deleted_at is null
  ) then
    return public._err('invalid_student','학생이 없거나 테넌트가 다릅니다.');
  end if;

  -- 보호자 찾기 또는 생성
  select g.id into v_guardian_id
  from public.guardians g
  where g.tenant_id = v_tenant_id
    and g.phone = _phone
    and g.deleted_at is null
  limit 1;

  if v_guardian_id is null then
    insert into public.guardians(
      tenant_id, relationship, phone, occupation, address,
      created_at, updated_at
    )
    values (
      v_tenant_id,
      nullif(_relationship,''),
      _phone,
      null, null,
      now(), now()
    )
    returning id into v_guardian_id;
  else
    update public.guardians
       set relationship = coalesce(nullif(_relationship,''), relationship),
           updated_at   = now()
     where id = v_guardian_id;
  end if;

  -- 연결 upsert
  insert into public.student_guardians(
    tenant_id, student_id, guardian_id,
    is_primary, can_pickup, can_view_reports, relation, created_at
  )
  values (
    v_tenant_id, _student_id, v_guardian_id,
    coalesce(_is_primary,false),
    coalesce(_can_pickup,true),
    coalesce(_can_view_reports,true),
    nullif(_relationship,''),
    now()
  )
  on conflict (student_id, guardian_id) do update
    set is_primary       = excluded.is_primary,
        can_pickup       = excluded.can_pickup,
        can_view_reports = excluded.can_view_reports,
        relation         = excluded.relation,
        updated_at       = now();

  return public._ok(json_build_object('guardian_id', v_guardian_id));
exception when others then
  return public._err('exception', SQLERRM);
end
$$;

grant execute on function public.upsert_guardian_and_link(uuid, text, text, boolean, boolean, boolean) to authenticated;

------------------------------------------------------------
-- 학생-보호자 연결 해제
------------------------------------------------------------
create or replace function public.unlink_student_guardian(
  _student_id  uuid,
  _guardian_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_user_tenant_id();
  v_role      text := public.current_user_role();
begin
  if v_tenant_id is null then
    return public._err('tenant_not_found','테넌트가 없습니다.');
  end if;
  if v_role not in ('owner','instructor') then
    return public._err('forbidden','권한이 없습니다.');
  end if;

  delete from public.student_guardians
   where tenant_id = v_tenant_id
     and student_id = _student_id
     and guardian_id = _guardian_id;

  return public._ok();
exception when others then
  return public._err('exception', SQLERRM);
end
$$;

grant execute on function public.unlink_student_guardian(uuid, uuid) to authenticated;
