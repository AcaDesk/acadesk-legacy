-- 500_grants.sql — Centralized Grants & Revokes (idempotent-safe)

-- ============================================================
-- 0) Schema usage (기본)
-- ============================================================
grant usage on schema public to authenticated, anon, service_role;

-- ============================================================
-- 1) Tables (이미 RLS로 보호됨 — 필요한 최소 권한)
--    ※ 기존 파일에서 테이블 grant가 있다면 중복 허용(같은 권한 재부여는 무해)
-- ============================================================
-- 코어
grant select, insert, update, delete on table
  public.tenants,
  public.users,
  public.students,
  public.student_todos
to authenticated;

-- 패치(학원 도메인)
grant select on table
  public.subjects,
  public.classes,
  public.class_enrollments,
  public.attendance_sessions,
  public.attendance,
  public.guardians,
  public.student_guardians,
  public.student_schedules,
  public.todo_templates,
  public.exams,
  public.exam_scores,
  public.books,
  public.book_lendings,
  public.in_app_notifications,
  public.student_activity_logs,
  public.reports,
  public.ref_exam_categories,
  public.notification_logs,
  public.calendar_events,
  public.class_sessions,
  public.consultations,
  public.tenant_codes
 to authenticated;

-- Writes allowed (RLS governs row-level permissions)
grant select, insert, update, delete on table
  public.attendance_sessions,
  public.attendance,
  public.todo_templates,
  public.exams,
  public.exam_scores,
  public.books,
  public.book_lendings,
  public.reports,
  public.guardians,
  public.student_guardians,
  public.calendar_events,
  public.class_sessions,
  public.consultations,
  public.tenant_codes
to authenticated;

-- 초대 테이블(생성/업데이트는 정책으로 제한)
grant select, insert, update on table public.staff_invites to authenticated;

-- 익명은 테이블 직접 권한 없음(키오스크는 RPC로 접근)
revoke all on table
  public.tenants,
  public.users,
  public.students,
  public.student_todos
from anon;

-- ============================================================
-- 2) Helper Functions (100_helpers.sql)
--    응답 헬퍼/유틸은 authenticated에도 허용.
--    service-only 유틸은 service_role에만.
-- ============================================================
do $$ begin
  -- JSON 응답 헬퍼
  grant execute on function public._ok(json)  to authenticated, service_role;
  grant execute on function public._err(text, text) to authenticated, service_role;

  -- updated_at trigger
  grant execute on function public.update_updated_at_column() to authenticated, service_role;

  -- 현재 사용자 컨텍스트
  grant execute on function public.current_user_tenant_id() to authenticated, service_role;
  grant execute on function public.current_user_role()      to authenticated, service_role;
  grant execute on function public.is_owner()                to authenticated, service_role;

  -- service 전용 체크 (백엔드만)
  grant execute on function public.is_service_role() to service_role;
  revoke execute on function public.is_service_role() from authenticated, anon;

  -- 이메일/문자
  grant execute on function public.lower_trim(text)    to authenticated, service_role;
  grant execute on function public.primary_email(uuid) to authenticated, service_role;

  -- 슬러그
  grant execute on function public.slugify(text)         to authenticated, service_role;
  grant execute on function public.gen_unique_slug(text) to authenticated, service_role;

  -- 트랜잭션 락 (서비스 전용)
  grant execute on function public.advisory_lock_uuid(uuid) to service_role;
  revoke execute on function public.advisory_lock_uuid(uuid) from authenticated, anon;

  -- 타임존/테넌트 유틸
  grant execute on function public.now_kst()           to authenticated, service_role;
  grant execute on function public.is_same_tenant(uuid) to authenticated, service_role;
  grant execute on function public.require_owner()      to authenticated, service_role;

  grant execute on function public.create_student_with_guardians(jsonb, jsonb) to authenticated;
  grant execute on function public.upsert_guardian_and_link(uuid, text, text, boolean, boolean, boolean) to authenticated;
  grant execute on function public.unlink_student_guardian(uuid, uuid) to authenticated;

  grant execute on function public.bulk_create_students_with_guardians(jsonb) to authenticated;
  grant execute on function public.bulk_update_students(jsonb) to authenticated;
  grant execute on function public.bulk_soft_delete_students(uuid[]) to authenticated;
  grant execute on function public.bulk_restore_students(uuid[]) to authenticated;
  grant execute on function public.preview_student_import(jsonb) to authenticated;
  grant execute on function public.confirm_student_import(jsonb, text) to authenticated;
  grant execute on function public.owner_setup_upsert(text, text, text, jsonb) to authenticated;
  grant execute on function public.approve_owner(uuid) to authenticated;
