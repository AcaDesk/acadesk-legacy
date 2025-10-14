-- ============================================================
-- 03) Helpers (Functions & Utilities)
-- ------------------------------------------------------------
-- Purpose: Define reusable utility functions shared across schema
-- Prerequisites: 01_extensions.sql, 02_schema.sql
-- ============================================================

-- Updated_at 자동 갱신용 트리거 함수
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- 멱등성 키 저장 테이블 (중복 요청 방지용)
create table if not exists public.idempotency_keys(
  tenant_id uuid not null,
  key text not null,
  created_at timestamptz not null default now(),
  primary key (tenant_id, key)
);

-- 현재 로그인된 사용자의 tenant_id 반환
create or replace function public.current_user_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.users where id = auth.uid()
$$;

-- 멱등성 키 검사 함수
create or replace function public.ensure_once(_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.idempotency_keys(tenant_id, key)
  values (public.current_user_tenant_id(), _key);
exception
  when unique_violation then
    raise exception 'duplicate submission';
end
$$;

-- 현재 로그인된 사용자의 role_code 반환
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role_code from public.users where id = auth.uid()
$$;

-- Owner 여부 확인
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(role_code = 'owner', false) from public.users where id = auth.uid()
$$;

-- Teacher 여부 확인
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(role_code = 'teacher', false) from public.users where id = auth.uid()
$$;

-- TA 여부 확인
create or replace function public.is_ta()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(role_code = 'ta', false) from public.users where id = auth.uid()
$$;

-- Staff 여부 확인 (owner, teacher, ta 모두 포함)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(role_code in ('owner','teacher','ta'), false) from public.users where id = auth.uid()
$$;

-- 이메일을 소문자/공백제거로 정규화
create or replace function public.normalize_email(_email text)
returns text
language sql
immutable
as $$
  select case when _email is null then null else lower(trim(_email)) end
$$;

-- 소셜로그인(Google, Kakao 등 포함) 기준 대표 이메일 추출
create or replace function public.primary_email(_auth_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_identities jsonb;
begin
  select email, identities
  into v_email, v_identities
  from auth.users
  where id = _auth_user_id;

  v_email := public.normalize_email(v_email);
  if v_email is not null then
    return v_email;
  end if;

  if v_identities is not null then
    v_email := public.normalize_email(
      (select (i->'identity_data'->>'email')
         from jsonb_array_elements(v_identities) i
        where (i->>'provider') = 'google'
        limit 1)
    );
    if v_email is not null then
      return v_email;
    end if;

    v_email := public.normalize_email(
      (select (i->'identity_data'->>'email')
         from jsonb_array_elements(v_identities) i
        where (i->>'provider') = 'kakao'
        limit 1)
    );
    if v_email is not null then
      return v_email;
    end if;
  end if;

  return null;
end
$$;