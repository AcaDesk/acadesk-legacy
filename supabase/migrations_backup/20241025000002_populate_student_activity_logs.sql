-- ============================================================================
-- Populate Student Activity Logs from Existing Data
-- ============================================================================
-- This migration backfills student_activity_logs table with historical data
-- from existing tables (exam_scores, attendance, consultations, etc.)
-- ============================================================================

-- ============================================================================
-- 1. Import Exam Scores
-- ============================================================================
-- First check if exam_scores table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'exam_scores'
  ) THEN
    INSERT INTO student_activity_logs (
      tenant_id,
      student_id,
      activity_type,
      activity_date,
      title,
      description,
      metadata,
      created_by,
      created_at
    )
    SELECT
      es.tenant_id,
      es.student_id,
      'exam_score' as activity_type,
      COALESCE(e.exam_date::timestamptz, es.created_at) as activity_date,
      COALESCE(e.name, '시험') || ' 성적 입력' as title,
      es.feedback as description,
      jsonb_build_object(
        'exam_id', es.exam_id,
        'percentage', es.percentage,
        'subject', e.category_code
      ) as metadata,
      NULL as created_by,
      es.created_at
    FROM exam_scores es
    LEFT JOIN exams e ON e.id = es.exam_id;
  END IF;
END $$;

-- ============================================================================
-- 2. Import Attendance Records
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'attendance'
  ) THEN
    INSERT INTO student_activity_logs (
      tenant_id,
      student_id,
      activity_type,
      activity_date,
      title,
      description,
      metadata,
      created_by,
      created_at
    )
    SELECT
      a.tenant_id,
      a.student_id,
      CASE a.status
        WHEN 'present' THEN 'attendance_present'
        WHEN 'absent' THEN 'attendance_absent'
        WHEN 'late' THEN 'attendance_late'
        ELSE 'attendance_present'
      END as activity_type,
      COALESCE(asess.session_date::timestamptz, a.created_at) as activity_date,
      CASE a.status
        WHEN 'present' THEN '출석'
        WHEN 'absent' THEN '결석'
        WHEN 'late' THEN '지각'
        ELSE '출석 기록'
      END as title,
      a.notes as description,
      jsonb_build_object(
        'status', a.status,
        'session_id', a.session_id,
        'check_in_at', a.check_in_at,
        'check_out_at', a.check_out_at,
        'class_name', c.name
      ) as metadata,
      NULL as created_by,
      a.created_at
    FROM attendance a
    LEFT JOIN attendance_sessions asess ON asess.id = a.session_id
    LEFT JOIN classes c ON c.id = asess.class_id;
  END IF;
END $$;

-- ============================================================================
-- 3. Import Consultations
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'consultations'
  ) THEN
    INSERT INTO student_activity_logs (
      tenant_id,
      student_id,
      activity_type,
      activity_date,
      title,
      description,
      metadata,
      created_by,
      created_at
    )
    SELECT
      c.tenant_id,
      c.student_id,
      'consultation' as activity_type,
      COALESCE(c.consultation_date, c.created_at) as activity_date,
      COALESCE(c.title, '상담') as title,
      c.summary as description,
      jsonb_build_object(
        'consultation_id', c.id,
        'consultation_type', c.consultation_type,
        'participants', c.participants,
        'follow_up_needed', c.follow_up_needed
      ) as metadata,
      c.conducted_by as created_by,
      c.created_at
    FROM consultations c;
  END IF;
END $$;

-- ============================================================================
-- 4. Import Class Enrollments
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'class_enrollments'
  ) THEN
    INSERT INTO student_activity_logs (
      tenant_id,
      student_id,
      activity_type,
      activity_date,
      title,
      description,
      metadata,
      created_by,
      created_at
    )
    SELECT
      ce.tenant_id,
      ce.student_id,
      CASE
        WHEN ce.status = 'withdrawn' THEN 'withdrawal'
        ELSE 'enrollment'
      END as activity_type,
      COALESCE(
        CASE WHEN ce.status = 'withdrawn' THEN ce.end_date ELSE ce.enrolled_at END,
        ce.created_at
      ) as activity_date,
      CASE
        WHEN ce.status = 'withdrawn' THEN cls.name || ' 수업 탈퇴'
        ELSE cls.name || ' 수업 등록'
      END as title,
      CASE
        WHEN ce.status = 'withdrawn' THEN ce.withdrawal_reason
        ELSE ce.notes
      END as description,
      jsonb_build_object(
        'enrollment_id', ce.id,
        'class_id', ce.class_id,
        'class_name', cls.name,
        'status', ce.status,
        'subject', cls.subject
      ) as metadata,
      NULL as created_by,
      ce.created_at
    FROM class_enrollments ce
    JOIN classes cls ON cls.id = ce.class_id;
  END IF;
END $$;

