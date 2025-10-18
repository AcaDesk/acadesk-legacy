-- 200_onboarding.sql (hardened)

-----------------------------
-- 공통: JSON 응답 헬퍼
-----------------------------
create or replace function public._ok(_data json default '{}'::json)
returns json language sql immutable as $$
  select jsonb_build_object('ok', true, 'data', coalesce(_data, '{}'::json))::json
$$;

create or replace function public._err(_code text, _message text default null)
returns json language sql immutable as $$
  select jsonb_build_object('ok', false, 'code', _code, 'message', _message)::json
$$;

-----------------------------
-- 온보딩 상태 조회
-----------------------------
create or replace function public.get_onboarding_state()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id    uuid := auth.uid();
  v_user  record;
begin
  if v_id is null then
    return public._ok(json_build_object(
      'onboarding_completed', false,
      'role_code',            null,
      'tenant_id',            null,
      'approval_status',      null
    ));
  end if;

  select
    u.onboarding_completed,
    u.role_code,
    u.tenant_id,
    u.approval_status
  into v_user
  from public.users u
  where u.id = v_id
    and u.deleted_at is null;

  if not found then
    return public._ok(json_build_object(
      'onboarding_completed', false,
      'role_code',            null,
      'tenant_id',            null,
      'approval_status',      null
    ));
  end if;

  return public._ok(json_build_object(
    'onboarding_completed', coalesce(v_user.onboarding_completed, false),
    'role_code',            v_user.role_code,
    'tenant_id',            v_user.tenant_id,
    'approval_status',      v_user.approval_status
  ));
end
$$;

grant execute on function public.get_onboarding_state() to authenticated;

-----------------------------
-- 프로필 생성 (멱등)
-----------------------------
create or replace function public.create_user_profile()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   text;
  v_exists  boolean;
begin
  if v_user_id is null then
    return public._err('unauthenticated', '인증되지 않은 사용자입니다.');
  end if;

  select exists(select 1 from public.users where id = v_user_id) into v_exists;
  if v_exists then
    return public._ok(json_build_object('message','이미 프로필이 존재합니다.'));
  end if;

  v_email := public.primary_email(v_user_id);

  insert into public.users (id, email, name, role_code, onboarding_completed, approval_status)
  values (v_user_id, coalesce(v_email, ''), coalesce(v_email, ''), null, false, 'pending');

  return public._ok(json_build_object('message','프로필이 생성되었습니다.'));
exception
  when others then
    return public._err('exception', SQLERRM);
end
$$;

-- anon 허용 여부는 정책에 따라: 초대/이메일 링크 관성 고려시 anon 허용 유지 가능
grant execute on function public.create_user_profile() to authenticated, anon;

-----------------------------
-- 승인 상태 확인
-----------------------------
create or replace function public.check_approval_status()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_status  text;
  v_reason  text;
  v_tenant  uuid;
begin
  if v_user_id is null then
    return public._err('unauthenticated','인증되지 않은 사용자입니다.');
  end if;

  select approval_status, approval_reason, tenant_id
    into v_status, v_reason, v_tenant
  from public.users
  where id = v_user_id
    and deleted_at is null;

  if v_status is null then
    return public._err('not_found','사용자 정보를 찾을 수 없습니다.');
  end if;

  return public._ok(json_build_object(
    'status',    v_status,
    'reason',    v_reason,
    'tenant_id', v_tenant
  ));
end
$$;

grant execute on function public.check_approval_status() to authenticated;

-----------------------------
-- (옵션 1) service-role 전용: 원장 오너 승격 + 테넌트 생성
-- 프런트에서 호출하지 않음! 백엔드만 사용.
-----------------------------
create or replace function public.complete_owner_onboarding(
  _user_id      uuid,
  _name         text,
  _academy_name text,
  _slug         text default null
)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_tenant_id uuid;
  v_slug      text := coalesce(_slug, public.gen_unique_slug(_academy_name));
  v_email     text;
  v_existing  uuid;
