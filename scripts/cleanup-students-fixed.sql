-- Cleanup script for student data (Fixed - With Users)
-- WARNING: This will delete ALL student-related data for the specified tenant
-- Tenant: cf5ba30f-4081-494f-952f-45a7264a0c5d

DO $$
DECLARE
  v_tenant_id UUID := 'cf5ba30f-4081-494f-952f-45a7264a0c5d';
  v_student_count INT;
  v_guardian_count INT;
  v_student_user_count INT;
  v_guardian_user_count INT;
BEGIN
  -- Get counts before deletion for logging
  SELECT COUNT(*) INTO v_student_count
  FROM students
  WHERE tenant_id = v_tenant_id AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_guardian_count
  FROM guardians
  WHERE tenant_id = v_tenant_id AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_student_user_count
  FROM users
  WHERE tenant_id = v_tenant_id
    AND role_code = 'student'
    AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_guardian_user_count
  FROM users
  WHERE tenant_id = v_tenant_id
    AND role_code = 'parent'
    AND deleted_at IS NULL;

  RAISE NOTICE 'Starting cleanup for tenant: %', v_tenant_id;
  RAISE NOTICE 'Students to delete: %', v_student_count;
  RAISE NOTICE 'Guardians to delete: %', v_guardian_count;
  RAISE NOTICE 'Student users to delete: %', v_student_user_count;
  RAISE NOTICE 'Guardian users to delete: %', v_guardian_user_count;

  -- Step 1: Delete student-guardian relationships
  DELETE FROM student_guardians
  WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted student-guardian relationships';

  -- Step 2: Delete class enrollments
  DELETE FROM class_enrollments
  WHERE tenant_id = v_tenant_id
    AND student_id IN (
      SELECT id FROM students WHERE tenant_id = v_tenant_id
    );
  RAISE NOTICE '✓ Deleted class enrollments';

  -- Step 3: Delete exam scores
  DELETE FROM exam_scores
  WHERE tenant_id = v_tenant_id
    AND student_id IN (
      SELECT id FROM students WHERE tenant_id = v_tenant_id
    );
  RAISE NOTICE '✓ Deleted exam scores';

  -- Step 4: Delete todos assigned to students
  DELETE FROM todos
  WHERE tenant_id = v_tenant_id
    AND student_id IN (
      SELECT id FROM students WHERE tenant_id = v_tenant_id
    );
  RAISE NOTICE '✓ Deleted student todos';

  -- Step 5: Delete attendance records
  DELETE FROM attendance_records
  WHERE tenant_id = v_tenant_id
    AND student_id IN (
      SELECT id FROM students WHERE tenant_id = v_tenant_id
    );
  RAISE NOTICE '✓ Deleted attendance records';

  -- Step 6: Delete students
  DELETE FROM students
  WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted % students', v_student_count;

  -- Step 7: Delete guardians
  DELETE FROM guardians
  WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '✓ Deleted % guardians', v_guardian_count;

  -- Step 8: Delete student users
  DELETE FROM users
  WHERE tenant_id = v_tenant_id
    AND role_code = 'student';
  RAISE NOTICE '✓ Deleted % student users', v_student_user_count;

  -- Step 9: Delete guardian/parent users
  DELETE FROM users
  WHERE tenant_id = v_tenant_id
    AND role_code = 'parent';
  RAISE NOTICE '✓ Deleted % guardian users', v_guardian_user_count;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Cleanup completed successfully';
  RAISE NOTICE 'Total records deleted: %', v_student_count + v_guardian_count + v_student_user_count + v_guardian_user_count;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error during cleanup: %', SQLERRM;
    ROLLBACK;
END $$;
