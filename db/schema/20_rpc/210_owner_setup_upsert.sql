-- 210_owner_setup_upsert.sql
-- ⚠️ DEPRECATED: 이 RPC는 더 이상 사용되지 않습니다.
-- Server Action (src/app/actions/onboarding.ts::completeOwnerOnboarding)으로 대체되었습니다.
-- 마이그레이션 완료 후 제거 예정.
--
-- 테넌트 없으면 complete_owner_onboarding → 있으면 finish_owner_academy_setup 까지 한 번에
create or replace function public.owner_setup_upsert(
  _owner_name   text,
  _academy_name text,
  _timezone     text default 'Asia/Seoul',
  _settings     jsonb default '{}'::jsonb
) returns json
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid    uuid := auth.uid();
  v_tenant uuid;
begin
  if v_uid is null then
    return json_build_object('success', false, 'error','unauthenticated');
  end if;

  select tenant_id into v_tenant
  from public.users
  where id = v_uid and deleted_at is null;

  if v_tenant is null then
    -- 테넌트 생성(원장 지정)
    perform public.complete_owner_onboarding(v_uid, _owner_name, _academy_name, null);
  end if;

  -- 최종 설정 업데이트 + 온보딩 완료
  perform public.finish_owner_academy_setup(_academy_name, _timezone, _settings);

  return json_build_object('success', true);
exception
  when others then
    return json_build_object('success', false, 'error', SQLERRM);
end
$$;

grant execute on function public.owner_setup_upsert(text, text, text, jsonb) to authenticated;

comment on function public.owner_setup_upsert(text, text, text, jsonb) is
'원장 학원 설정 upsert: tenant가 없으면 생성, 있으면 업데이트.
complete_owner_onboarding + finish_owner_academy_setup을 한 번에 처리.
승인 시 tenant 생성을 건너뛴 경우에도 대응 가능.';

-- PostgREST 캐시 리로드(선택)
-- select pg_notify('pgrst','reload schema');