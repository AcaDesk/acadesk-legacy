-- get_student_detail 적극 튜닝 (옵션 F)
--
-- 변경:
--   - exam_scores 3 스캔 → 1 스캔 (CTE 로 recent 10 + class_averages + avg_score 통합)
--   - attendance 2 스캔 → 1 스캔 (recent 30 + attendance_rate 통합)
--   - todos 2 스캔 → 1 스캔 (recent 20 + homework_rate 통합)
--
-- 학생 한 명당 8K 행 exam_scores 스캔 횟수가 1/3 로 감소.
-- JSON 출력 구조 100% 동일 — 클라이언트 코드 영향 없음.

CREATE OR REPLACE FUNCTION public.get_student_detail(
  p_student_id uuid,
  p_tenant_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_student JSONB;
  v_scores JSONB;
  v_class_averages JSONB;
  v_avg_score INTEGER;
  v_todos JSONB;
  v_homework_rate INTEGER;
  v_consultations JSONB;
  v_attendance JSONB;
  v_attendance_rate INTEGER;
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

  -- 2. Related user
  v_student := v_student || jsonb_build_object(
    'users', (
      SELECT jsonb_build_object('name', u.name, 'email', u.email, 'phone', u.phone)
      FROM users u
      WHERE u.id = (v_student->>'user_id')::UUID
    )
  );

  -- 3. Guardians
  v_student := v_student || jsonb_build_object(
    'student_guardians', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'guardians', jsonb_build_object(
            'id', g.id,
            'relationship', g.relationship,
            'users', (
              SELECT jsonb_build_object('name', gu.name, 'phone', gu.phone)
              FROM users gu WHERE gu.id = g.user_id
            )
          )
        )
      )
      FROM student_guardians sg
      JOIN guardians g ON g.id = sg.guardian_id
      WHERE sg.student_id = p_student_id
    ), '[]'::jsonb)
  );

  -- 4. Class enrollments
  v_student := v_student || jsonb_build_object(
    'class_enrollments', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', ce.id, 'class_id', ce.class_id, 'status', ce.status,
          'enrolled_at', ce.enrolled_at, 'end_date', ce.end_date,
          'withdrawal_reason', ce.withdrawal_reason, 'notes', ce.notes,
          'classes', jsonb_build_object(
            'id', c.id, 'name', c.name, 'subject', c.subject,
            'instructor_id', c.instructor_id
          )
        )
      )
      FROM class_enrollments ce
      JOIN classes c ON c.id = ce.class_id
      WHERE ce.student_id = p_student_id
    ), '[]'::jsonb)
  );

  -- 5. Student schedules
  v_student := v_student || jsonb_build_object(
    'student_schedules', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'day_of_week', ss.day_of_week,
        'scheduled_arrival_time', ss.scheduled_arrival_time
      ))
      FROM student_schedules ss
      WHERE ss.student_id = p_student_id
    ), '[]'::jsonb)
  );

  -- 6+7+12. exam_scores 단일 스캔 → recentScores + classAverages + avgScore
  WITH es AS (
    SELECT
      es.id, es.percentage, es.created_at, es.exam_id,
      e.id AS e_id, e.name AS e_name, e.exam_date, e.category_code, e.class_id
    FROM exam_scores es
    LEFT JOIN exams e ON e.id = es.exam_id
    WHERE es.student_id = p_student_id
  )
  SELECT
    COALESCE((
      SELECT jsonb_agg(score_data)
      FROM (
        SELECT jsonb_build_object(
          'id', id, 'percentage', percentage, 'created_at', created_at,
          'exam_id', exam_id,
          'exams', jsonb_build_object(
            'id', e_id, 'name', e_name, 'exam_date', exam_date,
            'category_code', category_code, 'class_id', class_id
          )
        ) AS score_data
        FROM es
        ORDER BY created_at DESC
        LIMIT 10
      ) sc
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_object_agg(class_id::TEXT, avg_pct)
      FROM (
        SELECT class_id, ROUND(AVG(percentage)) AS avg_pct
        FROM es
        WHERE class_id IS NOT NULL
        GROUP BY class_id
      ) ca
    ), '{}'::jsonb),
    COALESCE(ROUND(AVG(percentage))::INTEGER, 0)
  INTO v_scores, v_class_averages, v_avg_score
  FROM es;

  -- 8+13. todos 단일 스캔 → recentTodos + homeworkRate
  WITH t AS (
    SELECT id, title, due_date, completed_at, created_at
    FROM todos
    WHERE student_id = p_student_id
  )
  SELECT
    COALESCE((
      SELECT jsonb_agg(todo_data)
      FROM (
        SELECT jsonb_build_object(
          'id', id, 'title', title, 'due_date', due_date,
          'subject', NULL, 'completed_at', completed_at
        ) AS todo_data
        FROM t
        ORDER BY created_at DESC
        LIMIT 20
      ) td
    ), '[]'::jsonb),
    COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::NUMERIC /
         NULLIF(COUNT(*), 0)) * 100
      )::INTEGER, 0
    )
  INTO v_todos, v_homework_rate
  FROM t;

  -- 9. Consultations (last 10) — 단일 스캔이라 그대로
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
    ) AS consultation_data
    FROM consultations c
    WHERE c.student_id = p_student_id
    ORDER BY c.created_at DESC
    LIMIT 10
  ) cs;

  -- 10+11. attendance 단일 스캔 → attendanceRecords + attendanceRate
  WITH att AS (
    SELECT
      a.id, a.status, a.created_at, a.session_id,
      asess.id AS sess_id, asess.session_date,
      c.id AS cls_id, c.name AS cls_name
    FROM attendance a
    LEFT JOIN attendance_sessions asess ON asess.id = a.session_id
    LEFT JOIN classes c ON c.id = asess.class_id
    WHERE a.student_id = p_student_id
  )
  SELECT
    COALESCE((
      SELECT jsonb_agg(att_data)
      FROM (
        SELECT jsonb_build_object(
          'id', id, 'status', status,
          'check_in_at', NULL, 'check_out_at', NULL, 'notes', NULL,
          'attendance_sessions', CASE
            WHEN sess_id IS NOT NULL THEN
              jsonb_build_object(
                'session_date', session_date,
                'scheduled_start_at', '',
                'scheduled_end_at', '',
                'classes', CASE
                  WHEN cls_id IS NOT NULL THEN
                    jsonb_build_object('id', cls_id, 'name', cls_name)
                  ELSE NULL
                END
              )
            ELSE NULL
          END
        ) AS att_data
        FROM att
        ORDER BY created_at DESC
        LIMIT 30
      ) ad
    ), '[]'::jsonb),
    COALESCE(
      ROUND(
        (COUNT(*) FILTER (WHERE status = 'present')::NUMERIC /
         NULLIF(COUNT(*), 0)) * 100
      )::INTEGER, 0
    )
  INTO v_attendance, v_attendance_rate
  FROM att;

  -- 13. Return
  RETURN json_build_object(
    'student', v_student,
    'recentScores', v_scores,
    'classAverages', v_class_averages,
    'recentTodos', v_todos,
    'consultations', v_consultations,
    'attendanceRecords', v_attendance,
    'invoices', '[]'::jsonb,
    'kpis', json_build_object(
      'attendanceRate', v_attendance_rate,
      'avgScore', v_avg_score,
      'homeworkRate', v_homework_rate
    )
  );
END;
$function$;