end $$;

-- ============================================================
-- 3) Onboarding / Auth Flow RPCs (200_onboarding.sql, 203/204)
--    클라이언트에서 쓰는 것은 authenticated에 grant
--    백엔드 전용은 service_role에만 grant + public/authenticated revoke
-- ============================================================
do $$ begin
  -- 상태 조회
  grant execute on function public.get_onboarding_state() to authenticated;

  -- 프로필 생성 (부트스트랩; 이메일 링크 등 anon 경유 가능)
  grant execute on function public.create_user_profile() to authenticated, anon;

  -- 승인 상태 확인
  grant execute on function public.check_approval_status() to authenticated;

  -- 원장 학원 설정 완료(오너만; 프론트에서 호출)
  grant execute on function public.finish_owner_academy_setup(text, text, jsonb) to authenticated;

  -- ▲ 백엔드 전용(서비스 키) — 위험: 테넌트 생성/오너 승격
  -- complete_owner_onboarding: service_role만 허용
  revoke all on function public.complete_owner_onboarding(uuid, text, text, text) from public, authenticated, anon;
  grant execute on function public.complete_owner_onboarding(uuid, text, text, text) to service_role;

  -- admin 승인(별도 파일에 있을 수도 있으니 여기서도 통제)
  -- public.admin_approve_owner(...) 가 존재한다면 동일 정책 적용
  do $inner$
  begin
    if exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'admin_approve_owner'
        and pg_get_function_identity_arguments(p.oid) in ('uuid, text, text', 'uuid,text,text')
    ) then
      revoke all on function public.admin_approve_owner(uuid, text, text) from public, authenticated, anon;
      grant execute on function public.admin_approve_owner(uuid, text, text) to service_role;
    end if;
  end
  $inner$;

  -- 초대 수락 (클라이언트에서 호출)
  grant execute on function public.accept_staff_invite(text) to authenticated;

  -- Auth Stage (203_auth_stage.sql)
  -- get_auth_stage / owner_start_setup 등 이름이 다르면 아래를 바꿔주세요.
  do $inner2$
  begin
    -- get_auth_stage: 파라미터 유무에 따라 각각 처리
    if exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_auth_stage'
        and pg_get_function_identity_arguments(p.oid) in ('text', 'text DEFAULT NULL')
    ) then
      grant execute on function public.get_auth_stage(text) to authenticated;
    elsif exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_auth_stage'
        and pg_get_function_identity_arguments(p.oid) = ''
    ) then
      grant execute on function public.get_auth_stage() to authenticated;
    end if;

    if exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'owner_start_setup'
    ) then
      grant execute on function public.owner_start_setup() to authenticated;
    end if;
  end
  $inner2$;
end $$;

-- ============================================================
-- 4) 기존 RPC (키오스크/대시보드)
-- ============================================================
do $$ begin
  -- 키오스크: 익명 접근 허용 (PIN은 함수가 자체 검증)
  grant execute on function public.get_student_todos_for_kiosk(uuid, date, text) to anon;

  -- 대시보드 스텁: 인증 사용자
  grant execute on function public.get_dashboard_data(date) to authenticated;
end $$;

-- ============================================================
-- 5) 안전 리캡: 위험 함수는 최종적으로 다시 봉인(Revoke)
-- ============================================================
revoke all on function public.complete_owner_onboarding(uuid, text, text, text) from public, authenticated, anon;
-- (있는 경우) admin_approve_owner도 봉인
do $$ begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_approve_owner'
      and pg_get_function_identity_arguments(p.oid) in ('uuid, text, text', 'uuid,text,text')
  ) then
    revoke all on function public.admin_approve_owner(uuid, text, text) from public, authenticated, anon;
  end if;
end $$;

-- ============================================================
-- 6) PostgREST reload
-- ============================================================
select pg_notify('pgrst', 'reload schema');