-- ============================================================================
-- 5. Import Homework/Todos (if todos table exists)
-- ============================================================================
-- Check if todos table exists and has student_id
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'todos'
  ) AND EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'todos'
    AND column_name = 'student_id'
  ) THEN
    -- Import homework assignments
    INSERT INTO student_activity_logs (
      tenant_id,
      student_id,
      activity_type,
      activity_date,
      title,
      description,
      metadata,
      created_by,
      created_at
    )
    SELECT
      t.tenant_id,
      t.student_id,
      CASE
        WHEN t.completed_at IS NOT NULL THEN 'homework_submitted'
        ELSE 'homework_assigned'
      END as activity_type,
      COALESCE(t.completed_at, t.due_date::timestamptz, t.created_at) as activity_date,
      CASE
        WHEN t.completed_at IS NOT NULL THEN t.title || ' 완료'
        ELSE t.title || ' 배정'
      END as title,
      t.description as description,
      jsonb_build_object(
        'todo_id', t.id,
        'due_date', t.due_date,
        'completed_at', t.completed_at,
        'priority', t.priority,
        'verified', t.verified
      ) as metadata,
      t.assigned_by as created_by,
      t.created_at
    FROM todos t
    WHERE t.student_id IS NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- 6. Import Homeworks (if separate homeworks table exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'homeworks'
  ) THEN
    -- Import homework assignments
    INSERT INTO student_activity_logs (
      tenant_id,
      student_id,
      activity_type,
      activity_date,
      title,
      description,
      metadata,
      created_by,
      created_at
    )
    SELECT
      h.tenant_id,
      h.student_id,
      'homework_assigned' as activity_type,
      COALESCE(h.assigned_date::timestamptz, h.created_at) as activity_date,
      h.title || ' 숙제 배정' as title,
      h.description as description,
      jsonb_build_object(
        'homework_id', h.id,
        'due_date', h.due_date,
        'subject', h.subject,
        'class_id', h.class_id
      ) as metadata,
      h.assigned_by as created_by,
      h.created_at
    FROM homeworks h;

    -- Import homework submissions
    INSERT INTO student_activity_logs (
      tenant_id,
      student_id,
      activity_type,
      activity_date,
      title,
      description,
      metadata,
      created_by,
      created_at
    )
    SELECT
      hs.tenant_id,
      hs.student_id,
      CASE
        WHEN hs.grade IS NOT NULL THEN 'homework_graded'
        ELSE 'homework_submitted'
      END as activity_type,
      COALESCE(hs.graded_at, hs.submitted_at, hs.created_at) as activity_date,
      h.title || CASE
        WHEN hs.grade IS NOT NULL THEN ' 채점 완료'
        ELSE ' 제출'
      END as title,
      hs.feedback as description,
      jsonb_build_object(
        'homework_id', hs.homework_id,
        'submission_id', hs.id,
        'submitted_at', hs.submitted_at,
        'grade', hs.grade,
        'graded_at', hs.graded_at
      ) as metadata,
      COALESCE(hs.graded_by, hs.created_by) as created_by,
      COALESCE(hs.graded_at, hs.submitted_at, hs.created_at)
    FROM homework_submissions hs
    JOIN homeworks h ON h.id = hs.homework_id;
  END IF;
END $$;

-- ============================================================================
-- 7. Import Textbook Progress (if exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'textbook_progress'
  ) THEN
    INSERT INTO student_activity_logs (
      tenant_id,
      student_id,
      activity_type,
      activity_date,
      title,
      description,
      metadata,
      created_by,
      created_at
    )
    SELECT
      tp.tenant_id,
      tp.student_id,
      'textbook_progress' as activity_type,
      tp.updated_at as activity_date,
      tb.title || ' 진도 업데이트' as title,
      tp.notes as description,
      jsonb_build_object(
        'textbook_id', tp.textbook_id,
        'current_page', tp.current_page,
        'total_pages', tb.total_pages,
        'progress_percentage', CASE
          WHEN tb.total_pages > 0 THEN ROUND((tp.current_page::numeric / tb.total_pages::numeric) * 100)
          ELSE 0
        END
      ) as metadata,
      tp.updated_by as created_by,
      tp.updated_at
    FROM textbook_progress tp
    JOIN textbooks tb ON tb.id = tp.textbook_id
    WHERE tp.current_page > 0;
  END IF;
END $$;

-- ============================================================================
-- 8. Import Invoices (if exists)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'invoices'
  ) THEN
    INSERT INTO student_activity_logs (
      tenant_id,
      student_id,
      activity_type,
      activity_date,
      title,
      description,
      metadata,
      created_by,
      created_at
    )
    SELECT
      i.tenant_id,
      i.student_id,
      'invoice_issued' as activity_type,
      i.created_at as activity_date,
      '청구서 발행' as title,
      i.notes as description,
      jsonb_build_object(
        'invoice_id', i.id,
        'amount', i.amount,
        'due_date', i.due_date,
        'status', i.status
      ) as metadata,
      i.created_by,
      i.created_at
    FROM invoices i;
  END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- Count imported records
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM student_activity_logs;
  RAISE NOTICE 'Successfully imported % activity log records', v_count;
END $$;
