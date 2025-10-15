-- ============================================================
-- 08) Improved Authentication & Onboarding RPC Functions
-- ------------------------------------------------------------
-- Purpose: Transaction-safe onboarding with improved data consistency
-- Prerequisites: 06_RPC.sql
-- ============================================================

-- ============================================================
-- A) Improved validate_invitation_token
--    Returns FULL invitation object (Single Source of Truth)
-- ============================================================
create or replace function public.validate_invitation_token(_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv record;
begin
  select
    id,
    tenant_id,
    created_by,
    email,
    role_code,
    token,
    status,
    expires_at,
    created_at,
    accepted_at,
    accepted_by
  into v_inv
  from public.tenant_invitations
  where token = _token;

  if not found then
    return json_build_object('valid', false, 'reason', 'not_found');
  end if;

  if v_inv.status <> 'pending' then
    return json_build_object('valid', false, 'reason', 'status_'||v_inv.status);
  end if;

  if v_inv.expires_at <= now() then
    return json_build_object('valid', false, 'reason', 'expired');
  end if;

  -- Return FULL invitation object (Single Source of Truth)
  return json_build_object(
    'valid', true,
    'id', v_inv.id,
    'tenant_id', v_inv.tenant_id,
    'created_by', v_inv.created_by,
    'email', v_inv.email,
    'role_code', v_inv.role_code,
    'token', v_inv.token,
    'status', v_inv.status,
    'expires_at', v_inv.expires_at,
    'created_at', v_inv.created_at
  );
end
$$;

-- ============================================================
-- B) Complete Staff Onboarding (Transactional)
--    Atomically updates users table AND marks invitation as accepted
-- ============================================================
create or replace function public.complete_staff_onboarding(
  _user_id uuid,
  _name text,
  _invitation_token text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
  v_result jsonb;
begin
  -- 1. Validate invitation (will be locked by transaction)
  select
    id,
    tenant_id,
    email,
    role_code,
    status,
    expires_at
  into v_invitation
  from public.tenant_invitations
  where token = _invitation_token
  for update;  -- Lock the row for transaction

  -- Validate invitation
  if not found then
    return json_build_object('success', false, 'error', 'Invitation not found');
  end if;

  if v_invitation.status <> 'pending' then
    return json_build_object('success', false, 'error', 'Invitation already used');
  end if;

  if v_invitation.expires_at <= now() then
    return json_build_object('success', false, 'error', 'Invitation expired');
  end if;

  -- 2. Update user (atomic operation)
  update public.users
  set
    name = _name,
    role_code = v_invitation.role_code,
    tenant_id = v_invitation.tenant_id,
    onboarding_completed = true,
    updated_at = now()
  where id = _user_id;

  if not found then
    return json_build_object('success', false, 'error', 'User not found');
  end if;

  -- 3. Mark invitation as accepted (atomic operation)
  update public.tenant_invitations
  set
    status = 'accepted',
    accepted_at = now(),
    accepted_by = _user_id,
    updated_at = now()
  where id = v_invitation.id;

  -- 4. Return success with user info
  v_result := jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', _user_id,
      'name', _name,
      'role_code', v_invitation.role_code,
      'tenant_id', v_invitation.tenant_id
    )
  );

  return to_json(v_result);
end
$$;

-- ============================================================
-- C) Complete Owner Onboarding (Transactional)
--    Atomically creates tenant AND updates user
-- ============================================================
create or replace function public.complete_owner_onboarding(
  _user_id uuid,
  _name text,
  _academy_name text,
  _academy_code text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_final_academy_code text;
  v_result jsonb;
begin
  -- 1. Generate academy code if not provided
  if _academy_code is null then
    v_final_academy_code := 'ACD' || lpad(floor(random() * 99999999)::text, 8, '0');
  else
    v_final_academy_code := _academy_code;
  end if;

  -- 2. Create tenant (atomic operation)
  insert into public.tenants(name, academy_code, owner_id, active)
  values (_academy_name, v_final_academy_code, _user_id, true)
  returning id into v_tenant_id;

  -- 3. Update user (atomic operation)
  update public.users
  set
    name = _name,
    role_code = 'owner',
    tenant_id = v_tenant_id,
    onboarding_completed = true,
    approval_status = 'approved',  -- Owner는 자동 승인
    approved_at = now(),
    updated_at = now()
  where id = _user_id;

  if not found then
    -- Rollback will happen automatically
    return json_build_object('success', false, 'error', 'User not found');
  end if;

  -- 4. Return success with tenant and user info
  v_result := jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', _user_id,
      'name', _name,
      'role_code', 'owner',
      'tenant_id', v_tenant_id
    ),
    'tenant', jsonb_build_object(
      'id', v_tenant_id,
      'name', _academy_name,
      'academy_code', v_final_academy_code
    )
  );

  return to_json(v_result);
end
$$;

-- ============================================================
-- D) Grant execute permissions
-- ============================================================
grant execute on function public.validate_invitation_token(text) to authenticated;
grant execute on function public.complete_staff_onboarding(uuid, text, text) to authenticated;
grant execute on function public.complete_owner_onboarding(uuid, text, text, text) to authenticated;
