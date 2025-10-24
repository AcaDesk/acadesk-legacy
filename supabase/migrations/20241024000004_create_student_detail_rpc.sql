-- ============================================================================
-- Student Detail RPC Function
-- ============================================================================
-- This function replaces complex client-side logic with a single DB call
-- Benefits:
-- 1. Eliminates FK name dependency issues
-- 2. Reduces multiple DB calls to a single RPC call
-- 3. Moves KPI calculation to database for better performance
-- 4. Centralizes complex join logic
-- ============================================================================

CREATE OR REPLACE FUNCTION get_student_detail(
  p_student_id UUID,
  p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student JSONB;
  v_scores JSONB;
  v_todos JSONB;
  v_consultations JSONB;
  v_attendance JSONB;
  v_invoices JSONB;
  v_attendance_rate INTEGER;
  v_avg_score INTEGER;
  v_homework_rate INTEGER;
  v_class_averages JSONB;
BEGIN
  -- 1. Check if student exists and belongs to tenant
  SELECT to_jsonb(s.*) INTO v_student
  FROM students s
  WHERE s.id = p_student_id
    AND s.tenant_id = p_tenant_id
    AND s.deleted_at IS NULL;

  IF v_student IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Add related user data
  v_student := v_student || jsonb_build_object(
    'users', (
      SELECT jsonb_build_object(
        'name', u.name,
        'email', u.email,
        'phone', u.phone
      )
      FROM users u
      WHERE u.id = (v_student->>'user_id')::UUID
    )
  );

  -- 3. Add guardians
  v_student := v_student || jsonb_build_object(
    'student_guardians', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'guardians', jsonb_build_object(
            'id', g.id,
            'relationship', g.relationship,
            'users', (
              SELECT jsonb_build_object(
                'name', gu.name,
                'phone', gu.phone
              )
              FROM users gu
              WHERE gu.id = g.user_id
            )
          )
        )
      )
      FROM student_guardians sg
      JOIN guardians g ON g.id = sg.guardian_id
      WHERE sg.student_id = p_student_id
    ), '[]'::jsonb)
  );

  -- 4. Add class enrollments
  v_student := v_student || jsonb_build_object(
    'class_enrollments', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ce.id,
          'class_id', ce.class_id,
          'status', ce.status,
          'enrolled_at', ce.enrolled_at,
          'end_date', ce.end_date,
          'withdrawal_reason', ce.withdrawal_reason,
          'notes', ce.notes,
          'classes', jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'subject', c.subject,
            'instructor_id', c.instructor_id
          )
        )
      )
      FROM class_enrollments ce
      JOIN classes c ON c.id = ce.class_id
      WHERE ce.student_id = p_student_id
    ), '[]'::jsonb)
  );

  -- 5. Add student schedules
  v_student := v_student || jsonb_build_object(
    'student_schedules', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'day_of_week', ss.day_of_week,
          'scheduled_arrival_time', ss.scheduled_arrival_time
        )
      )
      FROM student_schedules ss
      WHERE ss.student_id = p_student_id
    ), '[]'::jsonb)
  );

  -- 6. Get recent exam scores (last 10)
  SELECT COALESCE(jsonb_agg(score_data), '[]'::jsonb)
  INTO v_scores
  FROM (
    SELECT jsonb_build_object(
      'id', es.id,
      'percentage', es.percentage,
      'created_at', es.created_at,
      'exam_id', es.exam_id,
      'exams', jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'exam_date', e.exam_date,
        'category_code', e.category_code,
        'class_id', e.class_id
      )
    ) as score_data
    FROM exam_scores es
    LEFT JOIN exams e ON e.id = es.exam_id
    WHERE es.student_id = p_student_id
    ORDER BY es.created_at DESC
    LIMIT 10
  ) scores;

  -- 7. Calculate class averages
  SELECT COALESCE(jsonb_object_agg(class_id::TEXT, avg_percentage), '{}'::jsonb)
  INTO v_class_averages
  FROM (
    SELECT
      e.class_id,
      ROUND(AVG(es.percentage)) as avg_percentage
    FROM exam_scores es
    JOIN exams e ON e.id = es.exam_id
    WHERE es.student_id = p_student_id
      AND e.class_id IS NOT NULL
    GROUP BY e.class_id
  ) class_avg;

  -- 8. Get recent todos (last 20)
  SELECT COALESCE(jsonb_agg(todo_data), '[]'::jsonb)
  INTO v_todos
  FROM (
    SELECT jsonb_build_object(
      'id', t.id,
      'title', t.title,
      'due_date', t.due_date,
      'subject', NULL,
      'completed_at', t.completed_at
    ) as todo_data
    FROM todos t
    WHERE t.student_id = p_student_id
    ORDER BY t.created_at DESC
    LIMIT 20
  ) todos;

  -- 9. Get consultations (last 10)
  SELECT COALESCE(jsonb_agg(consultation_data), '[]'::jsonb)
  INTO v_consultations
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'consultation_date', c.created_at,
      'consultation_type', c.consultation_type,
      'content', c.summary,
      'created_at', c.created_at,
      'instructor_id', c.conducted_by
    ) as consultation_data
    FROM consultations c
    WHERE c.student_id = p_student_id
    ORDER BY c.created_at DESC
    LIMIT 10
  ) consultations;

  -- 10. Get attendance records (last 30)
  SELECT COALESCE(jsonb_agg(attendance_data), '[]'::jsonb)
  INTO v_attendance
  FROM (
    SELECT jsonb_build_object(
      'id', a.id,
      'status', a.status,
      'check_in_at', NULL,
      'check_out_at', NULL,
      'notes', NULL,
      'attendance_sessions', CASE
        WHEN asess.id IS NOT NULL THEN
          jsonb_build_object(
            'session_date', asess.session_date,
            'scheduled_start_at', '',
            'scheduled_end_at', '',
            'classes', CASE
              WHEN c.id IS NOT NULL THEN
                jsonb_build_object(
                  'id', c.id,
                  'name', c.name
                )
              ELSE NULL
            END
          )
        ELSE NULL
      END
    ) as attendance_data
    FROM attendance a
    LEFT JOIN attendance_sessions asess ON asess.id = a.session_id
    LEFT JOIN classes c ON c.id = asess.class_id
    WHERE a.student_id = p_student_id
    ORDER BY a.created_at DESC
    LIMIT 30
  ) attendance;

  -- 11. Get invoices (last 10) - Skip if table doesn't exist
  BEGIN
    SELECT COALESCE(jsonb_agg(invoice_data), '[]'::jsonb)
    INTO v_invoices
    FROM (
      SELECT jsonb_build_object(
        'id', i.id,
        'billing_month', '',
        'issue_date', i.created_at,
        'due_date', i.due_date,
        'total_amount', i.amount,
        'paid_amount', 0,
        'status', i.status,
        'notes', NULL,
        'created_at', i.created_at,
        'invoice_items', '[]'::jsonb,
        'payments', '[]'::jsonb
      ) as invoice_data
      FROM invoices i
      WHERE i.student_id = p_student_id
      ORDER BY i.created_at DESC
      LIMIT 10
    ) invoices;
  EXCEPTION
    WHEN undefined_table THEN
      v_invoices := '[]'::jsonb;
  END;

  -- 12. Calculate KPIs
  -- Attendance rate
  SELECT COALESCE(
    ROUND(
      (COUNT(*) FILTER (WHERE a.status = 'present')::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100
    )::INTEGER,
    0
  )
  INTO v_attendance_rate
  FROM attendance a
  WHERE a.student_id = p_student_id;

  -- Average score
  SELECT COALESCE(ROUND(AVG(es.percentage))::INTEGER, 0)
  INTO v_avg_score
  FROM exam_scores es
  WHERE es.student_id = p_student_id;

  -- Homework completion rate
  SELECT COALESCE(
    ROUND(
      (COUNT(*) FILTER (WHERE t.completed_at IS NOT NULL)::NUMERIC /
       NULLIF(COUNT(*), 0)) * 100
    )::INTEGER,
    0
  )
  INTO v_homework_rate
  FROM todos t
  WHERE t.student_id = p_student_id;

  -- 13. Return complete JSON
  RETURN json_build_object(
    'student', v_student,
    'recentScores', v_scores,
    'classAverages', v_class_averages,
    'recentTodos', v_todos,
    'consultations', v_consultations,
    'attendanceRecords', v_attendance,
    'invoices', v_invoices,
    'kpis', json_build_object(
      'attendanceRate', v_attendance_rate,
      'avgScore', v_avg_score,
      'homeworkRate', v_homework_rate
    )
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_student_detail(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_student_detail IS
'Returns complete student detail data including related records and calculated KPIs.
Requires student_id and tenant_id for security.';
