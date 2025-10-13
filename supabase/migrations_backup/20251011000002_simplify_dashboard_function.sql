-- Simplify dashboard function to work with current schema
DROP FUNCTION IF EXISTS get_dashboard_data(date);

CREATE OR REPLACE FUNCTION get_dashboard_data(today_param date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  today_start timestamptz;
  today_end timestamptz;
  two_weeks_ago date;
  current_tenant_id uuid;
BEGIN
  -- Get current tenant_id
  current_tenant_id := get_current_tenant_id();

  today_start := today_param::timestamptz;
  today_end := (today_param + interval '1 day')::timestamptz;
  two_weeks_ago := today_param - interval '14 days';

  SELECT json_build_object(
    'stats', json_build_object(
      'totalStudents', (
        SELECT count(*)
        FROM students
        WHERE tenant_id = current_tenant_id
          AND deleted_at IS NULL
      ),
      'activeClasses', (
        SELECT count(*)
        FROM classes
        WHERE tenant_id = current_tenant_id
          AND deleted_at IS NULL
      ),
      'todayAttendance', (
        SELECT count(*)
        FROM attendance
        WHERE tenant_id = current_tenant_id
          AND check_in_at >= today_start
          AND check_in_at < today_end
      ),
      'pendingTodos', (
        SELECT count(*)
        FROM student_todos
        WHERE tenant_id = current_tenant_id
          AND completed_at IS NULL
      ),
      'totalReports', 0,
      'unsentReports', 0
    ),
    'recentStudents', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          s.id,
          s.student_code,
          json_build_object('name', u.name) AS users
        FROM students s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.tenant_id = current_tenant_id
          AND s.deleted_at IS NULL
        ORDER BY s.created_at DESC
        LIMIT 5
      ) t
    ),
    'todaySessions', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          ats.id,
          ats.session_date,
          ats.scheduled_start_at,
          ats.scheduled_end_at,
          ats.status,
          json_build_object('name', c.name) AS classes
        FROM attendance_sessions ats
        LEFT JOIN classes c ON ats.class_id = c.id
        WHERE ats.tenant_id = current_tenant_id
          AND ats.session_date = today_param
        ORDER BY ats.scheduled_start_at
      ) t
    ),
    'birthdayStudents', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          s.id,
          json_build_object('name', u.name, 'birth_date', s.birth_date) AS users
        FROM students s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.tenant_id = current_tenant_id
          AND s.deleted_at IS NULL
          AND s.birth_date IS NOT NULL
          AND to_char(s.birth_date, 'MM-DD') = to_char(today_param, 'MM-DD')
      ) t
    ),
    'scheduledConsultations', '[]'::json,  -- Simplified - consultations table doesn't have scheduled_at
    'studentAlerts', json_build_object(
      'longAbsence', '[]'::json,
      'pendingAssignments', (
        SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            s.id,
            s.student_code,
            json_build_object('name', u.name) AS users,
            (
              SELECT count(*)
              FROM student_todos st
              WHERE st.tenant_id = current_tenant_id
                AND st.student_id = s.id
                AND st.completed_at IS NULL
            ) AS pending_count
          FROM students s
          LEFT JOIN users u ON s.user_id = u.id
          WHERE s.tenant_id = current_tenant_id
            AND s.deleted_at IS NULL
            AND EXISTS (
              SELECT 1
              FROM student_todos st
              WHERE st.tenant_id = current_tenant_id
                AND st.student_id = s.id
                AND st.completed_at IS NULL
            )
          ORDER BY pending_count DESC
          LIMIT 10
        ) t
      )
    ),
    'financialData', json_build_object(
      'currentMonthRevenue', 0,
      'previousMonthRevenue', 0,
      'unpaidTotal', 0,
      'unpaidCount', 0
    ),
    'classStatus', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          c.id,
          c.name,
          c.capacity,
          (
            SELECT count(*)
            FROM class_enrollments ce
            WHERE ce.class_id = c.id
              AND ce.status = 'active'
          ) AS enrolled_count
        FROM classes c
        WHERE c.tenant_id = current_tenant_id
          AND c.deleted_at IS NULL
        ORDER BY c.name
      ) t
    ),
    'parentsToContact', '[]'::json
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_data(date) TO authenticated;

COMMENT ON FUNCTION get_dashboard_data(date) IS 'Simplified dashboard data function that works with current schema';