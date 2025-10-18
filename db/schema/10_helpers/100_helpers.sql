-- 100_helpers.sql (hardened & consolidated helpers)

------------------------------------------------------------
-- 0) 공통 JSON 응답 헬퍼 (모든 RPC에서 통일된 계약으로 사용)
------------------------------------------------------------
create or replace function public._ok(_data json default '{}'::json)
returns json language sql immutable as $$
  select jsonb_build_object('ok', true, 'data', coalesce(_data, '{}'::json))::json
$$;

create or replace function public._err(_code text, _message text default null)
returns json language sql immutable as $$
  select jsonb_build_object('ok', false, 'code', _code, 'message', _message)::json
$$;

------------------------------------------------------------
-- 1) updated_at 트리거
------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

------------------------------------------------------------
-- 2) 현재 사용자 컨텍스트
------------------------------------------------------------
-- 현재 로그인 사용자의 tenant_id
create or replace function public.current_user_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.users where id = auth.uid() and deleted_at is null
$$;

-- 현재 로그인 사용자의 role_code
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_code from public.users where id = auth.uid() and deleted_at is null
$$;

-- 현재 사용자가 owner인가?
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'owner'
$$;

-- service role 여부 (백엔드 서비스 키 호출 시)
-- Supabase의 JWT에는 role(claims->>'role')가 포함됨: 'service_role' 또는 'supabase_admin'
create or replace function public.is_service_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') in ('service_role','supabase_admin')
$$;

------------------------------------------------------------
-- 3) 이메일/문자 유틸
------------------------------------------------------------
-- 공백 트리밍 + 소문자
create or replace function public.lower_trim(_t text)
returns text
language sql
immutable
as $$
  select case when _t is null then null else lower(trim(_t)) end
$$;

-- 대표 이메일 (auth.users / identities 우선순위)
create or replace function public.primary_email(_auth_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_email text;
begin
  -- 1) auth.users.email
  select public.lower_trim(email) into v_email
  from auth.users where id = _auth_user_id;
  if v_email is not null and v_email <> '' then
    return v_email;
  end if;

  -- 2) auth.users.raw_user_meta_data.email
  select public.lower_trim(raw_user_meta_data->>'email') into v_email
  from auth.users where id = _auth_user_id;
  if v_email is not null and v_email <> '' then
    return v_email;
  end if;

  -- 3) auth.identities.identity_data.email (모든 provider 대상, 가장 이른 생성순)
  select public.lower_trim(identity_data->>'email') into v_email
  from auth.identities
  where user_id = _auth_user_id
    and (identity_data->>'email') is not null
  order by created_at
  limit 1;

  return v_email; -- not found → null
end
$$;

------------------------------------------------------------
-- 4) 슬러그 유틸
------------------------------------------------------------
create or replace function public.slugify(_t text)
returns text
language sql
immutable
as $$
  -- 영문/숫자 외 제거, 연속 구분자는 하이픈으로
  select regexp_replace(lower(trim(coalesce(_t,''))), '[^a-z0-9]+', '-', 'g')
$$;

create or replace function public.gen_unique_slug(_name text)
returns text
language plpgsql
as $$
declare
  base text := coalesce(nullif(public.slugify(_name),''), 'academy');
  s    text := base;
  i    int  := 0;
begin
  -- 과도한 길이 방지 (예: 64자 제한)
  base := left(base, 64);
  s := base;

  while exists (select 1 from public.tenants where slug = s) loop
    i := i + 1;
    s := left(base, 58) || '-' || lpad(i::text, 5, '0'); -- 총 길이 안전 가드
    if i > 50000 then
      s := left(base, 58) || '-' || encode(gen_random_bytes(3), 'hex');
      exit;
    end if;
  end loop;

  return s;
end
$$;

------------------------------------------------------------
-- 5) 트랜잭션 락 유틸(동시 요청 중복 방지용)
------------------------------------------------------------
-- 특정 UUID 키에 대해 트랜잭션 범위 advisory lock 획득
create or replace function public.advisory_lock_uuid(_id uuid)
returns void
language sql
volatile
as $$
  select pg_advisory_xact_lock(
    ('x'||substr(replace(_id::text,'-',''),1,16))::bit(64)::bigint
  )
$$;

------------------------------------------------------------
-- 6) 타임존 유틸(선택)
------------------------------------------------------------
-- Asia/Seoul 기준 현재 시각 (reporting에 유용)
create or replace function public.now_kst()
returns timestamptz
language sql
stable
as $$
  select (now() at time zone 'Asia/Seoul')::timestamptz
$$;

------------------------------------------------------------
-- 7) 테넌트/행 보호 유틸(선택)
------------------------------------------------------------
-- 같은 테넌트인지 빠르게 검사
create or replace function public.is_same_tenant(_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _tenant_id is not distinct from public.current_user_tenant_id()
$$;

-- (필요시) 오너만 허용하는 가드: 조건 불충족 시 예외
create or replace function public.require_owner()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_owner() then
    raise exception 'forbidden: owner only';
  end if;
end
$$;