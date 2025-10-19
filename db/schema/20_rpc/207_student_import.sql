-- ============================================================
-- 207_student_import.sql
-- Excel 업로드: "미리보기 & 확인(Commit)" 기반 안전 마이그레이션 RPC
-- - preview_student_import: DB 비변경, 미리보기용 JSON 생성
-- - confirm_student_import: 원자적 트랜잭션으로 반영
-- 스키마 가정(현재 구조):
--   students(name, birth_date, grade, school, student_phone, student_code?, notes?, ...)
--   guardians(relationship, phone, ...)
--   student_guardians(is_primary, can_pickup, can_view_reports, relation, ...)
-- 중복 기준:
--   학생: (tenant_id, name, birth_date)
--   보호자: (tenant_id, phone)
-- 권한:
--   owner/instructor만 사용 가능
-- ============================================================

-- 유효성 검사: 날짜 문자열을 date로 안전 변환 (YYYY-MM-DD)
create or replace function public._parse_date(_s text)
returns date
language plpgsql
as $$
declare
  d date;
begin
  if _s is null or btrim(_s) = '' then
    return null;
  end if;
  begin
    d := (_s)::date; -- ISO yyyy-mm-dd 기대
  exception when others then
    return null;
  end;
  return d;
end
$$;

-- Helper: 현재 테넌트/권한 체크
create or replace function public._must_be_staff()
returns void
language plpgsql
as $$
declare
  v_tenant uuid := public.current_user_tenant_id();
  v_role   text := public.current_user_role();
begin
  if v_tenant is null then
    raise exception 'tenant_not_found';
  end if;
  if v_role not in ('owner','instructor') then
    raise exception 'forbidden';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 1) PREVIEW: 업로드된 rows를 분석해 신규/중복/오류 분류
-- _items: [
--  {
--    student: {
--      name*, birth_date*(YYYY-MM-DD), grade?, school?, student_phone?,
--      student_code?, notes?
--    },
--    guardians: [
--      { phone*, relationship?, is_primary?, can_pickup?, can_view_reports? }, ...
--    ]
--  }, ...
-- ]
-- 반환 예시:
-- {
--   "success": true,
--   "summary": { "total": 100, "newCount": 70, "dupCount": 25, "errorCount": 5 },
--   "new":        [ {rowIndex, student, guardians}... ],
--   "duplicates": [ {rowIndex, student, guardians, existingStudent, diffs}... ],
--   "errors":     [ {rowIndex, reason}... ]
-- }
-- ------------------------------------------------------------
create or replace function public.preview_student_import(_items jsonb)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_tenant uuid := public.current_user_tenant_id();
  v_role   text := public.current_user_role();

  v_idx    int  := 0;
  v_item   jsonb;
  v_stu    jsonb;
  v_guards jsonb;

  v_name   text;
  v_bd     date;
  v_grade  text;
  v_school text;
  v_phone  text;
  v_code   text;
  v_notes  text;

  v_existing record;
  v_row jsonb;

  j_new        jsonb := '[]'::jsonb;
  j_dups       jsonb := '[]'::jsonb;
  j_errors     jsonb := '[]'::jsonb;

  v_total int := 0;
  v_new   int := 0;
  v_dup   int := 0;
  v_err   int := 0;
