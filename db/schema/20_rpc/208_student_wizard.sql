-- 208_student_wizard.sql
-- AddStudentWizard를 위한 완전한 원자적 트랜잭션 RPC 함수
-- 학생 생성, User 생성, Guardian 생성/연결을 하나의 트랜잭션으로 처리

------------------------------------------------------------
-- 학생 Wizard 완전 생성 함수
--
-- 사용법:
-- SELECT create_student_complete(
--   _student := '{
--     "name": "홍길동",
--     "birth_date": "2010-01-01",
--     "grade": "middle_1",
--     "school": "서울중학교",
--     "gender": "male",
--     "email": "student@example.com",
--     "student_phone": "010-1234-5678",
--     "enrollment_date": "2024-03-01",
--     "notes": "특이사항",
--     "commute_method": "walk",
--     "marketing_source": "referral",
--     "kiosk_pin": "$2a$10$..."
--   }'::jsonb,
--   _guardian := '{
--     "name": "홍학부",
--     "phone": "010-9876-5432",
--     "email": "guardian@example.com",
--     "relationship": "모",
--     "occupation": "회사원",
--     "address": "서울시 강남구",
--     "is_primary_contact": true,
--     "receives_notifications": true,
--     "receives_billing": false,
--     "can_pickup": true
--   }'::jsonb,
--   _guardian_mode := 'new'
-- );
------------------------------------------------------------
create or replace function public.create_student_complete(
  _student       jsonb,
  _guardian      jsonb default null,
  _guardian_mode text  default 'skip' -- 'new', 'existing', 'skip'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id      uuid := public.current_user_tenant_id();
  v_role           text := public.current_user_role();
  v_user_id        uuid;
  v_student_id     uuid;
  v_guardian_id    uuid;
  v_student_code   text;
begin
  -- 권한 체크
  if v_tenant_id is null then
    return public._err('tenant_not_found','테넌트가 없습니다.');
  end if;
  if v_role not in ('owner','instructor','assistant') then
    return public._err('forbidden','권한이 없습니다. 학생을 추가할 권한이 필요합니다.');
  end if;

  -- 필수 입력값 검증
  if coalesce(trim(_student->>'name'),'') = '' then
    return public._err('invalid_input','학생 이름은 필수입니다.');
  end if;
  if coalesce(trim(_student->>'grade'),'') = '' then
    return public._err('invalid_input','학년은 필수입니다.');
  end if;
  if coalesce(trim(_student->>'school'),'') = '' then
    return public._err('invalid_input','학교는 필수입니다.');
  end if;

  -- 학생 코드 자동 생성 (student_code가 제공되지 않은 경우)
  v_student_code := coalesce(
    nullif(trim(_student->>'student_code'),''),
    'STU-' || upper(to_hex(extract(epoch from now())::bigint)) || '-' ||
    upper(substring(md5(random()::text) from 1 for 4))
  );

  -- 1. User 레코드 생성
  insert into public.users (
    tenant_id,
    email,
    name,
    role_code,
    created_at,
    updated_at
  )
  values (
    v_tenant_id,
    nullif(trim(_student->>'email'),''),
    trim(_student->>'name'),
    'student',
    now(),
    now()
  )
  returning id into v_user_id;

  -- 2. Student 레코드 생성
  insert into public.students (
    tenant_id,
    user_id,
    student_code,
    name,
    birth_date,
    gender,
    student_phone,
    profile_image_url,
    grade,
    school,
    enrollment_date,
    notes,
    commute_method,
    marketing_source,
    kiosk_pin,
    created_at,
    updated_at
  )
  values (
    v_tenant_id,
    v_user_id,
    v_student_code,
    trim(_student->>'name'),
    nullif(trim(_student->>'birth_date'),'')::date,
    nullif(trim(_student->>'gender'),''),
    nullif(trim(_student->>'student_phone'),''),
    nullif(trim(_student->>'profile_image_url'),''),
    trim(_student->>'grade'),
    nullif(trim(_student->>'school'),''),
    coalesce(nullif(trim(_student->>'enrollment_date'),'')::date, current_date),
    nullif(trim(_student->>'notes'),''),
    nullif(trim(_student->>'commute_method'),''),
    nullif(trim(_student->>'marketing_source'),''),
    nullif(trim(_student->>'kiosk_pin'),''),
    now(),
    now()
  )
  returning id into v_student_id;

  -- 3. Guardian 처리
  if _guardian_mode = 'new' and _guardian is not null then
    -- 새 학부모 등록
    if coalesce(trim(_guardian->>'name'),'') = '' then
      return public._err('invalid_input','학부모 이름은 필수입니다.');
    end if;
    if coalesce(trim(_guardian->>'phone'),'') = '' then
      return public._err('invalid_input','학부모 연락처는 필수입니다.');
    end if;

    -- 동일 테넌트 내 동일 전화번호 학부모 확인
    select g.id into v_guardian_id
    from public.guardians g
    where g.tenant_id = v_tenant_id
      and g.phone = trim(_guardian->>'phone')
      and g.deleted_at is null
    limit 1;

    if v_guardian_id is null then
      -- 새 학부모 생성
      insert into public.guardians (
        tenant_id,
        name,
        phone,
        email,
        relationship,
        occupation,
        address,
        notes,
        created_at,
        updated_at
      )
      values (
        v_tenant_id,
        trim(_guardian->>'name'),
        trim(_guardian->>'phone'),
        nullif(trim(_guardian->>'email'),''),
        nullif(trim(_guardian->>'relationship'),''),
        nullif(trim(_guardian->>'occupation'),''),
        nullif(trim(_guardian->>'address'),''),
        nullif(trim(_guardian->>'notes'),''),
        now(),
        now()
      )
      returning id into v_guardian_id;
    end if;

    -- 학생-학부모 연결
    insert into public.student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary_contact,
      receives_notifications,
      receives_billing,
      can_pickup,
      created_at,
      updated_at
    )
    values (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      nullif(trim(_guardian->>'relationship'),''),
      coalesce((_guardian->>'is_primary_contact')::boolean, true),
      coalesce((_guardian->>'receives_notifications')::boolean, true),
      coalesce((_guardian->>'receives_billing')::boolean, false),
      coalesce((_guardian->>'can_pickup')::boolean, true),
      now(),
      now()
    );

  elsif _guardian_mode = 'existing' and _guardian is not null then
    -- 기존 학부모 연결
    v_guardian_id := nullif(trim(_guardian->>'id'),'')::uuid;

    if v_guardian_id is null then
      return public._err('invalid_input','기존 학부모 ID가 필요합니다.');
    end if;

    -- 학부모 존재 및 테넌트 검증
    if not exists (
      select 1 from public.guardians g
      where g.id = v_guardian_id
        and g.tenant_id = v_tenant_id
        and g.deleted_at is null
    ) then
      return public._err('invalid_guardian','학부모를 찾을 수 없거나 권한이 없습니다.');
    end if;

    -- 학생-학부모 연결
    insert into public.student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary_contact,
      receives_notifications,
      receives_billing,
      can_pickup,
      created_at,
      updated_at
    )
    values (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      nullif(trim(_guardian->>'relationship'),''),
      coalesce((_guardian->>'is_primary_contact')::boolean, true),
      coalesce((_guardian->>'receives_notifications')::boolean, true),
      coalesce((_guardian->>'receives_billing')::boolean, false),
      coalesce((_guardian->>'can_pickup')::boolean, true),
      now(),
      now()
    );
  end if;

  -- 성공 응답
  return public._ok(json_build_object(
    'student_id', v_student_id,
    'student_code', v_student_code,
    'user_id', v_user_id,
    'guardian_id', v_guardian_id
  ));

exception when others then
  return public._err('exception', SQLERRM);
end
$$;

grant execute on function public.create_student_complete(jsonb, jsonb, text) to authenticated;

comment on function public.create_student_complete is
'AddStudentWizard를 위한 완전한 학생 생성 함수. User, Student, Guardian, StudentGuardian을 원자적 트랜잭션으로 처리합니다.';
