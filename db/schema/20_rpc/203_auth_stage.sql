-- 단일 진입점: 로그인 직후 호출해 라우팅을 결정
-- 파라미터 버전: 초대 토큰을 명시적으로 전달 가능 (없으면 헤더에서 조회)
drop function if exists public.get_auth_stage();

create or replace function public.get_auth_stage(p_invite_token text default null)
returns json language plpgsql security definer set search_path=public as $$
declare
  v_uid   uuid := auth.uid();
  v_u     public.users%rowtype;
  v_token text;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'unauthenticated');
  end if;

  select * into v_u from public.users where id = v_uid;

  if not found then
    return json_build_object('ok', true, 'stage', json_build_object(
      'code','NO_PROFILE','next_url','/auth/bootstrap'
    ));
  end if;

  -- 파라미터 우선, 없으면 헤더에서 조회
  v_token := p_invite_token;
  if v_token is null or v_token = '' then
    v_token := current_setting('request.header.x-invite-token', true);
  end if;

  if v_token is not null and v_token <> '' then
    return json_build_object('ok', true, 'stage', json_build_object(
      'code','MEMBER_INVITED','next_url','/auth/invite/accept?token='||v_token
    ));
  end if;

  if v_u.role_code is null and v_u.approval_status = 'pending' then
    return json_build_object('ok', true, 'stage', json_build_object(
      'code','PENDING_OWNER_REVIEW','next_url','/auth/pending'
    ));
  end if;

  if v_u.role_code = 'owner' and v_u.onboarding_completed is false then
    return json_build_object('ok', true, 'stage', json_build_object(
      'code','OWNER_SETUP_REQUIRED','next_url','/auth/owner/setup'
    ));
  end if;

  return json_build_object('ok', true, 'stage', json_build_object('code','READY'));
end $$;

grant execute on function public.get_auth_stage(text) to authenticated;

-- 원장 설정 마법사: 초기 데이터 로딩용 (필요 시 확장)
create or replace function public.owner_start_setup()
returns json language sql security definer set search_path=public as $$
  select json_build_object('ok', true, 'tenant_id', public.current_user_tenant_id())
$$;

grant execute on function public.owner_start_setup() to authenticated;