begin
  perform public._must_be_staff(); -- 권한/테넌트 체크

  if _items is null or jsonb_typeof(_items) <> 'array' then
    return json_build_object('success', false, 'message', 'items must be a JSON array');
  end if;

  for v_item in
    select * from jsonb_array_elements(_items)
  loop
    v_total := v_total + 1;
    v_idx := v_idx + 1;

    v_stu    := v_item->'student';
    v_guards := coalesce(v_item->'guardians', '[]'::jsonb);

    -- 필수값
    v_name   := nullif(trim(both from v_stu->>'name'), '');
    v_bd     := public._parse_date(v_stu->>'birth_date');

    if v_name is null or v_bd is null then
      v_err := v_err + 1;
      j_errors := j_errors || jsonb_build_array(
        jsonb_build_object('rowIndex', v_idx, 'reason', '학생 이름 또는 생년월일 형식 오류/누락')
      );
      continue;
    end if;

    v_grade  := nullif(v_stu->>'grade','');
    v_school := nullif(v_stu->>'school','');
    v_phone  := nullif(v_stu->>'student_phone','');
    v_code   := nullif(v_stu->>'student_code','');
    v_notes  := nullif(v_stu->>'notes','');

    -- 기존 학생 조회 (동명이인 + 생년월일 기준)
    select s.* into v_existing
      from public.students s
     where s.tenant_id = v_tenant
       and s.deleted_at is null
       and lower(s.name) = lower(v_name)
       and s.birth_date = v_bd
     limit 1;

    if not found then
      -- 신규
      v_new := v_new + 1;
      j_new := j_new || jsonb_build_array(
        jsonb_build_object(
          'rowIndex', v_idx,
          'student', jsonb_build_object(
            'name', v_name, 'birth_date', v_bd,
            'grade', v_grade, 'school', v_school,
            'student_phone', v_phone, 'student_code', v_code, 'notes', v_notes
          ),
          'guardians', v_guards
        )
      );
    else
      -- 중복(기존값 vs 업로드값 차이점 비교 간단 버전)
      v_dup := v_dup + 1;
      j_dups := j_dups || jsonb_build_array(
        jsonb_build_object(
          'rowIndex', v_idx,
          'student',
            jsonb_build_object(
              'name', v_name, 'birth_date', v_bd,
              'grade', v_grade, 'school', v_school,
              'student_phone', v_phone, 'student_code', v_code, 'notes', v_notes
            ),
          'existingStudent',
            jsonb_build_object(
              'id', v_existing.id,
              'grade', v_existing.grade, 'school', v_existing.school,
              'student_phone', v_existing.student_phone, 'student_code', v_existing.student_code, 'notes', v_existing.notes
            ),
          'guardians', v_guards
        )
      );
    end if;
  end loop;

  return json_build_object(
    'success', true,
    'summary', json_build_object('total', v_total, 'newCount', v_new, 'dupCount', v_dup, 'errorCount', v_err),
    'new',        j_new,
    'duplicates', j_dups,
    'errors',     j_errors
  );
exception
  when others then
    return json_build_object('success', false, 'message', SQLERRM);
end
$$;

grant execute on function public.preview_student_import(jsonb) to authenticated;

