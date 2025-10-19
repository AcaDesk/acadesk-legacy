-- 204_admin_and_invites.sql

-- 슈퍼어드민 승인: 서비스 백엔드 전용 (service_role로만 실행)
create or replace function public.admin_approve_owner(p_user_id uuid, p_academy_name text, p_slug text default null)
returns json language plpgsql security definer set search_path=public as $$
declare
  v_tenant uuid;
  v_slug   text := coalesce(p_slug, public.gen_unique_slug(p_academy_name));
begin
  insert into public.tenants(name, slug) values(p_academy_name, v_slug) returning id into v_tenant;

  update public.users
     set role_code='owner', tenant_id=v_tenant, approval_status='approved',
         approved_at=now(), onboarding_completed=false, updated_at=now()
   where id = p_user_id;

  return json_build_object('ok', true, 'tenant_id', v_tenant);
end $$;

-- ⚠ 실제 배포에서는 authenticated에 grant 하지 말 것. 백엔드(서비스 키)만 호출
revoke all on function public.admin_approve_owner(uuid, text, text) from public;


-- 직원 초대 수락: 토큰 검사 후 해당 테넌트/역할 부여
create or replace function public.accept_staff_invite(p_token text)
returns json language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid := auth.uid();
  v_inv record;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error','unauthenticated');
  end if;

  select * into v_inv from public.staff_invites
   where token = p_token and accepted_at is null and expires_at > now();

  if not found then
    return json_build_object('ok', false, 'error', 'invalid_or_expired');
  end if;

  insert into public.users(id, tenant_id, email, name, role_code, approval_status, onboarding_completed, updated_at)
  values (
    v_uid, v_inv.tenant_id,
    (select public.primary_email(v_uid)),
    coalesce((select public.primary_email(v_uid)),''),
    v_inv.role_code,
    'approved', true, now()
  )
  on conflict (id) do update
    set tenant_id = v_inv.tenant_id,
        role_code = v_inv.role_code,
        approval_status = 'approved',
        onboarding_completed = true,
        updated_at = now();

  update public.staff_invites set accepted_at = now() where id = v_inv.id;

  -- 상태 업데이트
  update public.staff_invites set status = 'accepted' where id = v_inv.id;

  return json_build_object('ok', true);
end $$;

grant execute on function public.accept_staff_invite(text) to authenticated;
