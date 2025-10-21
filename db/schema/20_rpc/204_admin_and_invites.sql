-- ============================================================
-- 추가: 원장 승인 / 거부 (어드민·운영툴에서 호출)
-- ============================================================

-- 원장 승인
create or replace function public.approve_owner(_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set approval_status = 'approved',
         approved_at     = now(),
         updated_at      = now()
   where id = _user_id
     and role_code = 'owner'
     and deleted_at is null;

  if not found then
    return json_build_object('success', false, 'error', 'owner_not_found_or_already_approved');
  end if;

  return json_build_object('success', true);
exception
  when others then
    return json_build_object('success', false, 'error', SQLERRM);
end
$$;

-- 원장 승인 거부(선택)
create or replace function public.reject_owner(_user_id uuid, _reason text default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set approval_status = 'rejected',
         approval_reason = coalesce(_reason, '승인 거부됨'),
         approved_at     = now(),
         updated_at      = now()
   where id = _user_id
     and role_code = 'owner'
     and deleted_at is null;

  if not found then
    return json_build_object('success', false, 'error', 'owner_not_found_or_already_rejected');
  end if;

  return json_build_object('success', true);
exception
  when others then
    return json_build_object('success', false, 'error', SQLERRM);
end
$$;

-- 권한 부여
grant execute on function public.approve_owner(uuid)             to authenticated;
grant execute on function public.reject_owner(uuid, text)        to authenticated;

-- 서비스 키(backend)에서도 호출 가능하도록 명시(선택)
grant execute on function public.admin_approve_owner(uuid, text, text) to service_role;

-- PostgREST 스키마 캐시 리로드(선택)
select pg_notify('pgrst','reload schema');