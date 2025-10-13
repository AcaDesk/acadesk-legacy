-- Fix dashboard RPC to use correct column name: check_in_at instead of check_in_time
-- Force recreation of the function

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
      'totalReports', (
        SELECT count(*)
        FROM reports
        WHERE tenant_id = current_tenant_id
      ),
      'unsentReports', (
        SELECT count(*)
        FROM reports
        WHERE tenant_id = current_tenant_id
          AND sent_at IS NULL
      )
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
    'scheduledConsultations', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT
          cons.id,
          cons.scheduled_at,
          json_build_object(
            'users', json_build_object('name', u.name)
          ) AS students
        FROM consultations cons
        LEFT JOIN students s ON cons.student_id = s.id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE cons.tenant_id = current_tenant_id
          AND cons.scheduled_at >= today_start
          AND cons.scheduled_at < today_end
        ORDER BY cons.scheduled_at
      ) t
    ),
    'studentAlerts', json_build_object(
      'longAbsence', (
        SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
        FROM (
          SELECT
            s.id,
            s.student_code,
            json_build_object('name', u.name) AS users,
            coalesce(
              (
                SELECT count(*)::float / nullif(count(DISTINCT ats.session_date), 0) * 100
                FROM attendance_sessions ats
                LEFT JOIN attendance a ON a.session_id = ats.id AND a.student_id = s.id
                WHERE ats.tenant_id = current_tenant_id
                  AND ats.session_date >= two_weeks_ago
                  AND ats.session_date <= today_param
                  AND a.id IS NOT NULL
              ), 0
            ) AS attendance_rate
          FROM students s
          LEFT JOIN users u ON s.user_id = u.id
          WHERE s.tenant_id = current_tenant_id
            AND s.deleted_at IS NULL
          HAVING coalesce(
            (
              SELECT count(*)::float / nullif(count(DISTINCT ats.session_date), 0) * 100
              FROM attendance_sessions ats
              LEFT JOIN attendance a ON a.session_id = ats.id AND a.student_id = s.id
              WHERE ats.tenant_id = current_tenant_id
                AND ats.session_date >= two_weeks_ago
                AND ats.session_date <= today_param
                AND a.id IS NOT NULL
            ), 0
          ) < 50
          LIMIT 10
        ) t
      ),
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
          HAVING (
            SELECT count(*)
            FROM student_todos st
            WHERE st.tenant_id = current_tenant_id
              AND st.student_id = s.id
              AND st.completed_at IS NULL
          ) >= 3
          ORDER BY pending_count DESC
          LIMIT 10
        ) t
      )
    ),
    'financialData', json_build_object(
      'currentMonthRevenue', coalesce((
        SELECT sum(amount_paid)
        FROM payments
        WHERE tenant_id = current_tenant_id
          AND date_trunc('month', payment_date) = date_trunc('month', today_param::timestamptz)
      ), 0),
      'previousMonthRevenue', coalesce((
        SELECT sum(amount_paid)
        FROM payments
        WHERE tenant_id = current_tenant_id
          AND date_trunc('month', payment_date) = date_trunc('month', today_param::timestamptz - interval '1 month')
      ), 0),
      'unpaidTotal', coalesce((
        SELECT sum(tuition_fee - amount_paid)
        FROM tuition_invoices
        WHERE tenant_id = current_tenant_id
          AND status != 'paid'
      ), 0),
      'unpaidCount', coalesce((
        SELECT count(*)
        FROM tuition_invoices
        WHERE tenant_id = current_tenant_id
          AND status != 'paid'
      ), 0)
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
    'parentsToContact', (
      SELECT coalesce(json_agg(row_to_json(t)), '[]'::json)
      FROM (
        SELECT DISTINCT
          s.id,
          s.student_code,
          json_build_object('name', u.name) AS users
        FROM students s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.tenant_id = current_tenant_id
          AND s.deleted_at IS NULL
          AND (
            -- Students with pending assignments
            EXISTS (
              SELECT 1 FROM student_todos st
              WHERE st.tenant_id = current_tenant_id
                AND st.student_id = s.id
                AND st.completed_at IS NULL
                AND st.due_date < today_param
            )
            OR
            -- Students with low attendance
            EXISTS (
              SELECT 1
              FROM attendance_sessions ats
              LEFT JOIN attendance a ON a.session_id = ats.id AND a.student_id = s.id
              WHERE ats.tenant_id = current_tenant_id
                AND ats.session_date >= two_weeks_ago
                AND a.id IS NULL
              HAVING count(*) >= 3
            )
          )
        LIMIT 10
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_data(date) TO authenticated;

COMMENT ON FUNCTION get_dashboard_data(date) IS 'Get all dashboard data in a single RPC call with tenant isolation';
