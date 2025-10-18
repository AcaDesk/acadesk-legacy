-- ============================================================
-- Fix: 온보딩 흐름 수정 - onboarding_completed 플래그 관리
-- Issue: complete_owner_onboarding에서 onboarding_completed = true로 설정하여
--        academy-setup 단계를 건너뛸 수 있는 문제 해결
-- ============================================================

-- 4-3) 원장 온보딩(트랜잭션): 테넌트 생성 + 사용자 업데이트
-- ⚠️ onboarding_completed는 academy-setup 완료 후에만 true로 설정됨
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
begin
  -- auth.users 최소 존재 확인
  select email into v_email from auth.users where id = _user_id;
  if v_email is null then
    return json_build_object('success', false, 'error', 'Auth user not found');
  end if;

  -- 테넌트 생성
  insert into public.tenants (name, slug)
  values (_academy_name, v_slug)
  returning id into v_tenant_id;

  -- users 업서트: 없으면 생성, 있으면 owner로 갱신
  -- ⚠️ onboarding_completed는 academy-setup 완료 후 true로 설정됨
  insert into public.users as u (
    id, email, name, role_code, tenant_id,
    onboarding_completed,
    approval_status, approved_at, updated_at
  )
  values (
    _user_id,
    coalesce(public.primary_email(_user_id), v_email, ''),
    _name,
    'owner',
    v_tenant_id,
    false,
    'approved',
    now(),
    now()
  )
  on conflict (id) do update
    set name                   = excluded.name,
        role_code              = 'owner',
        tenant_id              = excluded.tenant_id,
        onboarding_completed   = false,
        approval_status        = 'approved',
        approved_at            = now(),
        updated_at             = now();

  return json_build_object(
    'success', true,
    'user',   json_build_object('id', _user_id, 'name', _name, 'role_code', 'owner', 'tenant_id', v_tenant_id),
    'tenant', json_build_object('id', v_tenant_id, 'name', _academy_name, 'slug', v_slug)
  );
exception
  when others then
    return json_build_object('success', false, 'error', SQLERRM);
end
$$;