begin
  -- ⚠ service-role 전용: 일반 사용자가 호출 못 하게 grant 막기(아래 revoke 참고)
  -- 추가 안전장치: auth.uid() is null (service) 일 수 있으므로 별도 검사 생략

  if coalesce(trim(_academy_name), '') = '' then
    return public._err('invalid_input','academy_name is required');
  end if;

  -- 동시 요청 경합 방지: 동일 user 기준 advisory lock
  perform pg_advisory_xact_lock( ('x'||substr(replace(_user_id::text,'-',''),1,16))::bit(64)::bigint );

  -- 중복 테넌트 보유 방지: 이미 테넌트 있으면 그걸 재사용(멱등)
  select tenant_id into v_existing
  from public.users
  where id = _user_id and deleted_at is null;

  if v_existing is not null then
    v_tenant_id := v_existing;
  else
    insert into public.tenants (name, slug)
    values (_academy_name, v_slug)
    returning id into v_tenant_id;
  end if;

  select email into v_email from auth.users where id = _user_id;
  if v_email is null then
    -- 테넌트는 만들었지만 auth.users가 없다? → 롤백
    raise exception 'Auth user not found';
  end if;

  insert into public.users as u (
    id, email, name, role_code, tenant_id,
    onboarding_completed,
    approval_status, approved_at, updated_at
  )
  values (
    _user_id,
    coalesce(public.primary_email(_user_id), v_email, ''),
    coalesce(nullif(_name,''), coalesce(public.primary_email(_user_id), v_email, '')),
    'owner',
    v_tenant_id,
    false,              -- 설정 마법사 완료 전
    'approved',
    now(),
    now()
  )
  on conflict (id) do update
    set name                 = excluded.name,
        role_code            = 'owner',
        tenant_id            = excluded.tenant_id,
        onboarding_completed = false,
        approval_status      = 'approved',
        approved_at          = now(),
        updated_at           = now();

  return public._ok(json_build_object(
    'user',   json_build_object('id', _user_id, 'name', _name, 'role_code', 'owner', 'tenant_id', v_tenant_id),
    'tenant', json_build_object('id', v_tenant_id, 'name', _academy_name, 'slug', v_slug)
  ));
exception
  when others then
    return public._err('exception', SQLERRM);
end
$$;

-- ⚠ 실제 운영: 인증된 사용자에게 권한 주지 말 것 (백엔드 service-role만 실행)
revoke all on function public.complete_owner_onboarding(uuid, text, text, text) from public;
revoke all on function public.complete_owner_onboarding(uuid, text, text, text) from authenticated;

-----------------------------
-- 학원 설정 완료(오너만)
-----------------------------
create or replace function public.finish_owner_academy_setup(
  _academy_name text,
  _timezone     text default 'Asia/Seoul',
  _settings     jsonb default '{}'::jsonb
)
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid    uuid := auth.uid();
  v_tenant uuid;
  v_role   text;
begin
  if v_uid is null then
    return public._err('unauthenticated','로그인이 필요합니다.');
  end if;

  select tenant_id, role_code into v_tenant, v_role
  from public.users
  where id = v_uid and deleted_at is null;

  if v_tenant is null then
    return public._err('tenant_not_found','tenant가 없습니다.');
  end if;

  if v_role is distinct from 'owner' then
    return public._err('forbidden','오너만 설정을 완료할 수 있습니다.');
  end if;

  update public.tenants
     set name      = coalesce(nullif(_academy_name,''), name),
         timezone  = coalesce(nullif(_timezone,''), 'Asia/Seoul'),
         settings  = coalesce(_settings, '{}'::jsonb),
         updated_at= now()
   where id = v_tenant;

  update public.users
     set onboarding_completed     = true,
         onboarding_completed_at  = now(),
         updated_at               = now()
   where id = v_uid;

  return public._ok();
exception
  when others then
    return public._err('exception', SQLERRM);
end
$$;

grant execute on function public.finish_owner_academy_setup(text, text, jsonb) to authenticated;