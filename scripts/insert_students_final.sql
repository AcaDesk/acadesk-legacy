-- 학생 및 보호자 데이터 입력 스크립트 (v7 - Korean Phone Format)
-- student_info.json 기반으로 생성
-- Tenant: cf5ba30f-4081-494f-952f-45a7264a0c5d
-- 전화번호: 한국 형식 (010-XXXX-XXXX) 그대로 저장

DO $$
DECLARE
  v_tenant_id UUID := 'cf5ba30f-4081-494f-952f-45a7264a0c5d';
  v_student_user_id UUID;
  v_guardian_user_id UUID;
  v_student_id UUID;
  v_guardian_id UUID;
  v_hashed_pin TEXT := '$2a$10$YQjLw3qH0ZxJxKZQXH0LYOvQ3Y6mZKZ5aVHGJ1mP0YzQXH0LYOvQ3q';
  v_counter INT := 0;
  v_total INT := 53;
  v_guardian_phones TEXT[];
  v_phone TEXT;
  v_student_name TEXT;
  v_guardian_index INT;
BEGIN
  RAISE NOTICE 'Starting student and guardian insertion...';
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
  RAISE NOTICE 'Total students to insert: %', v_total;


  -- ========================================
  -- Student 1/53: 박규빈
  -- ========================================
  v_counter := 1;
  v_student_name := '박규빈';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '중앙초1',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 박규빈
  v_guardian_phones := '{01075425617}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 2/53: 박다빈
  -- ========================================
  v_counter := 2;
  v_student_name := '박다빈';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01059588764',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01059588764',
    '중앙초1',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 박다빈
  v_guardian_phones := '{01085714200}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 3/53: 이시율
  -- ========================================
  v_counter := 3;
  v_student_name := '이시율';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '중앙초1',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 이시율
  v_guardian_phones := '{01038532396}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 4/53: 이예준
  -- ========================================
  v_counter := 4;
  v_student_name := '이예준';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01056164330',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01056164330',
    '중앙초1',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 이예준
  v_guardian_phones := '{01038725666}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 5/53: 이차희
  -- ========================================
  v_counter := 5;
  v_student_name := '이차희';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '금병초1',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 이차희
  v_guardian_phones := '{01084020043}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 6/53: 문하윤
  -- ========================================
  v_counter := 6;
  v_student_name := '문하윤';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '대흥초1',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 문하윤
  v_guardian_phones := '{01027628586}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 7/53: 강예은
  -- ========================================
  v_counter := 7;
  v_student_name := '강예은';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '금병초2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 강예은
  v_guardian_phones := '{01055094520}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 8/53: 김유주
  -- ========================================
  v_counter := 8;
  v_student_name := '김유주';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01089368711',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01089368711',
    '금병초2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 김유주
  v_guardian_phones := '{01065228711}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 9/53: 최아진
  -- ========================================
  v_counter := 9;
  v_student_name := '최아진';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01026563136',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01026563136',
    '금병초2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 최아진
  v_guardian_phones := '{01058833136}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 10/53: 안아현
  -- ========================================
  v_counter := 10;
  v_student_name := '안아현';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01098505531',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01098505531',
    '금병초2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 안아현
  v_guardian_phones := '{01088160727}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 11/53: 김준혁
  -- ========================================
  v_counter := 11;
  v_student_name := '김준혁';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '중앙초2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 김준혁
  v_guardian_phones := '{01091802805}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 12/53: 박가람
  -- ========================================
  v_counter := 12;
  v_student_name := '박가람';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '대홍초2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 박가람
  v_guardian_phones := '{01048522148}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 13/53: 정은후
  -- ========================================
  v_counter := 13;
  v_student_name := '정은후';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '대흥초2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 정은후
  v_guardian_phones := '{01028496489}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 14/53: 박윤재
  -- ========================================
  v_counter := 14;
  v_student_name := '박윤재';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '장등초2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 박윤재
  v_guardian_phones := '{01031746484}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 15/53: 최윤아
  -- ========================================
  v_counter := 15;
  v_student_name := '최윤아';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01032806616',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01032806616',
    '중앙초3',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 최윤아
  v_guardian_phones := '{01033856118}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 16/53: 박이안
  -- ========================================
  v_counter := 16;
  v_student_name := '박이안';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01058473189',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01058473189',
    '금병초3',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 박이안
  v_guardian_phones := '{01024843711,01064623189}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 17/53: 김태민
  -- ========================================
  v_counter := 17;
  v_student_name := '김태민';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '대흥초4',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 김태민
  v_guardian_phones := '{01085878153}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 18/53: 반지운
  -- ========================================
  v_counter := 18;
  v_student_name := '반지운';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01092302349',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01092302349',
    '금병초4',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 반지운
  v_guardian_phones := '{01024582349}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 19/53: 한하린
  -- ========================================
  v_counter := 19;
  v_student_name := '한하린';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01031336646',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01031336646',
    '중앙초4',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 한하린
  v_guardian_phones := '{01053209600}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 20/53: 송유라
  -- ========================================
  v_counter := 20;
  v_student_name := '송유라';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '중앙초4',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 송유라
  v_guardian_phones := '{01023355025}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 21/53: 이태관
  -- ========================================
  v_counter := 21;
  v_student_name := '이태관';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '중앙초4',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 이태관
  v_guardian_phones := '{01084496606}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 22/53: 지서준
  -- ========================================
  v_counter := 22;
  v_student_name := '지서준';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '중앙초4',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 지서준
  v_guardian_phones := '{01025402293}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 23/53: 송유의
  -- ========================================
  v_counter := 23;
  v_student_name := '송유의';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '중앙초5',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 송유의
  v_guardian_phones := '{01023355025}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 24/53: 박이룸
  -- ========================================
  v_counter := 24;
  v_student_name := '박이룸';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01057883189',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01057883189',
    '금병초6',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 박이룸
  v_guardian_phones := '{01024843711,01064623189}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 25/53: 반가운
  -- ========================================
  v_counter := 25;
  v_student_name := '반가운';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01054782349',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01054782349',
    '금병초6',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 반가운
  v_guardian_phones := '{01024582349}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 26/53: 전예지
  -- ========================================
  v_counter := 26;
  v_student_name := '전예지';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01022434549',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01022434549',
    '중앙초6',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 전예지
  v_guardian_phones := '{01031534549}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 27/53: 한세빈
  -- ========================================
  v_counter := 27;
  v_student_name := '한세빈';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01082365183',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01082365183',
    '중앙초6',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 한세빈
  v_guardian_phones := '{01065263693}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 28/53: 조국
  -- ========================================
  v_counter := 28;
  v_student_name := '조국';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '대흥초6',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 조국
  v_guardian_phones := '{01089419922}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 29/53: 김나연
  -- ========================================
  v_counter := 29;
  v_student_name := '김나연';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01036127363',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01036127363',
    '장등중1',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 김나연
  v_guardian_phones := '{01031533900}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 30/53: 임영현
  -- ========================================
  v_counter := 30;
  v_student_name := '임영현';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01071670464',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01071670464',
    '장등중1',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 임영현
  v_guardian_phones := '{01029050464}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 31/53: 심유진
  -- ========================================
  v_counter := 31;
  v_student_name := '심유진';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '대산중1',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 심유진
  v_guardian_phones := '{01053195417}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 32/53: 김주은
  -- ========================================
  v_counter := 32;
  v_student_name := '김주은';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01084426561',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01084426561',
    '장등중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 김주은
  v_guardian_phones := '{01084229592,01098532258}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 33/53: 김효린
  -- ========================================
  v_counter := 33;
  v_student_name := '김효린';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01089094609',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01089094609',
    '장등중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 김효린
  v_guardian_phones := '{01045124609}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 34/53: 이광호
  -- ========================================
  v_counter := 34;
  v_student_name := '이광호';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '장등중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 이광호
  v_guardian_phones := '{01058704684}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 35/53: 정다혜
  -- ========================================
  v_counter := 35;
  v_student_name := '정다혜';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01089070728',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01089070728',
    '장등중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 정다혜
  v_guardian_phones := '{01067130309}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 36/53: 서은빈
  -- ========================================
  v_counter := 36;
  v_student_name := '서은빈';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01071251783',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01071251783',
    '한얼중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 서은빈
  v_guardian_phones := '{01020771783}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 37/53: 하예진
  -- ========================================
  v_counter := 37;
  v_student_name := '하예진';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '한얼중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 하예진
  v_guardian_phones := '{01020360808}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 38/53: 김주찬
  -- ========================================
  v_counter := 38;
  v_student_name := '김주찬';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '한얼중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 김주찬
  v_guardian_phones := '{01095059101}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 39/53: 김은찬
  -- ========================================
  v_counter := 39;
  v_student_name := '김은찬';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '한얼중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 김은찬
  v_guardian_phones := '{01095059101}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 40/53: 김지민
  -- ========================================
  v_counter := 40;
  v_student_name := '김지민';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01057965100',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01057965100',
    '한림중3',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 김지민
  v_guardian_phones := '{01036160004}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 41/53: 문소율
  -- ========================================
  v_counter := 41;
  v_student_name := '문소율';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01089849574',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01089849574',
    '진영중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 문소율
  v_guardian_phones := '{01055809574}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 42/53: 고예진
  -- ========================================
  v_counter := 42;
  v_student_name := '고예진';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01054453901',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01054453901',
    '진영중1',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 고예진
  v_guardian_phones := '{01022928526}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 43/53: 강유정
  -- ========================================
  v_counter := 43;
  v_student_name := '강유정';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01085308708',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01085308708',
    '한얼중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 강유정
  v_guardian_phones := '{01038158708}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 44/53: 조예나
  -- ========================================
  v_counter := 44;
  v_student_name := '조예나';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01045899476',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01045899476',
    '한얼중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 조예나
  v_guardian_phones := '{01063359476}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 45/53: 도유민
  -- ========================================
  v_counter := 45;
  v_student_name := '도유민';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '진영중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 도유민
  v_guardian_phones := '{01093566887,01025223582}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 46/53: 김기주
  -- ========================================
  v_counter := 46;
  v_student_name := '김기주';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    NULL,
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    NULL,
    '진영중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 김기주
  v_guardian_phones := '{01022453628}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 47/53: 서지민
  -- ========================================
  v_counter := 47;
  v_student_name := '서지민';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01047022315',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01047022315',
    '장등중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 서지민
  v_guardian_phones := '{01093442315}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 48/53: 남현서
  -- ========================================
  v_counter := 48;
  v_student_name := '남현서';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01045676505',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01045676505',
    '장등중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 남현서
  v_guardian_phones := '{01044707799}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 49/53: 이승민
  -- ========================================
  v_counter := 49;
  v_student_name := '이승민';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '1050482868',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '1050482868',
    '장등중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 이승민
  v_guardian_phones := '{01024142868}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 50/53: 김민준
  -- ========================================
  v_counter := 50;
  v_student_name := '김민준';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01076104264',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01076104264',
    '장등중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 김민준
  v_guardian_phones := '{01094201209}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 51/53: 이승훈
  -- ========================================
  v_counter := 51;
  v_student_name := '이승훈';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01075145963',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01075145963',
    '장등중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 이승훈
  v_guardian_phones := '{01023945963}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 52/53: 조우형
  -- ========================================
  v_counter := 52;
  v_student_name := '조우형';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01045314335',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01045314335',
    '한림중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 조우형
  v_guardian_phones := '{01045474335}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  -- ========================================
  -- Student 53/53: 방서영
  -- ========================================
  v_counter := 53;
  v_student_name := '방서영';
  
  -- Create user for student
  INSERT INTO users (
    tenant_id,
    name,
    phone,
    role_code
  )
  VALUES (
    v_tenant_id,
    v_student_name,
    '01056330966',
    'student'
  )
  RETURNING id INTO v_student_user_id;
  
  -- Create student record
  INSERT INTO students (
    tenant_id,
    user_id,
    student_code,
    name,
    student_phone,
    grade,
    kiosk_pin
  )
  VALUES (
    v_tenant_id,
    v_student_user_id,
    'STU' || LPAD(v_counter::TEXT, 4, '0'),
    v_student_name,
    '01056330966',
    '한림중2',
    v_hashed_pin
  )
  RETURNING id INTO v_student_id;

  -- Create guardians for 방서영
  v_guardian_phones := '{01086040966}';
  v_guardian_index := 0;
  
  FOREACH v_phone IN ARRAY v_guardian_phones
  LOOP
    v_guardian_index := v_guardian_index + 1;
    
    -- Check if guardian already exists
    SELECT id INTO v_guardian_id
    FROM guardians
    WHERE tenant_id = v_tenant_id
      AND phone = v_phone
      AND deleted_at IS NULL
    LIMIT 1;
    
    IF v_guardian_id IS NULL THEN
      -- Create user for guardian
      INSERT INTO users (
        tenant_id,
        name,
        phone,
        role_code
      )
      VALUES (
        v_tenant_id,
        v_student_name || ' 보호자',
        v_phone,
        'parent'
      )
      RETURNING id INTO v_guardian_user_id;
      
      -- Create guardian record
      INSERT INTO guardians (
        tenant_id,
        user_id,
        name,
        phone,
        relationship
      )
      VALUES (
        v_tenant_id,
        v_guardian_user_id,
        v_student_name || ' 보호자',
        v_phone,
        '부모'
      )
      RETURNING id INTO v_guardian_id;
      
      RAISE NOTICE '  → Created new guardian with phone: %', v_phone;
    ELSE
      RAISE NOTICE '  → Using existing guardian with phone: %', v_phone;
    END IF;
    
    -- Create student-guardian relationship
    INSERT INTO student_guardians (
      tenant_id,
      student_id,
      guardian_id,
      relation,
      is_primary
    )
    VALUES (
      v_tenant_id,
      v_student_id,
      v_guardian_id,
      '부모',
      v_guardian_index = 1
    );
  END LOOP;

  RAISE NOTICE '✅ Successfully inserted student %/% : %', v_counter, v_total, v_student_name;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 All % students inserted successfully!', v_total;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error inserting student %/%: % (SQLSTATE: %)', 
      v_counter, v_total, SQLERRM, SQLSTATE;
    ROLLBACK;
END $$;
