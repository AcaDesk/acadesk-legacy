-- 다단계 쓰기 원자화 RPC 3종 (2026-07 감사 후속)
--
-- 애플리케이션 레이어에서 순차 INSERT/UPDATE로 처리되던 다단계 쓰기를
-- 단일 함수(=단일 트랜잭션)로 묶어 중간 실패 시 고아 레코드를 근절한다.
--
-- 공통 원칙:
-- - SECURITY INVOKER (service_role 클라이언트가 호출)
-- - p_tenant_id는 검증된 세션에서 전달 (앱 레벨 테넌트 격리 패턴)
-- - 실행 권한은 service_role에만 부여
-- - 사용자 친화 에러 메시지/사전 검증은 TS 레이어가 담당, 함수 내 RAISE는 백스톱

-- ============================================================
-- 1. 학생 통합 생성 (보호자 user → guardian → 학생 user → student → 연결)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_student_complete(
  p_tenant_id uuid,
  p_student jsonb,
  p_new_guardian jsonb DEFAULT NULL,
  p_existing_guardian_id uuid DEFAULT NULL,
  p_link jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_guardian_id uuid := p_existing_guardian_id;
  v_guardian_user_id uuid;
  v_student_user_id uuid;
  v_student_id uuid;
BEGIN
  -- 기존 보호자 지정 시 테넌트 소유 재검증 (백스톱 — TS에서 사전 검증됨)
  IF p_existing_guardian_id IS NOT NULL THEN
    PERFORM 1 FROM guardians
      WHERE id = p_existing_guardian_id
        AND tenant_id = p_tenant_id
        AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION '보호자를 찾을 수 없습니다';
    END IF;
  END IF;

  -- 신규 보호자 생성 (user + guardian)
  IF p_new_guardian IS NOT NULL THEN
    INSERT INTO users (
      tenant_id, email, phone, name, role_code,
      approval_status, onboarding_completed, onboarding_completed_at
    ) VALUES (
      p_tenant_id,
      NULLIF(p_new_guardian->>'email', ''),
      NULLIF(p_new_guardian->>'phone', ''),
      p_new_guardian->>'name',
      'parent', 'approved', true, now()
    ) RETURNING id INTO v_guardian_user_id;

    INSERT INTO guardians (
      user_id, tenant_id, name, phone, email, relationship, occupation, address
    ) VALUES (
      v_guardian_user_id, p_tenant_id,
      p_new_guardian->>'name',
      NULLIF(p_new_guardian->>'phone', ''),
      NULLIF(p_new_guardian->>'email', ''),
      NULLIF(p_new_guardian->>'relationship', ''),
      NULLIF(p_new_guardian->>'occupation', ''),
      NULLIF(p_new_guardian->>'address', '')
    ) RETURNING id INTO v_guardian_id;
  END IF;

  -- 학생 user + student
  INSERT INTO users (
    tenant_id, email, phone, name, role_code,
    approval_status, onboarding_completed, onboarding_completed_at
  ) VALUES (
    p_tenant_id,
    NULLIF(p_student->>'email', ''),
    NULLIF(p_student->>'student_phone', ''),
    p_student->>'name',
    'student', 'approved', true, now()
  ) RETURNING id INTO v_student_user_id;

  INSERT INTO students (
    user_id, tenant_id, name, student_code, grade, school, birth_date, gender,
    student_phone, profile_image_url, enrollment_date, notes,
    commute_method, marketing_source, kiosk_pin
  ) VALUES (
    v_student_user_id, p_tenant_id,
    p_student->>'name',
    p_student->>'student_code',
    NULLIF(p_student->>'grade', ''),
    NULLIF(p_student->>'school', ''),
    NULLIF(p_student->>'birth_date', '')::date,
    NULLIF(p_student->>'gender', ''),
    NULLIF(p_student->>'student_phone', ''),
    NULLIF(p_student->>'profile_image_url', ''),
    COALESCE(NULLIF(p_student->>'enrollment_date', '')::date, CURRENT_DATE),
    NULLIF(p_student->>'notes', ''),
    NULLIF(p_student->>'commute_method', ''),
    NULLIF(p_student->>'marketing_source', ''),
    NULLIF(p_student->>'kiosk_pin_hash', '')
  ) RETURNING id INTO v_student_id;

  -- 보호자-학생 연결
  IF v_guardian_id IS NOT NULL AND p_link IS NOT NULL THEN
    INSERT INTO student_guardians (
      tenant_id, student_id, guardian_id,
      is_primary, is_primary_contact, receives_notifications, receives_billing, can_pickup
    ) VALUES (
      p_tenant_id, v_student_id, v_guardian_id,
      COALESCE((p_link->>'is_primary')::boolean, true),
      COALESCE((p_link->>'is_primary_contact')::boolean, true),
      COALESCE((p_link->>'receives_notifications')::boolean, true),
      COALESCE((p_link->>'receives_billing')::boolean, false),
      COALESCE((p_link->>'can_pickup')::boolean, true)
    );
  END IF;

  RETURN jsonb_build_object('student_id', v_student_id, 'guardian_id', v_guardian_id);
END;
$$;

REVOKE ALL ON FUNCTION public.create_student_complete(uuid, jsonb, jsonb, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_student_complete(uuid, jsonb, jsonb, uuid, jsonb) TO service_role;

COMMENT ON FUNCTION public.create_student_complete(uuid, jsonb, jsonb, uuid, jsonb)
  IS '학생 통합 생성 — 보호자/학생 user·guardian·student·연결을 단일 트랜잭션으로 (students/mutations.ts)';

-- ============================================================
-- 2. 학생 관계 해제 (+선택적 소프트삭제/퇴원 처리)
--    삭제·일괄삭제·퇴원 세 흐름을 하나의 원자적 함수로 커버
-- ============================================================

CREATE OR REPLACE FUNCTION public.detach_student_relations(
  p_tenant_id uuid,
  p_student_ids uuid[],
  p_end_date date DEFAULT CURRENT_DATE,
  p_reason text DEFAULT NULL,
  p_unlink_guardians boolean DEFAULT false,
  p_close_open_todos boolean DEFAULT false,
  p_soft_delete_students boolean DEFAULT false,
  p_withdrawal_date timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_reason text := COALESCE(NULLIF(trim(p_reason), ''), '학생 퇴원/삭제로 인한 자동 해제');
  v_target_ids uuid[];
  v_user_ids uuid[];
  v_class_ids uuid[];
BEGIN
  -- 테넌트 소속 + 미삭제 학생만 대상
  SELECT array_agg(s.id),
         array_agg(s.user_id) FILTER (WHERE s.user_id IS NOT NULL)
    INTO v_target_ids, v_user_ids
    FROM students s
   WHERE s.id = ANY(p_student_ids)
     AND s.tenant_id = p_tenant_id
     AND s.deleted_at IS NULL;

  IF v_target_ids IS NULL THEN
    RETURN jsonb_build_object('affected_count', 0, 'class_ids', '[]'::jsonb);
  END IF;

  -- 활성 등록 반 목록 (호출측 revalidate용)
  SELECT array_agg(DISTINCT ce.class_id)
    INTO v_class_ids
    FROM class_enrollments ce
   WHERE ce.tenant_id = p_tenant_id
     AND ce.student_id = ANY(v_target_ids)
     AND ce.status = 'active'
     AND ce.class_id IS NOT NULL;

  UPDATE class_enrollments
     SET status = 'withdrawn',
         end_date = p_end_date,
         withdrawal_reason = v_reason,
         updated_at = v_now
   WHERE tenant_id = p_tenant_id
     AND student_id = ANY(v_target_ids)
     AND status = 'active';

  UPDATE student_schedules
     SET active = false, updated_at = v_now
   WHERE tenant_id = p_tenant_id
     AND student_id = ANY(v_target_ids)
     AND active = true;

  IF p_close_open_todos THEN
    UPDATE student_tasks
       SET deleted_at = v_now, updated_at = v_now
     WHERE tenant_id = p_tenant_id
       AND student_id = ANY(v_target_ids)
       AND deleted_at IS NULL
       AND verified_at IS NULL;
  END IF;

  IF p_unlink_guardians THEN
    DELETE FROM student_guardians
     WHERE tenant_id = p_tenant_id
       AND student_id = ANY(v_target_ids);
  END IF;

  -- 퇴원 처리 (withdrawal_date + meta.withdrawal_reason 병합)
  IF p_withdrawal_date IS NOT NULL THEN
    UPDATE students
       SET withdrawal_date = p_withdrawal_date,
           meta = COALESCE(meta, '{}'::jsonb)
                  || jsonb_build_object('withdrawal_reason', NULLIF(trim(COALESCE(p_reason, '')), '')),
           updated_at = v_now
     WHERE id = ANY(v_target_ids)
       AND tenant_id = p_tenant_id;
  END IF;

  -- 소프트삭제 (students + student role users)
  IF p_soft_delete_students THEN
    UPDATE students
       SET deleted_at = v_now, updated_at = v_now
     WHERE id = ANY(v_target_ids)
       AND tenant_id = p_tenant_id
       AND deleted_at IS NULL;

    IF v_user_ids IS NOT NULL THEN
      UPDATE users
         SET deleted_at = v_now, updated_at = v_now
       WHERE id = ANY(v_user_ids)
         AND tenant_id = p_tenant_id
         AND role_code = 'student'
         AND deleted_at IS NULL;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'affected_count', array_length(v_target_ids, 1),
    'class_ids', to_jsonb(COALESCE(v_class_ids, ARRAY[]::uuid[]))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.detach_student_relations(uuid, uuid[], date, text, boolean, boolean, boolean, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detach_student_relations(uuid, uuid[], date, text, boolean, boolean, boolean, timestamptz) TO service_role;

COMMENT ON FUNCTION public.detach_student_relations(uuid, uuid[], date, text, boolean, boolean, boolean, timestamptz)
  IS '학생 관계 해제(수강/스케줄/TODO/보호자) + 선택적 퇴원·소프트삭제를 단일 트랜잭션으로 (students/relations.ts)';

-- ============================================================
-- 3. 숙제 출제 (student_tasks 일괄 + homework_submissions 동시 생성)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_homework_with_submissions(
  p_tenant_id uuid,
  p_assigned_by uuid,
  p_student_ids uuid[],
  p_title text,
  p_description text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_priority text DEFAULT 'medium',
  p_due_date date DEFAULT CURRENT_DATE
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_tasks jsonb;
BEGIN
  WITH inserted_tasks AS (
    INSERT INTO student_tasks (
      tenant_id, student_id, assigned_by, kind, title, description,
      subject, priority, due_date, due_day_of_week
    )
    SELECT
      p_tenant_id, sid, p_assigned_by, 'homework', p_title, NULLIF(p_description, ''),
      NULLIF(p_subject, ''), p_priority, p_due_date,
      EXTRACT(ISODOW FROM p_due_date)::int
    FROM unnest(p_student_ids) AS sid
    RETURNING id, student_id
  ),
  inserted_submissions AS (
    INSERT INTO homework_submissions (tenant_id, task_id)
    SELECT p_tenant_id, id FROM inserted_tasks
    RETURNING task_id
  )
  SELECT jsonb_agg(jsonb_build_object('id', t.id, 'student_id', t.student_id))
    INTO v_tasks
    FROM inserted_tasks t;

  RETURN COALESCE(v_tasks, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.create_homework_with_submissions(uuid, uuid, uuid[], text, text, text, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_homework_with_submissions(uuid, uuid, uuid[], text, text, text, text, date) TO service_role;

COMMENT ON FUNCTION public.create_homework_with_submissions(uuid, uuid, uuid[], text, text, text, text, date)
  IS '숙제 출제 — 학생별 태스크와 빈 제출 레코드를 단일 트랜잭션으로 (homeworks.ts)';
