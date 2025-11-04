-- 학년과 학교 분리 스크립트
-- grade 필드에 "학교명+학년" 형식으로 잘못 들어간 데이터를 분리

DO $$
DECLARE
  v_tenant_id UUID := 'cf5ba30f-4081-494f-952f-45a7264a0c5d';
  v_student_record RECORD;
  v_grade_value TEXT;
  v_school_value TEXT;
  v_updated_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting grade and school separation...';

  -- 모든 학생 레코드 순회
  FOR v_student_record IN
    SELECT id, grade
    FROM students
    WHERE tenant_id = v_tenant_id
      AND grade IS NOT NULL
      AND grade ~ '[가-힣]+(초|중|고)[0-9]'  -- 패턴: 한글+초/중/고+숫자
  LOOP
    v_grade_value := v_student_record.grade;

    -- 학교와 학년 분리
    -- 예: "중앙초1" -> school: "중앙초", grade: "초1"
    -- 예: "금병초2" -> school: "금병초", grade: "초2"

    IF v_grade_value ~ '초[0-9]$' THEN
      -- 초등학교인 경우
      v_school_value := regexp_replace(v_grade_value, '(초[0-9])$', '');  -- "중앙"
      v_school_value := v_school_value || '초';  -- "중앙초"
      v_grade_value := regexp_replace(v_grade_value, '^.*(초[0-9])$', '\1');  -- "초1"

    ELSIF v_grade_value ~ '중[0-9]$' THEN
      -- 중학교인 경우
      v_school_value := regexp_replace(v_grade_value, '(중[0-9])$', '');
      v_school_value := v_school_value || '중';
      v_grade_value := regexp_replace(v_grade_value, '^.*(중[0-9])$', '\1');

    ELSIF v_grade_value ~ '고[0-9]$' THEN
      -- 고등학교인 경우
      v_school_value := regexp_replace(v_grade_value, '(고[0-9])$', '');
      v_school_value := v_school_value || '고';
      v_grade_value := regexp_replace(v_grade_value, '^.*(고[0-9])$', '\1');

    ELSE
      -- 패턴이 맞지 않으면 건너뜀
      RAISE NOTICE 'Skipping unexpected format: %', v_grade_value;
      CONTINUE;
    END IF;

    -- 업데이트 실행
    UPDATE students
    SET
      grade = v_grade_value,
      school = v_school_value
    WHERE id = v_student_record.id;

    v_updated_count := v_updated_count + 1;

    RAISE NOTICE 'Updated student %: grade=% -> grade=%, school=%',
      v_student_record.id, v_student_record.grade, v_grade_value, v_school_value;
  END LOOP;

  RAISE NOTICE 'Completed! Updated % students', v_updated_count;

  -- 결과 확인
  RAISE NOTICE '--- Sample Results ---';
  FOR v_student_record IN
    SELECT id, name, grade, school
    FROM students
    WHERE tenant_id = v_tenant_id
    LIMIT 10
  LOOP
    RAISE NOTICE 'Student: % | Grade: % | School: %',
      v_student_record.name, v_student_record.grade, v_student_record.school;
  END LOOP;

END $$;