-- ------------------------------------------------------------
-- 2) CONFIRM: 미리보기로 확인한 rows를 실제 반영
-- _on_duplicate: 'skip' (기본) | 'update'
--  - skip   : 기존 학생은 건너뜀
--  - update : 기존 학생의 grade/school/phone/student_code/notes 를 업로드 값으로 갱신
-- 트랜잭션 전체 원자성 보장
-- ------------------------------------------------------------
create or replace function public.confirm_student_import(
  _items jsonb,
  _on_duplicate text default 'skip'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := public.current_user_tenant_id();
  v_role   text := public.current_user_role();

  v_idx    int  := 0;
  v_item   jsonb;
  v_stu    jsonb;
  v_guards jsonb;

  v_name   text;
  v_bd     date;
  v_grade  text;
  v_school text;
  v_phone  text;
  v_code   text;
  v_notes  text;

  v_student_id uuid;
  v_existing record;

  v_g   jsonb;
  v_gid uuid;

  v_total int := 0;
  v_created int := 0;
  v_updated int := 0;
  v_linked  int := 0;
begin
  perform public._must_be_staff();

  if _on_duplicate is null or _on_duplicate not in ('skip', 'update') then
    _on_duplicate := 'skip';
  end if;

  if _items is null or jsonb_typeof(_items) <> 'array' then
    return json_build_object('success', false, 'message', 'items must be a JSON array');
  end if;

  -- 전체를 하나의 트랜잭션으로
  perform pg_advisory_xact_lock( hashtext('confirm_student_import_' || v_tenant::text) );

  for v_item in select * from jsonb_array_elements(_items) loop
    v_total := v_total + 1;
    v_idx := v_idx + 1;

    v_stu    := v_item->'student';
    v_guards := coalesce(v_item->'guardians', '[]'::jsonb);

    v_name := nullif(trim(both from v_stu->>'name'), '');
    v_bd   := public._parse_date(v_stu->>'birth_date');
    if v_name is null or v_bd is null then
      -- 잘못된 행은 건너뜀 (미리보기 단계에서 걸러졌다는 가정)
      continue;
    end if;

    v_grade  := nullif(v_stu->>'grade','');
    v_school := nullif(v_stu->>'school','');
    v_phone  := nullif(v_stu->>'student_phone','');
    v_code   := nullif(v_stu->>'student_code','');
    v_notes  := nullif(v_stu->>'notes','');

    -- 기존 학생 조회
    select s.* into v_existing
      from public.students s
     where s.tenant_id = v_tenant
       and s.deleted_at is null
       and lower(s.name) = lower(v_name)
       and s.birth_date = v_bd
     limit 1;

    if not found then
      -- 신규 생성
      insert into public.students(
        tenant_id, name, birth_date, grade, school, student_phone, student_code, notes,
        created_at, updated_at
      ) values (
        v_tenant, v_name, v_bd, v_grade, v_school, v_phone, v_code, v_notes, now(), now()
      )
      returning id into v_student_id;

      v_created := v_created + 1;
    else
      v_student_id := v_existing.id;

      if _on_duplicate = 'update' then
        update public.students
           set grade         = coalesce(v_grade, grade),
               school        = coalesce(v_school, school),
               student_phone = coalesce(v_phone, student_phone),
               student_code  = coalesce(v_code, student_code),
               notes         = coalesce(v_notes, notes),
               updated_at    = now()
         where id = v_student_id;
        v_updated := v_updated + 1;
      end if;
    end if;

    -- 보호자들 업서트 + 연결
    for v_g in select * from jsonb_array_elements(v_guards) loop
      if coalesce(trim(both from v_g->>'phone'), '') = '' then
        continue;
      end if;

      select g.id into v_gid
        from public.guardians g
       where g.tenant_id = v_tenant
         and g.phone = v_g->>'phone'
         and g.deleted_at is null
       limit 1;

      if v_gid is null then
        insert into public.guardians(
          tenant_id, relationship, phone, created_at, updated_at
        ) values (
          v_tenant,
          nullif(v_g->>'relationship',''),
          v_g->>'phone',
          now(), now()
        ) returning id into v_gid;
      else
        -- 관계 갱신 정도만 (필요시 확장)
        update public.guardians
           set relationship = coalesce(nullif(v_g->>'relationship',''), relationship),
               updated_at   = now()
         where id = v_gid;
      end if;

      insert into public.student_guardians(
        tenant_id, student_id, guardian_id,
        is_primary, can_pickup, can_view_reports, relation, created_at, updated_at
      ) values (
        v_tenant, v_student_id, v_gid,
        coalesce((v_g->>'is_primary')::boolean,false),
        coalesce((v_g->>'can_pickup')::boolean,true),
        coalesce((v_g->>'can_view_reports')::boolean,true),
        nullif(v_g->>'relationship',''),
        now(), now()
      )
      on conflict (student_id, guardian_id) do update
        set is_primary       = excluded.is_primary,
            can_pickup       = excluded.can_pickup,
            can_view_reports = excluded.can_view_reports,
            relation         = excluded.relation,
            updated_at       = now();

      v_linked := v_linked + 1;
    end loop;

  end loop;

  return json_build_object(
    'success', true,
    'summary', json_build_object(
      'total', v_total, 'created', v_created, 'updated', v_updated, 'linksProcessed', v_linked,
      'strategy', _on_duplicate
    )
  );
exception
  when others then
    return json_build_object('success', false, 'message', SQLERRM);
end
$$;

grant execute on function public.confirm_student_import(jsonb, text) to authenticated;
