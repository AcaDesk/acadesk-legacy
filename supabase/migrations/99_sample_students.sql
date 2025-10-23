-- ============================================================
-- Sample Students Data
-- 테스트용 샘플 학생 데이터 추가
-- ============================================================

-- 현재 tenant_id 확인 및 샘플 학생 추가
DO $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
  v_student_id uuid;
BEGIN
  -- 첫 번째 tenant 가져오기 (또는 특정 tenant_id 사용)
  SELECT id INTO v_tenant_id FROM public.tenants WHERE deleted_at IS NULL LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'No tenant found. Skipping sample student creation.';
    RETURN;
  END IF;

  RAISE NOTICE 'Creating sample students for tenant: %', v_tenant_id;

  -- 샘플 학생 1: 김민준
  INSERT INTO public.users (id, tenant_id, email, name, phone, role_code, onboarding_completed, approval_status)
  VALUES (
    uuid_generate_v4(),
    v_tenant_id,
    'student1@example.com',
    '김민준',
    '010-1111-1111',
    NULL, -- 학생은 role이 없음
    false,
    'approved'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.students (id, tenant_id, user_id, student_code, name, birth_date, gender, grade, school, enrollment_date)
    VALUES (
      uuid_generate_v4(),
      v_tenant_id,
      v_user_id,
      'ST001',
      '김민준',
      '2015-03-15',
      'male',
      '초등학교 3학년',
      '서울초등학교',
      CURRENT_DATE - INTERVAL '6 months'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 샘플 학생 2: 이서윤
  INSERT INTO public.users (id, tenant_id, email, name, phone, role_code, onboarding_completed, approval_status)
  VALUES (
    uuid_generate_v4(),
    v_tenant_id,
    'student2@example.com',
    '이서윤',
    '010-2222-2222',
    NULL,
    false,
    'approved'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.students (id, tenant_id, user_id, student_code, name, birth_date, gender, grade, school, enrollment_date)
    VALUES (
      uuid_generate_v4(),
      v_tenant_id,
      v_user_id,
      'ST002',
      '이서윤',
      '2014-07-22',
      'female',
      '초등학교 4학년',
      '강남초등학교',
      CURRENT_DATE - INTERVAL '1 year'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 샘플 학생 3: 박준서
  INSERT INTO public.users (id, tenant_id, email, name, phone, role_code, onboarding_completed, approval_status)
  VALUES (
    uuid_generate_v4(),
    v_tenant_id,
    'student3@example.com',
    '박준서',
    '010-3333-3333',
    NULL,
    false,
    'approved'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.students (id, tenant_id, user_id, student_code, name, birth_date, gender, grade, school, enrollment_date)
    VALUES (
      uuid_generate_v4(),
      v_tenant_id,
      v_user_id,
      'ST003',
      '박준서',
      '2013-11-08',
      'male',
      '초등학교 5학년',
      '서울초등학교',
      CURRENT_DATE - INTERVAL '2 years'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 샘플 학생 4: 최지우 (신규 학생 - 30일 이내)
  INSERT INTO public.users (id, tenant_id, email, name, phone, role_code, onboarding_completed, approval_status)
  VALUES (
    uuid_generate_v4(),
    v_tenant_id,
    'student4@example.com',
    '최지우',
    '010-4444-4444',
    NULL,
    false,
    'approved'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.students (id, tenant_id, user_id, student_code, name, birth_date, gender, grade, school, enrollment_date)
    VALUES (
      uuid_generate_v4(),
      v_tenant_id,
      v_user_id,
      'ST004',
      '최지우',
      '2016-02-14',
      'female',
      '초등학교 2학년',
      '역삼초등학교',
      CURRENT_DATE - INTERVAL '15 days'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 샘플 학생 5: 정예준
  INSERT INTO public.users (id, tenant_id, email, name, phone, role_code, onboarding_completed, approval_status)
  VALUES (
    uuid_generate_v4(),
    v_tenant_id,
    'student5@example.com',
    '정예준',
    '010-5555-5555',
    NULL,
    false,
    'approved'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_user_id;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.students (id, tenant_id, user_id, student_code, name, birth_date, gender, grade, school, enrollment_date)
    VALUES (
      uuid_generate_v4(),
      v_tenant_id,
      v_user_id,
      'ST005',
      '정예준',
      '2015-09-30',
      'male',
      '초등학교 3학년',
      '강남초등학교',
      CURRENT_DATE - INTERVAL '8 months'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Sample students created successfully!';
END $$;
