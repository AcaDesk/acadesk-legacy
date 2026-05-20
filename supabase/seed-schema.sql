


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


CREATE TYPE "public"."message_category" AS ENUM (
    'general',
    'report',
    'todo',
    'attendance',
    'event'
);


ALTER TYPE "public"."message_category" OWNER TO "postgres";


CREATE TYPE "public"."message_channel" AS ENUM (
    'sms',
    'email',
    'lms',
    'kakao',
    'mms'
);


ALTER TYPE "public"."message_channel" OWNER TO "postgres";


CREATE TYPE "public"."messaging_provider" AS ENUM (
    'aligo',
    'solapi',
    'nhncloud'
);


ALTER TYPE "public"."messaging_provider" OWNER TO "postgres";


CREATE TYPE "public"."notification_status" AS ENUM (
    'pending',
    'sent',
    'failed'
);


ALTER TYPE "public"."notification_status" OWNER TO "postgres";


CREATE TYPE "public"."task_kind" AS ENUM (
    'in_class',
    'homework'
);


ALTER TYPE "public"."task_kind" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_mark_retest"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  -- If score percentage is below passing_score, mark as retest_required
  IF NEW.percentage IS NOT NULL AND NEW.status = 'submitted' THEN
    -- Get passing_score from exams table
    DECLARE
      v_passing_score NUMERIC(5,2);
    BEGIN
      SELECT passing_score INTO v_passing_score
      FROM public.exams
      WHERE id = NEW.exam_id;

      -- If passing_score is set and score is below it, mark for retest
      IF v_passing_score IS NOT NULL AND NEW.percentage < v_passing_score THEN
        NEW.status := 'retest_required';
        NEW.is_retest := false; -- This is the original test, not a retest
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_and_mark_retest"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_and_mark_retest"() IS '합격 점수 미달 시 자동으로 재시험 대상으로 마킹';



CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    (select role_code from public.users where id = auth.uid())
  );
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select coalesce(
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid,
    (select tenant_id from public.users where id = auth.uid())
  );
$$;


ALTER FUNCTION "public"."current_user_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fn_student_tasks_normalize_dow"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.due_day_of_week = 0 THEN
    NEW.due_day_of_week := 7;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."fn_student_tasks_normalize_dow"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exam_score_counts"("p_tenant_id" "uuid", "p_exam_ids" "uuid"[]) RETURNS TABLE("exam_id" "uuid", "cnt" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT es.exam_id, COUNT(*) AS cnt
  FROM public.exam_scores es
  WHERE es.tenant_id = p_tenant_id
    AND es.exam_id = ANY(p_exam_ids)
    AND es.deleted_at IS NULL
  GROUP BY es.exam_id;
$$;


ALTER FUNCTION "public"."get_exam_score_counts"("p_tenant_id" "uuid", "p_exam_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_exam_score_counts"("p_tenant_id" "uuid", "p_exam_ids" "uuid"[]) IS '시험 목록 페이지(/grades)에서 시험별 배정 학생 수(exam_scores 행 카운트)를 일괄 반환. service_role 전용.';



CREATE OR REPLACE FUNCTION "public"."get_monthly_subject_scores"("p_student_id" "uuid", "p_year_month" "text") RETURNS TABLE("subject_id" "uuid", "subject_name" "text", "subject_code" "text", "avg_score" numeric, "total_exams" bigint, "improvement_from_prev_month" numeric)
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH current_month AS (
    SELECT
      s.id AS subject_id,
      s.name AS subject_name,
      s.code AS subject_code,
      AVG(es.percentage) AS avg_score,
      COUNT(es.id) AS total_exams
    FROM public.subjects s
    LEFT JOIN public.exams e ON e.subject_id = s.id
    LEFT JOIN public.exam_scores es ON es.exam_id = e.id AND es.student_id = p_student_id
    WHERE
      TO_CHAR(e.exam_date, 'YYYY-MM') = p_year_month
      AND es.deleted_at IS NULL
      AND e.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND es.status = 'submitted' -- Only count submitted scores
    GROUP BY s.id, s.name, s.code
  ),
  prev_month AS (
    SELECT
      s.id AS subject_id,
      AVG(es.percentage) AS avg_score
    FROM public.subjects s
    LEFT JOIN public.exams e ON e.subject_id = s.id
    LEFT JOIN public.exam_scores es ON es.exam_id = e.id AND es.student_id = p_student_id
    WHERE
      TO_CHAR(e.exam_date, 'YYYY-MM') = TO_CHAR((p_year_month || '-01')::DATE - INTERVAL '1 month', 'YYYY-MM')
      AND es.deleted_at IS NULL
      AND e.deleted_at IS NULL
      AND s.deleted_at IS NULL
      AND es.status = 'submitted'
    GROUP BY s.id
  )
  SELECT
    cm.subject_id,
    cm.subject_name,
    cm.subject_code,
    ROUND(cm.avg_score, 2) AS avg_score,
    cm.total_exams,
    ROUND(cm.avg_score - COALESCE(pm.avg_score, 0), 2) AS improvement_from_prev_month
  FROM current_month cm
  LEFT JOIN prev_month pm ON pm.subject_id = cm.subject_id
  WHERE cm.total_exams > 0
  ORDER BY cm.subject_name;
END;
$$;


ALTER FUNCTION "public"."get_monthly_subject_scores"("p_student_id" "uuid", "p_year_month" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_monthly_subject_scores"("p_student_id" "uuid", "p_year_month" "text") IS '학생의 월별 과목 성적 평균 및 전월 대비 변화';



CREATE OR REPLACE FUNCTION "public"."get_student_detail"("p_student_id" "uuid", "p_tenant_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."get_student_detail"("p_student_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_student_detail"("p_student_id" "uuid", "p_tenant_id" "uuid") IS 'Returns complete student detail data including related records and calculated KPIs.
Requires student_id and tenant_id for security.';



CREATE OR REPLACE FUNCTION "public"."log_student_activity"("p_tenant_id" "uuid", "p_student_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_activity_date" timestamp with time zone DEFAULT "now"(), "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO student_activity_logs (
    tenant_id,
    student_id,
    activity_type,
    title,
    description,
    metadata,
    activity_date,
    created_by
  ) VALUES (
    p_tenant_id,
    p_student_id,
    p_activity_type,
    p_title,
    p_description,
    p_metadata,
    p_activity_date,
    COALESCE(p_created_by, auth.uid())
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_student_activity"("p_tenant_id" "uuid", "p_student_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text", "p_metadata" "jsonb", "p_activity_date" timestamp with time zone, "p_created_by" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_student_activity"("p_tenant_id" "uuid", "p_student_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text", "p_metadata" "jsonb", "p_activity_date" timestamp with time zone, "p_created_by" "uuid") IS 'Helper function to easily log student activities from triggers or application code';



CREATE OR REPLACE FUNCTION "public"."normalize_phone"("p" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE PARALLEL SAFE
    AS $$
  select case
    when p is null then null
    when length(regexp_replace(p, '\D', '', 'g')) >= 9
      then regexp_replace(p, '\D', '', 'g')
    else null
  end
$$;


ALTER FUNCTION "public"."normalize_phone"("p" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."normalize_phone"("p" "text") IS '전화번호에서 숫자만 추출 (9자리 이상일 때만 반환, 그 외 null)';



CREATE OR REPLACE FUNCTION "public"."search_students_list"("p_tenant_id" "uuid", "p_search" "text" DEFAULT NULL::"text", "p_grade" "text" DEFAULT NULL::"text", "p_class_id" "text" DEFAULT NULL::"text", "p_school" "text" DEFAULT NULL::"text", "p_commute_method" "text" DEFAULT NULL::"text", "p_marketing_source" "text" DEFAULT NULL::"text", "p_enrollment_date_from" "date" DEFAULT NULL::"date", "p_enrollment_date_to" "date" DEFAULT NULL::"date", "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("student" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  WITH params AS (
    SELECT
      NULLIF(trim(p_search), '') AS query,
      CASE
        WHEN NULLIF(trim(p_search), '') IS NULL THEN NULL
        ELSE '%' || replace(replace(replace(NULLIF(trim(p_search), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      END AS pattern,
      GREATEST(1, LEAST(COALESCE(p_limit, 20), 100)) AS page_limit,
      GREATEST(COALESCE(p_offset, 0), 0) AS page_offset,
      (CURRENT_DATE - INTERVAL '30 days')::date AS attendance_from
  ),
  base AS (
    SELECT
      s.id,
      s.student_code,
      s.grade,
      s.school,
      s.enrollment_date,
      s.birth_date,
      s.student_phone,
      s.profile_image_url,
      s.commute_method,
      s.marketing_source,
      s.created_at,
      u.name AS user_name,
      u.email AS user_email,
      u.phone AS user_phone,
      -- 관련도 점수 (검색어 NULL 이면 coalesce 로 빈 문자열 → similarity = 0)
      GREATEST(
        similarity(coalesce(s.student_code, ''), coalesce(p.query, '')),
        similarity(coalesce(s.student_phone, ''), coalesce(p.query, '')),
        similarity(coalesce(u.name, ''), coalesce(p.query, '')),
        similarity(coalesce(u.phone, ''), coalesce(p.query, ''))
      ) AS rel_score
    FROM public.students s
    JOIN public.users u ON u.id = s.user_id
    CROSS JOIN params p
    WHERE s.tenant_id = p_tenant_id
      AND s.deleted_at IS NULL
      AND (p_grade IS NULL OR s.grade = p_grade)
      AND (p_school IS NULL OR s.school = p_school)
      AND (p_commute_method IS NULL OR s.commute_method = p_commute_method)
      AND (p_marketing_source IS NULL OR s.marketing_source = p_marketing_source)
      AND (p_enrollment_date_from IS NULL OR s.enrollment_date >= p_enrollment_date_from)
      AND (p_enrollment_date_to IS NULL OR s.enrollment_date <= p_enrollment_date_to)
      AND (
        p_class_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.class_enrollments ce
          WHERE ce.tenant_id = p_tenant_id
            AND ce.student_id = s.id
            AND ce.class_id::text = p_class_id
            AND ce.status = 'active'
        )
      )
      AND (
        p.query IS NULL
        -- trgm similarity (인덱스 활용 보장) — 긴 검색어 / 오타 / 한글 부분
        OR s.student_code % p.query
        OR s.student_phone % p.query
        OR u.name % p.query
        OR u.phone % p.query
        -- ILIKE fallback (짧은 검색어 / threshold 미달 안전망, trgm GIN 도 활용 가능)
        OR s.student_code ILIKE p.pattern ESCAPE '\'
        OR s.student_phone ILIKE p.pattern ESCAPE '\'
        OR u.name ILIKE p.pattern ESCAPE '\'
        OR u.phone ILIKE p.pattern ESCAPE '\'
      )
    -- ORDER BY: PostgreSQL 은 같은 SELECT 의 expression alias 를 ORDER BY 에서 참조하지
    --   못하는 경우가 있어 expression 을 직접 사용. 검색어 없을 때는 similarity=0 이므로
    --   created_at DESC 가 tie-breaker 로 동작.
    ORDER BY
      GREATEST(
        similarity(coalesce(s.student_code, ''), coalesce(p.query, '')),
        similarity(coalesce(s.student_phone, ''), coalesce(p.query, '')),
        similarity(coalesce(u.name, ''), coalesce(p.query, '')),
        similarity(coalesce(u.phone, ''), coalesce(p.query, ''))
      ) DESC,
      s.created_at DESC
    LIMIT (SELECT page_limit + 1 FROM params)
    OFFSET (SELECT page_offset FROM params)
  )
  SELECT jsonb_build_object(
    'id', b.id,
    'student_code', b.student_code,
    'name', COALESCE(b.user_name, 'Unknown'),
    'email', b.user_email,
    'phone', b.user_phone,
    'grade', b.grade,
    'school', b.school,
    'enrollment_date', b.enrollment_date,
    'birth_date', b.birth_date,
    'student_phone', b.student_phone,
    'profile_image_url', b.profile_image_url,
    'commute_method', b.commute_method,
    'marketing_source', b.marketing_source,
    'classes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('id', c.id, 'name', c.name)
        ORDER BY c.name
      )
      FROM public.class_enrollments ce
      JOIN public.classes c ON c.id = ce.class_id
      WHERE ce.tenant_id = p_tenant_id
        AND ce.student_id = b.id
        AND ce.status = 'active'
        AND c.deleted_at IS NULL
    ), '[]'::jsonb),
    'guardians', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('id', g.id, 'name', gu.name, 'phone', gu.phone)
        ORDER BY gu.name
      )
      FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      LEFT JOIN public.users gu ON gu.id = g.user_id
      WHERE sg.tenant_id = p_tenant_id
        AND sg.student_id = b.id
        AND g.deleted_at IS NULL
    ), '[]'::jsonb),
    'recentAttendance', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('status', a.status)
        ORDER BY a.attendance_date DESC
      )
      FROM public.attendance a
      CROSS JOIN params p
      WHERE a.tenant_id = p_tenant_id
        AND a.student_id = b.id
        AND a.attendance_date >= p.attendance_from
    ), '[]'::jsonb)
  ) AS student
  FROM base b
  ORDER BY b.rel_score DESC NULLS LAST, b.created_at DESC;
$$;


ALTER FUNCTION "public"."search_students_list"("p_tenant_id" "uuid", "p_search" "text", "p_grade" "text", "p_class_id" "text", "p_school" "text", "p_commute_method" "text", "p_marketing_source" "text", "p_enrollment_date_from" "date", "p_enrollment_date_to" "date", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_textbooks_list"("p_tenant_id" "uuid", "p_search" "text" DEFAULT NULL::"text", "p_active_only" boolean DEFAULT false, "p_limit" integer DEFAULT 15, "p_offset" integer DEFAULT 0) RETURNS TABLE("textbook" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  WITH params AS (
    SELECT
      NULLIF(trim(p_search), '') AS query,
      CASE
        WHEN NULLIF(trim(p_search), '') IS NULL THEN NULL
        ELSE '%' || replace(replace(replace(NULLIF(trim(p_search), ''), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      END AS pattern,
      GREATEST(1, LEAST(COALESCE(p_limit, 15), 100)) AS page_limit,
      GREATEST(COALESCE(p_offset, 0), 0) AS page_offset
  ),
  base AS (
    SELECT
      t.id, t.title, t.author, t.publisher, t.isbn, t.barcode, t.management_code,
      t.total_copies, t.price, t.is_active, t.created_at,
      GREATEST(
        similarity(coalesce(t.title, ''), coalesce(p.query, '')),
        similarity(coalesce(t.author, ''), coalesce(p.query, '')),
        similarity(coalesce(t.publisher, ''), coalesce(p.query, '')),
        similarity(coalesce(t.isbn, ''), coalesce(p.query, '')),
        similarity(coalesce(t.barcode, ''), coalesce(p.query, '')),
        similarity(coalesce(t.management_code, ''), coalesce(p.query, ''))
      ) AS rel_score
    FROM public.textbooks t
    CROSS JOIN params p
    WHERE t.tenant_id = p_tenant_id
      AND t.deleted_at IS NULL
      AND (NOT COALESCE(p_active_only, false) OR t.is_active = true)
      AND (
        p.query IS NULL
        OR t.title % p.query
        OR t.author % p.query
        OR t.publisher % p.query
        OR t.isbn % p.query
        OR t.barcode % p.query
        OR t.management_code % p.query
        OR t.title ILIKE p.pattern ESCAPE '\'
        OR t.author ILIKE p.pattern ESCAPE '\'
        OR t.publisher ILIKE p.pattern ESCAPE '\'
        OR t.barcode ILIKE p.pattern ESCAPE '\'
        OR t.isbn ILIKE p.pattern ESCAPE '\'
        OR t.management_code ILIKE p.pattern ESCAPE '\'
      )
    ORDER BY
      GREATEST(
        similarity(coalesce(t.title, ''), coalesce(p.query, '')),
        similarity(coalesce(t.author, ''), coalesce(p.query, '')),
        similarity(coalesce(t.publisher, ''), coalesce(p.query, '')),
        similarity(coalesce(t.isbn, ''), coalesce(p.query, '')),
        similarity(coalesce(t.barcode, ''), coalesce(p.query, '')),
        similarity(coalesce(t.management_code, ''), coalesce(p.query, ''))
      ) DESC,
      t.created_at DESC
    LIMIT (SELECT page_limit + 1 FROM params)
    OFFSET (SELECT page_offset FROM params)
  )
  SELECT jsonb_build_object(
    'id', b.id,
    'title', b.title,
    'author', b.author,
    'publisher', b.publisher,
    'isbn', b.isbn,
    'barcode', b.barcode,
    'management_code', b.management_code,
    'total_copies', b.total_copies,
    'price', b.price,
    'is_active', b.is_active,
    'created_at', b.created_at,
    'lending_count', (
      SELECT COUNT(*)::int
      FROM public.book_lendings bl
      WHERE bl.tenant_id = p_tenant_id
        AND bl.textbook_id = b.id
        AND bl.returned_at IS NULL
    ),
    'unit_count', (
      SELECT COUNT(*)::int
      FROM public.textbook_units tu
      WHERE tu.tenant_id = p_tenant_id
        AND tu.textbook_id = b.id
        AND tu.deleted_at IS NULL
    )
  ) AS textbook
  FROM base b
  ORDER BY b.rel_score DESC, b.created_at DESC;
$$;


ALTER FUNCTION "public"."search_textbooks_list"("p_tenant_id" "uuid", "p_search" "text", "p_active_only" boolean, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_attendance_date"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  -- session_id가 있으면 해당 세션의 날짜를 attendance_date에 설정
  if new.session_id is not null then
    select session_date into new.attendance_date
    from public.attendance_sessions
    where id = new.session_id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_attendance_date"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."show_current_user"() RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select current_user::text;
$$;


ALTER FUNCTION "public"."show_current_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_event_subs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_event_subs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_kakao_templates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_kakao_templates_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_shared_templates_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_shared_templates_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "check_in_at" timestamp with time zone,
    "check_out_at" timestamp with time zone,
    "notes" "text",
    "attendance_date" "date",
    "notification_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reason" "text",
    "is_self_study" boolean DEFAULT false,
    "is_makeup_class" boolean DEFAULT false,
    "late_minutes" integer,
    "early_leave_minutes" integer,
    "source" "text",
    CONSTRAINT "attendance_source_check" CHECK (("source" = ANY (ARRAY['kiosk'::"text", 'manual'::"text"]))),
    CONSTRAINT "attendance_status_check" CHECK (("status" = ANY (ARRAY['present'::"text", 'late'::"text", 'absent'::"text", 'excused'::"text", 'left_early'::"text"])))
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


COMMENT ON COLUMN "public"."attendance"."reason" IS '결석/지각/조퇴 사유';



COMMENT ON COLUMN "public"."attendance"."is_self_study" IS '자습 여부';



COMMENT ON COLUMN "public"."attendance"."is_makeup_class" IS '보강 수업 여부';



COMMENT ON COLUMN "public"."attendance"."late_minutes" IS '지각 시간 (분)';



COMMENT ON COLUMN "public"."attendance"."early_leave_minutes" IS '조퇴 시간 (분)';



COMMENT ON COLUMN "public"."attendance"."source" IS '출석 기록 출처: kiosk(키오스크 자동 등록) | manual(원장/강사 수동 처리)';



CREATE OR REPLACE VIEW "public"."attendance_records" AS
 SELECT "id",
    "tenant_id",
    "session_id",
    "student_id",
    "status",
    "check_in_at",
    "check_out_at",
    "notes",
    "attendance_date",
    "notification_sent_at",
    "created_at",
    "updated_at"
   FROM "public"."attendance";


ALTER VIEW "public"."attendance_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attendance_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "session_date" "date" NOT NULL,
    "scheduled_start_at" timestamp with time zone,
    "scheduled_end_at" timestamp with time zone,
    "actual_start_at" timestamp with time zone,
    "actual_end_at" timestamp with time zone,
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "start_time" time without time zone,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."attendance_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "step" "text" DEFAULT 'targets'::"text" NOT NULL,
    "action_type" "text",
    "target_ids" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "target_snapshot_count" integer DEFAULT 0 NOT NULL,
    "options" "jsonb" DEFAULT '{}'::"jsonb",
    "schedule" "jsonb" DEFAULT '{"mode": "now"}'::"jsonb",
    "validation" "jsonb" DEFAULT '[]'::"jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "batch_drafts_action_type_check" CHECK (("action_type" = ANY (ARRAY['report'::"text", 'comment'::"text", 'send'::"text"]))),
    CONSTRAINT "batch_drafts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'ready'::"text", 'running'::"text", 'archived'::"text"]))),
    CONSTRAINT "batch_drafts_step_check" CHECK (("step" = ANY (ARRAY['targets'::"text", 'action'::"text", 'options'::"text", 'review'::"text", 'run'::"text"])))
);


ALTER TABLE "public"."batch_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_job_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "target_id" "uuid" NOT NULL,
    "target_name" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "result_data" "jsonb",
    "error_message" "text",
    "error_category" "text",
    "retryable" boolean DEFAULT false NOT NULL,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "batch_job_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'failed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."batch_job_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."batch_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "draft_id" "uuid",
    "action_type" "text" NOT NULL,
    "job_name" "text",
    "job_params" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "progress" "jsonb" DEFAULT '{"total": 0, "failed": 0, "success": 0, "processed": 0}'::"jsonb" NOT NULL,
    "idempotency_key" "text",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "batch_jobs_action_type_check" CHECK (("action_type" = ANY (ARRAY['report'::"text", 'comment'::"text", 'send'::"text"]))),
    CONSTRAINT "batch_jobs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'running'::"text", 'partial_failed'::"text", 'succeeded'::"text", 'failed'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."batch_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."book_lendings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "textbook_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "borrowed_at" "date" DEFAULT CURRENT_DATE NOT NULL,
    "due_date" "date" NOT NULL,
    "returned_at" "date",
    "return_condition" "text",
    "reminder_sent_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."book_lendings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "event_type" "text" DEFAULT 'event'::"text" NOT NULL,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "all_day" boolean DEFAULT false NOT NULL,
    "color" "text",
    "class_id" "uuid",
    "student_id" "uuid",
    "guardian_id" "uuid",
    "exam_id" "uuid",
    "consultation_id" "uuid",
    "recurrence_rule" "text",
    "recurrence_exception" "text"[],
    "parent_event_id" "uuid",
    "reminder_minutes" integer,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_calendar_events_end_after_start" CHECK (("end_at" >= "start_at"))
);


ALTER TABLE "public"."calendar_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_enrollments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "enrolled_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "end_date" "date",
    "withdrawal_reason" "text",
    "notes" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."class_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "class_id" "uuid" NOT NULL,
    "session_date" "date" NOT NULL,
    "topic" "text" NOT NULL,
    "content" "text",
    "homework_assigned" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."class_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "instructor_id" "uuid",
    "subject" "text",
    "subject_id" "uuid",
    "grade_level" "text",
    "capacity" integer,
    "schedule" "jsonb",
    "room" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultation_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "consultation_id" "uuid" NOT NULL,
    "note_order" integer DEFAULT 1 NOT NULL,
    "category" "text",
    "content" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."consultation_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."consultation_notes" IS '상담 노트 (상세 기록)';



COMMENT ON COLUMN "public"."consultation_notes"."note_order" IS '노트 순서';



COMMENT ON COLUMN "public"."consultation_notes"."category" IS '카테고리(학습/생활/진로/기타)';



COMMENT ON COLUMN "public"."consultation_notes"."content" IS '노트 내용(마크다운 가능)';



CREATE TABLE IF NOT EXISTS "public"."consultation_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "consultation_id" "uuid" NOT NULL,
    "participant_type" "text" NOT NULL,
    "user_id" "uuid",
    "guardian_id" "uuid",
    "name" "text",
    "role" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_participants_identity" CHECK (((("participant_type" = 'instructor'::"text") AND ("user_id" IS NOT NULL)) OR (("participant_type" = 'guardian'::"text") AND ("guardian_id" IS NOT NULL)) OR ("participant_type" = 'student'::"text") OR (("participant_type" = 'other'::"text") AND ("name" IS NOT NULL)))),
    CONSTRAINT "chk_participants_type" CHECK (("participant_type" = ANY (ARRAY['instructor'::"text", 'guardian'::"text", 'student'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."consultation_participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."consultation_participants" IS '상담 참석자';



COMMENT ON COLUMN "public"."consultation_participants"."participant_type" IS '참석자 유형';



COMMENT ON COLUMN "public"."consultation_participants"."user_id" IS '강사 ID';



COMMENT ON COLUMN "public"."consultation_participants"."guardian_id" IS '학부모 ID';



COMMENT ON COLUMN "public"."consultation_participants"."name" IS '기타 참석자 이름';



COMMENT ON COLUMN "public"."consultation_participants"."role" IS '기타 참석자 역할';



CREATE TABLE IF NOT EXISTS "public"."consultations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid",
    "consultation_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "consultation_type" "text" DEFAULT 'in_person'::"text" NOT NULL,
    "conducted_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "title" "text" NOT NULL,
    "summary" "text",
    "outcome" "text",
    "duration_minutes" integer,
    "follow_up_required" boolean DEFAULT false NOT NULL,
    "next_consultation_date" "date",
    "is_lead" boolean DEFAULT false NOT NULL,
    "lead_name" "text",
    "lead_guardian_name" "text",
    "lead_guardian_phone" "text",
    "converted_to_student_id" "uuid",
    "converted_at" timestamp with time zone,
    "lead_school" "text",
    CONSTRAINT "chk_consultations_duration" CHECK ((("duration_minutes" IS NULL) OR ("duration_minutes" > 0))),
    CONSTRAINT "chk_consultations_duration_positive" CHECK ((("duration_minutes" IS NULL) OR ("duration_minutes" > 0))),
    CONSTRAINT "chk_consultations_student_or_lead" CHECK (((("student_id" IS NOT NULL) AND ("is_lead" = false)) OR (("student_id" IS NULL) AND ("is_lead" = true) AND ("lead_name" IS NOT NULL)))),
    CONSTRAINT "chk_consultations_type" CHECK (("consultation_type" = ANY (ARRAY['parent_meeting'::"text", 'phone_call'::"text", 'video_call'::"text", 'in_person'::"text"]))),
    CONSTRAINT "chk_consultations_type_allowed" CHECK ((("consultation_type" IS NULL) OR ("consultation_type" = ANY (ARRAY['parent_meeting'::"text", 'phone_call'::"text", 'video_call'::"text", 'in_person'::"text"]))))
);


ALTER TABLE "public"."consultations" OWNER TO "postgres";


COMMENT ON TABLE "public"."consultations" IS '상담 기록';



COMMENT ON COLUMN "public"."consultations"."consultation_type" IS '상담 유형 (parent_meeting | phone_call | video_call | in_person)';



COMMENT ON COLUMN "public"."consultations"."conducted_by" IS '상담 진행 강사(users.id)';



COMMENT ON COLUMN "public"."consultations"."title" IS '상담 제목';



COMMENT ON COLUMN "public"."consultations"."summary" IS '상담 요약';



COMMENT ON COLUMN "public"."consultations"."outcome" IS '상담 결과/조치사항';



COMMENT ON COLUMN "public"."consultations"."duration_minutes" IS '상담 소요 시간(분)';



COMMENT ON COLUMN "public"."consultations"."follow_up_required" IS '후속 상담 필요 여부';



COMMENT ON COLUMN "public"."consultations"."next_consultation_date" IS '다음 상담 예정일';



COMMENT ON COLUMN "public"."consultations"."is_lead" IS '신규 입회 상담 여부 (잠재 고객)';



COMMENT ON COLUMN "public"."consultations"."lead_name" IS '잠재 고객 이름 (신규 상담 시)';



COMMENT ON COLUMN "public"."consultations"."lead_guardian_name" IS '학부모명 (신규 상담 시)';



COMMENT ON COLUMN "public"."consultations"."lead_guardian_phone" IS '학부모 연락처 (신규 상담 시)';



COMMENT ON COLUMN "public"."consultations"."converted_to_student_id" IS '입회 처리 후 생성된 학생 ID';



COMMENT ON COLUMN "public"."consultations"."converted_at" IS '입회 처리 완료 시각';



COMMENT ON COLUMN "public"."consultations"."lead_school" IS 'School name for lead consultations (optional)';



CREATE TABLE IF NOT EXISTS "public"."exam_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "exam_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "score" integer,
    "total_points" integer,
    "percentage" numeric(5,2),
    "feedback" "text",
    "is_retest" boolean DEFAULT false NOT NULL,
    "retest_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "status" "text" DEFAULT 'submitted'::"text",
    CONSTRAINT "exam_scores_status_check" CHECK (("status" = ANY (ARRAY['absent'::"text", 'pending'::"text", 'submitted'::"text", 'retest_required'::"text", 'retest_waived'::"text"])))
);


ALTER TABLE "public"."exam_scores" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exam_scores"."retest_count" IS '재시험 횟수';



COMMENT ON COLUMN "public"."exam_scores"."status" IS '성적 상태: absent(미응시), pending(대기-연기), submitted(제출), retest_required(재시험필요), retest_waived(재시험면제)';



CREATE TABLE IF NOT EXISTS "public"."exams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "class_id" "uuid",
    "name" "text" NOT NULL,
    "category_code" "text",
    "exam_type" "text",
    "exam_date" timestamp with time zone,
    "total_questions" integer,
    "is_recurring" boolean DEFAULT false NOT NULL,
    "recurring_schedule" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "passing_score" numeric(5,2),
    "subject_id" "uuid",
    "status" "text" DEFAULT 'scheduled'::"text",
    "is_template_active" boolean DEFAULT true NOT NULL,
    "archived_at" timestamp with time zone,
    CONSTRAINT "exams_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."exams" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exams"."passing_score" IS '합격 점수 (%). 이 점수 미달 시 자동으로 재시험 대상이 됨';



COMMENT ON COLUMN "public"."exams"."subject_id" IS '과목 ID (Voca, Reading, Speaking 등)';



COMMENT ON COLUMN "public"."exams"."status" IS '시험 상태: scheduled(예정), in_progress(진행중), completed(완료), cancelled(취소)';



COMMENT ON COLUMN "public"."exams"."is_template_active" IS '반복 시험 템플릿 활성 상태. false면 자동 생성 대상에서 제외(수동 생성은 가능)';



COMMENT ON COLUMN "public"."exams"."archived_at" IS '시험 아카이브 시각. 값이 있으면 기본 목록/성적입력에서 숨김 처리';



CREATE TABLE IF NOT EXISTS "public"."guardians" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "name" "text" NOT NULL,
    "phone" "text",
    "email" "public"."citext",
    "relationship" "text",
    "occupation" "text",
    "address" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "normalized_phone" "text" GENERATED ALWAYS AS ("public"."normalize_phone"("phone")) STORED
);


ALTER TABLE "public"."guardians" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."homework_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "task_id" "uuid" NOT NULL,
    "submitted_at" timestamp with time zone,
    "submitted_by" "uuid",
    "text_answer" "text",
    "attachment_urls" "text"[],
    "graded_by" "uuid",
    "graded_at" timestamp with time zone,
    "score" numeric(5,2),
    "feedback" "text",
    "is_late" boolean DEFAULT false,
    "resubmission_allowed" boolean DEFAULT false,
    "resubmission_deadline" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_homework_submissions_score" CHECK ((("score" IS NULL) OR (("score" >= (0)::numeric) AND ("score" <= (100)::numeric))))
);


ALTER TABLE "public"."homework_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "assigned_by" "uuid",
    "kind" "public"."task_kind" DEFAULT 'in_class'::"public"."task_kind" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "subject" "text",
    "priority" "text" DEFAULT 'normal'::"text",
    "due_date" "date" NOT NULL,
    "due_day_of_week" integer,
    "completed_at" timestamp with time zone,
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_student_tasks_due_day_of_week" CHECK ((("due_day_of_week" IS NULL) OR (("due_day_of_week" >= 1) AND ("due_day_of_week" <= 7)))),
    CONSTRAINT "chk_student_tasks_priority" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."student_tasks" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."homeworks" AS
 SELECT "t"."id",
    "t"."tenant_id",
    "t"."student_id",
    "t"."assigned_by",
    "t"."title",
    "t"."description",
    "t"."subject",
    "t"."priority",
    "t"."due_date",
    "t"."due_day_of_week",
    "t"."completed_at",
    "t"."verified_at",
    "t"."verified_by",
    "t"."created_at",
    "t"."updated_at",
    "hs"."id" AS "submission_id",
    "hs"."submitted_at",
    "hs"."submitted_by",
    "hs"."text_answer",
    "hs"."attachment_urls",
    "hs"."graded_by",
    "hs"."graded_at",
    "hs"."score",
    "hs"."feedback",
    "hs"."is_late",
    "hs"."resubmission_allowed",
    "hs"."resubmission_deadline"
   FROM ("public"."student_tasks" "t"
     LEFT JOIN "public"."homework_submissions" "hs" ON (("hs"."task_id" = "t"."id")))
  WHERE (("t"."kind" = 'homework'::"public"."task_kind") AND ("t"."deleted_at" IS NULL));


ALTER VIEW "public"."homeworks" OWNER TO "postgres";


COMMENT ON VIEW "public"."homeworks" IS '숙제(task) + 제출/채점 상세 뷰';



CREATE TABLE IF NOT EXISTS "public"."in_app_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text",
    "message" "text",
    "reference_type" "text",
    "reference_id" "uuid",
    "action_url" "text",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "read_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."in_app_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kakao_alimtalk_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "solapi_template_id" "text" NOT NULL,
    "kakao_template_code" "text",
    "channel_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category_code" "text" NOT NULL,
    "message_type" "text" DEFAULT 'BA'::"text" NOT NULL,
    "emphasize_type" "text" DEFAULT 'NONE'::"text" NOT NULL,
    "emphasize_title" "text",
    "emphasize_subtitle" "text",
    "buttons" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "quick_replies" "jsonb" DEFAULT '[]'::"jsonb",
    "extra_content" "text",
    "ad_content" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "rejection_reason" "text",
    "security_flag" boolean DEFAULT false NOT NULL,
    "inspected_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "shared_template_id" "uuid",
    "shared_template_version" integer,
    CONSTRAINT "kakao_alimtalk_templates_emphasize_type_check" CHECK (("emphasize_type" = ANY (ARRAY['NONE'::"text", 'TEXT'::"text", 'IMAGE'::"text", 'ITEM_LIST'::"text"]))),
    CONSTRAINT "kakao_alimtalk_templates_message_type_check" CHECK (("message_type" = ANY (ARRAY['BA'::"text", 'EX'::"text", 'AD'::"text", 'MI'::"text"]))),
    CONSTRAINT "kakao_alimtalk_templates_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'inspecting'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."kakao_alimtalk_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."kakao_alimtalk_templates" IS '카카오 알림톡 템플릿 (솔라피 연동)';



COMMENT ON COLUMN "public"."kakao_alimtalk_templates"."solapi_template_id" IS '솔라피 템플릿 ID';



COMMENT ON COLUMN "public"."kakao_alimtalk_templates"."kakao_template_code" IS '카카오 승인 템플릿 코드';



COMMENT ON COLUMN "public"."kakao_alimtalk_templates"."channel_id" IS '연결된 카카오 채널 ID (pfId)';



COMMENT ON COLUMN "public"."kakao_alimtalk_templates"."message_type" IS '메시지 유형: BA(기본형), EX(부가정보형), AD(광고추가형), MI(복합형)';



COMMENT ON COLUMN "public"."kakao_alimtalk_templates"."emphasize_type" IS '강조 유형: NONE, TEXT, IMAGE, ITEM_LIST';



COMMENT ON COLUMN "public"."kakao_alimtalk_templates"."status" IS '템플릿 상태: pending(대기), inspecting(검수중), approved(승인), rejected(반려), suspended(중지)';



COMMENT ON COLUMN "public"."kakao_alimtalk_templates"."security_flag" IS '보안 템플릿 여부 (개인정보 포함)';



COMMENT ON COLUMN "public"."kakao_alimtalk_templates"."shared_template_id" IS '연결된 공용 템플릿 ID (자동 프로비저닝된 경우)';



COMMENT ON COLUMN "public"."kakao_alimtalk_templates"."shared_template_version" IS '프로비저닝 시점의 공용 템플릿 버전';



CREATE TABLE IF NOT EXISTS "public"."message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "content" "text" NOT NULL,
    "type" "public"."message_channel",
    "category" "public"."message_category",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."message_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_templates" IS '메시지 템플릿 관리';



COMMENT ON COLUMN "public"."message_templates"."type" IS '전송 채널: sms / email';



COMMENT ON COLUMN "public"."message_templates"."category" IS '카테고리: general, report, todo, attendance, event';



CREATE TABLE IF NOT EXISTS "public"."notification_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "student_id" "uuid",
    "session_id" "uuid",
    "message" "text" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notification_type" "public"."message_channel",
    "status" "public"."notification_status",
    "kakao_template_id" "uuid",
    "fallback_type" "text",
    "original_channel" "text",
    "event_type" "text",
    "is_test" boolean DEFAULT false NOT NULL,
    "recipient_name" "text",
    "recipient_phone" "text",
    CONSTRAINT "notification_logs_fallback_type_check" CHECK ((("fallback_type" IS NULL) OR ("fallback_type" = ANY (ARRAY['none'::"text", 'auto_sms'::"text", 'manual_sms'::"text"])))),
    CONSTRAINT "notification_logs_notification_type_check" CHECK ((("notification_type")::"text" = ANY (ARRAY['sms'::"text", 'lms'::"text", 'mms'::"text", 'kakao'::"text", 'email'::"text"])))
);


ALTER TABLE "public"."notification_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_logs" IS '알림 전송 로그';



COMMENT ON COLUMN "public"."notification_logs"."notification_type" IS 'sms: 단문 문자, lms: 장문 문자, mms: 멀티미디어 문자, kakao: 카카오 알림톡, email: 이메일';



COMMENT ON COLUMN "public"."notification_logs"."status" IS '전송 상태: pending / sent / failed';



COMMENT ON COLUMN "public"."notification_logs"."kakao_template_id" IS '사용된 알림톡 템플릿 ID';



COMMENT ON COLUMN "public"."notification_logs"."fallback_type" IS 'SMS 대체 발송 유형: none, auto_sms, manual_sms';



COMMENT ON COLUMN "public"."notification_logs"."original_channel" IS '원래 발송 채널 (fallback 발생 시)';



COMMENT ON COLUMN "public"."notification_logs"."event_type" IS '이벤트 알림톡 발송 시 이벤트 유형';



COMMENT ON COLUMN "public"."notification_logs"."is_test" IS '테스트 발송 여부 (설정 페이지의 테스트 발송 등)';



COMMENT ON COLUMN "public"."notification_logs"."recipient_name" IS '수신자 이름 (학생/보호자 연결 없이 발송된 경우 추적용)';



COMMENT ON COLUMN "public"."notification_logs"."recipient_phone" IS '수신자 전화번호 (학생/보호자 연결 없이 발송된 경우 추적용)';



CREATE TABLE IF NOT EXISTS "public"."ref_activity_types" (
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "color" "text",
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ref_activity_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."ref_activity_types" IS 'Reference table for student activity type definitions';



CREATE TABLE IF NOT EXISTS "public"."ref_exam_categories" (
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ref_exam_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ref_roles" (
    "code" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ref_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "report_id" "uuid" NOT NULL,
    "report_send_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "user_type" "text",
    "read_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "referrer" "text",
    "pdf_downloaded" boolean DEFAULT false NOT NULL,
    "pdf_downloaded_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "report_reads_user_type_check" CHECK (("user_type" = ANY (ARRAY['guardian'::"text", 'student'::"text"])))
);


ALTER TABLE "public"."report_reads" OWNER TO "postgres";


COMMENT ON TABLE "public"."report_reads" IS '리포트 열람 로그 (클릭 추적)';



COMMENT ON COLUMN "public"."report_reads"."ip_address" IS '열람자 IP 주소';



CREATE TABLE IF NOT EXISTS "public"."report_sends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "report_id" "uuid" NOT NULL,
    "recipient_type" "text" NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "recipient_phone" "text" NOT NULL,
    "recipient_name" "text" NOT NULL,
    "share_link_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "link_expires_at" timestamp with time zone,
    "short_url_id" "uuid",
    "message_body" "text" NOT NULL,
    "message_type" "text" DEFAULT 'SMS'::"text" NOT NULL,
    "aligo_msgid" "text",
    "send_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "retry_count" integer DEFAULT 0 NOT NULL,
    "last_retry_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "send_error" "text",
    "kakao_template_id" "uuid",
    "message_variables" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "report_sends_message_type_check" CHECK (("message_type" = ANY (ARRAY['SMS'::"text", 'LMS'::"text", 'KAKAO'::"text"]))),
    CONSTRAINT "report_sends_recipient_type_check" CHECK (("recipient_type" = ANY (ARRAY['guardian'::"text", 'student'::"text"]))),
    CONSTRAINT "report_sends_send_status_check" CHECK (("send_status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'delivered'::"text"])))
);


ALTER TABLE "public"."report_sends" OWNER TO "postgres";


COMMENT ON TABLE "public"."report_sends" IS '리포트 문자 발송 이력 및 공유 링크 관리';



COMMENT ON COLUMN "public"."report_sends"."share_link_id" IS '공유 링크 고유 ID (UUID 기반)';



COMMENT ON COLUMN "public"."report_sends"."link_expires_at" IS '링크 만료일 (null이면 무제한)';



COMMENT ON COLUMN "public"."report_sends"."message_type" IS 'SMS: 단문 문자, LMS: 장문 문자, KAKAO: 카카오 알림톡';



COMMENT ON COLUMN "public"."report_sends"."aligo_msgid" IS '알리고 API 응답 msgid (발송 추적용)';



COMMENT ON COLUMN "public"."report_sends"."kakao_template_id" IS '리포트 알림톡 발송에 사용한 템플릿 ID';



COMMENT ON COLUMN "public"."report_sends"."message_variables" IS '알림톡 발송 시 사용한 변수 스냅샷';



CREATE TABLE IF NOT EXISTS "public"."report_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "conditions" "jsonb",
    "is_system" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "report_templates_category_check" CHECK (("category" = ANY (ARRAY['summary'::"text", 'strengths'::"text", 'improvements'::"text", 'nextGoals'::"text"])))
);


ALTER TABLE "public"."report_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."report_templates" IS '리포트 코멘트 템플릿';



COMMENT ON COLUMN "public"."report_templates"."category" IS '템플릿 카테고리: summary(총평), strengths(강점), improvements(개선점), nextGoals(목표)';



COMMENT ON COLUMN "public"."report_templates"."title" IS '칩 UI에 표시될 짧은 제목';



COMMENT ON COLUMN "public"."report_templates"."content" IS '템플릿 본문. 변수 사용 가능: {studentName}, {attendanceRate}, {homeworkRate}, {averageScore}, {scoreChange}';



COMMENT ON COLUMN "public"."report_templates"."conditions" IS '조건 기반 추천을 위한 JSONB. 예: {"attendanceRate": {"min": 95}}';



COMMENT ON COLUMN "public"."report_templates"."is_system" IS 'true이면 시스템 기본 템플릿 (모든 테넌트에서 사용 가능, 수정 불가)';



CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "report_type" "text" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "content" "jsonb" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "reports_report_type_check" CHECK (("report_type" = ANY (ARRAY['weekly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shared_alimtalk_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "content" "text" NOT NULL,
    "category_code" "text" NOT NULL,
    "message_type" "text" DEFAULT 'BA'::"text" NOT NULL,
    "emphasize_type" "text" DEFAULT 'NONE'::"text" NOT NULL,
    "emphasize_title" "text",
    "emphasize_subtitle" "text",
    "buttons" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "quick_replies" "jsonb" DEFAULT '[]'::"jsonb",
    "variables" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "security_flag" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recipients" "jsonb" DEFAULT '["보호자"]'::"jsonb" NOT NULL,
    CONSTRAINT "shared_alimtalk_templates_emphasize_type_check" CHECK (("emphasize_type" = ANY (ARRAY['NONE'::"text", 'TEXT'::"text", 'IMAGE'::"text", 'ITEM_LIST'::"text"]))),
    CONSTRAINT "shared_alimtalk_templates_message_type_check" CHECK (("message_type" = ANY (ARRAY['BA'::"text", 'EX'::"text", 'AD'::"text", 'MI'::"text"])))
);


ALTER TABLE "public"."shared_alimtalk_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."shared_alimtalk_templates" IS '아카데스크 공용 알림톡 템플릿 (플랫폼 관리)';



COMMENT ON COLUMN "public"."shared_alimtalk_templates"."event_type" IS '이벤트 식별자 (check_in, absence_detected 등)';



COMMENT ON COLUMN "public"."shared_alimtalk_templates"."content" IS '템플릿 본문 (#{변수명} 포맷)';



COMMENT ON COLUMN "public"."shared_alimtalk_templates"."variables" IS '템플릿에서 사용하는 변수 이름 목록 (JSON 배열)';



COMMENT ON COLUMN "public"."shared_alimtalk_templates"."is_active" IS '활성 여부 (false면 학원에 노출되지 않음)';



COMMENT ON COLUMN "public"."shared_alimtalk_templates"."version" IS '템플릿 버전 (내용 변경 시 증가)';



COMMENT ON COLUMN "public"."shared_alimtalk_templates"."recipients" IS '이벤트 알림 UI에서 표시할 수신 대상 라벨 배열 (학생/보호자/직원/전체 등). 실제 발송 경로 제어용 아님.';



CREATE TABLE IF NOT EXISTS "public"."short_urls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "short_code" "text" NOT NULL,
    "target_url" "text" NOT NULL,
    "report_send_id" "uuid",
    "click_count" integer DEFAULT 0 NOT NULL,
    "first_clicked_at" timestamp with time zone,
    "last_clicked_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."short_urls" OWNER TO "postgres";


COMMENT ON TABLE "public"."short_urls" IS '단축 URL 매핑 테이블';



COMMENT ON COLUMN "public"."short_urls"."short_code" IS '단축 코드 (예: abc123)';



COMMENT ON COLUMN "public"."short_urls"."click_count" IS '클릭 수 (통계용)';



CREATE TABLE IF NOT EXISTS "public"."staff_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "email" "public"."citext" NOT NULL,
    "role_code" "text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_invites_role_code_check" CHECK (("role_code" = ANY (ARRAY['instructor'::"text", 'assistant'::"text"]))),
    CONSTRAINT "staff_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'cancelled'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."staff_invites" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."staff_invitations" AS
 SELECT "id",
    "tenant_id",
    "created_by" AS "invited_by",
    "email",
    "role_code",
    "token",
    "status",
    "expires_at",
    "accepted_at",
    "created_at"
   FROM "public"."staff_invites";


ALTER VIEW "public"."staff_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "activity_type" "text" NOT NULL,
    "activity_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."student_activity_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."student_activity_logs" IS 'Timeline of all student activities (attendance, grades, homework, etc.)';



CREATE TABLE IF NOT EXISTS "public"."student_change_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "change_type" "text" NOT NULL,
    "field_name" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "batch_id" "uuid",
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student_change_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_guardians" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "guardian_id" "uuid" NOT NULL,
    "relation" "text",
    "is_primary" boolean DEFAULT false NOT NULL,
    "can_view_reports" boolean DEFAULT true NOT NULL,
    "receives_notifications" boolean DEFAULT true NOT NULL,
    "receives_billing" boolean DEFAULT false NOT NULL,
    "can_pickup" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_primary_contact" boolean DEFAULT true
);


ALTER TABLE "public"."student_guardians" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "day_of_week" integer NOT NULL,
    "scheduled_arrival_time" time without time zone NOT NULL,
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "student_schedules_day_of_week_check" CHECK ((("day_of_week" >= 0) AND ("day_of_week" <= 6)))
);


ALTER TABLE "public"."student_schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_textbooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "textbook_id" "uuid" NOT NULL,
    "issue_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "paid" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'in_use'::"text" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_student_textbooks_status" CHECK (("status" = ANY (ARRAY['in_use'::"text", 'completed'::"text", 'returned'::"text"])))
);


ALTER TABLE "public"."student_textbooks" OWNER TO "postgres";


COMMENT ON TABLE "public"."student_textbooks" IS '학생별 교재 배부/결제';



COMMENT ON COLUMN "public"."student_textbooks"."status" IS 'in_use | completed | returned';



CREATE OR REPLACE VIEW "public"."student_todos" AS
 SELECT "id",
    "tenant_id",
    "student_id",
    "title",
    "description",
    "subject",
    "priority",
    ("due_date")::"text" AS "due_date",
    "due_day_of_week",
    "completed_at",
    "verified_at",
    "verified_by",
    "created_at",
    "updated_at"
   FROM "public"."student_tasks"
  WHERE (("kind" = 'in_class'::"public"."task_kind") AND ("deleted_at" IS NULL));


ALTER VIEW "public"."student_todos" OWNER TO "postgres";


COMMENT ON VIEW "public"."student_todos" IS '하위호환: 학원 내 TODO(in_class) 전용 뷰';



CREATE TABLE IF NOT EXISTS "public"."student_todos_legacy" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "subject" "text",
    "due_date" "date" NOT NULL,
    "due_day_of_week" integer DEFAULT 0 NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "estimated_duration_minutes" integer,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "completed_at" timestamp with time zone,
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "reminder_sent_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "student_todos_due_day_of_week_check" CHECK ((("due_day_of_week" >= 0) AND ("due_day_of_week" <= 6))),
    CONSTRAINT "student_todos_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "student_todos_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'completed'::"text", 'verified'::"text"])))
);


ALTER TABLE "public"."student_todos_legacy" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "student_code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "birth_date" "date",
    "gender" "text",
    "student_phone" "text",
    "profile_image_url" "text",
    "grade" "text",
    "school" "text",
    "enrollment_date" "date" DEFAULT CURRENT_DATE,
    "withdrawal_date" "date",
    "notes" "text",
    "commute_method" "text",
    "marketing_source" "text",
    "kiosk_pin" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "emergency_contact" "text",
    CONSTRAINT "students_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "tenant_id" "uuid",
    "email" "public"."citext",
    "name" "text" NOT NULL,
    "phone" "text",
    "role_code" "text",
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    "onboarding_completed_at" timestamp with time zone,
    "approval_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "approval_reason" "text",
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "users_approval_status_check" CHECK (("approval_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."students_requiring_retest" AS
 SELECT "es"."id" AS "exam_score_id",
    "es"."exam_id",
    "es"."student_id",
    "e"."name" AS "exam_name",
    "e"."exam_date",
    "e"."passing_score",
    "es"."percentage" AS "student_score",
    "es"."status",
    COALESCE("es"."retest_count", 0) AS "retest_count",
    "s"."student_code",
    "u"."name" AS "student_name",
    "s"."grade",
    "c"."name" AS "class_name",
    "e"."tenant_id"
   FROM (((("public"."exam_scores" "es"
     JOIN "public"."exams" "e" ON (("e"."id" = "es"."exam_id")))
     JOIN "public"."students" "s" ON (("s"."id" = "es"."student_id")))
     JOIN "public"."users" "u" ON (("u"."id" = "s"."user_id")))
     LEFT JOIN "public"."classes" "c" ON (("c"."id" = "e"."class_id")))
  WHERE (("es"."status" = 'retest_required'::"text") AND ("es"."deleted_at" IS NULL) AND ("e"."deleted_at" IS NULL) AND ("s"."deleted_at" IS NULL))
  ORDER BY "e"."exam_date" DESC, "u"."name";


ALTER VIEW "public"."students_requiring_retest" OWNER TO "postgres";


COMMENT ON VIEW "public"."students_requiring_retest" IS '재시험 대상 학생 목록 뷰 - 합격 점수 미달로 재시험이 필요한 
  학생들의 정보';



CREATE TABLE IF NOT EXISTS "public"."subjects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "color" "text" DEFAULT '#3b82f6'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "description" "text"
);


ALTER TABLE "public"."subjects" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."subject_statistics" AS
 SELECT "s"."id",
    "s"."tenant_id",
    "s"."name",
    "s"."description",
    "s"."code",
    "s"."color",
    "s"."sort_order",
    "s"."active",
    "s"."created_at",
    "s"."updated_at",
    "s"."deleted_at",
    "count"(DISTINCT "c"."id") AS "class_count"
   FROM ("public"."subjects" "s"
     LEFT JOIN "public"."classes" "c" ON ((("s"."id" = "c"."subject_id") AND ("c"."deleted_at" IS NULL))))
  WHERE ("s"."deleted_at" IS NULL)
  GROUP BY "s"."id", "s"."tenant_id", "s"."name", "s"."description", "s"."code", "s"."color", "s"."sort_order", "s"."active", "s"."created_at", "s"."updated_at", "s"."deleted_at";


ALTER VIEW "public"."subject_statistics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "ticket_type" "text" NOT NULL,
    "category" "text",
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "severity" "text",
    "page" "text",
    "steps_to_reproduce" "text",
    "browser" "text",
    "response" "text",
    "responded_at" timestamp with time zone,
    "responded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "support_tickets_severity_check" CHECK (("severity" = ANY (ARRAY['critical'::"text", 'high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "support_tickets_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"]))),
    CONSTRAINT "support_tickets_ticket_type_check" CHECK (("ticket_type" = ANY (ARRAY['inquiry'::"text", 'bug_report'::"text", 'feedback'::"text"])))
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'notice'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "published_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "system_announcements_type_check" CHECK (("type" = ANY (ARRAY['update'::"text", 'notice'::"text", 'maintenance'::"text"])))
);


ALTER TABLE "public"."system_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teaching_resources" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "subject" "text",
    "grade_level" "text",
    "file_url" "text",
    "file_name" "text",
    "file_size" integer,
    "file_type" "text",
    "external_url" "text",
    "is_public" boolean DEFAULT false NOT NULL,
    "shared_with" "uuid"[],
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_resources_category" CHECK (("category" = ANY (ARRAY['teaching_material'::"text", 'worksheet'::"text", 'exam'::"text", 'reference'::"text", 'other'::"text"]))),
    CONSTRAINT "chk_resources_url" CHECK ((("file_url" IS NOT NULL) OR ("external_url" IS NOT NULL)))
);


ALTER TABLE "public"."teaching_resources" OWNER TO "postgres";


COMMENT ON TABLE "public"."teaching_resources" IS '강사 공유 자료';



COMMENT ON COLUMN "public"."teaching_resources"."category" IS '자료 유형';



COMMENT ON COLUMN "public"."teaching_resources"."subject" IS '과목';



COMMENT ON COLUMN "public"."teaching_resources"."grade_level" IS '학년';



COMMENT ON COLUMN "public"."teaching_resources"."file_url" IS 'Supabase Storage 파일 URL';



COMMENT ON COLUMN "public"."teaching_resources"."external_url" IS '외부 링크';



COMMENT ON COLUMN "public"."teaching_resources"."is_public" IS '전체 강사 공유 여부';



COMMENT ON COLUMN "public"."teaching_resources"."shared_with" IS '특정 강사 공유(user_id 배열)';



CREATE TABLE IF NOT EXISTS "public"."tenant_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "code_type" "text" NOT NULL,
    "code" "text" NOT NULL,
    "label" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_event_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "shared_template_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "is_enabled" boolean DEFAULT false NOT NULL,
    "provisioning_status" "text" DEFAULT 'not_started'::"text" NOT NULL,
    "kakao_template_id" "uuid",
    "rejection_reason" "text",
    "last_provisioned_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tenant_event_subscriptions_provisioning_status_check" CHECK (("provisioning_status" = ANY (ARRAY['not_started'::"text", 'provisioning'::"text", 'inspecting'::"text", 'approved'::"text", 'rejected'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."tenant_event_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_event_subscriptions" IS '학원별 이벤트 알림톡 구독 설정';



COMMENT ON COLUMN "public"."tenant_event_subscriptions"."provisioning_status" IS '솔라피 템플릿 등록 + 카카오 검수 상태';



COMMENT ON COLUMN "public"."tenant_event_subscriptions"."kakao_template_id" IS '프로비저닝된 학원별 kakao_alimtalk_templates ID';



CREATE TABLE IF NOT EXISTS "public"."tenant_messaging_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "provider" "public"."messaging_provider" DEFAULT 'aligo'::"public"."messaging_provider" NOT NULL,
    "aligo_user_id" "text",
    "aligo_api_key" "text",
    "aligo_sender_phone" "text",
    "solapi_api_key" "text",
    "solapi_api_secret" "text",
    "solapi_sender_phone" "text",
    "nhncloud_app_key" "text",
    "nhncloud_secret_key" "text",
    "nhncloud_sender_phone" "text",
    "is_active" boolean DEFAULT false NOT NULL,
    "is_verified" boolean DEFAULT false NOT NULL,
    "last_test_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "kakao_channel_id" "text",
    "kakao_channel_search_id" "text",
    "kakao_channel_name" "text",
    "kakao_channel_status" "text",
    "kakao_sms_fallback_enabled" boolean DEFAULT true NOT NULL,
    "kakao_manual_fallback_enabled" boolean DEFAULT false NOT NULL,
    "kakao_channel_verified_at" timestamp with time zone,
    CONSTRAINT "tenant_messaging_config_kakao_channel_status_check" CHECK ((("kakao_channel_status" IS NULL) OR ("kakao_channel_status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'suspended'::"text"]))))
);


ALTER TABLE "public"."tenant_messaging_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_messaging_config" IS 'Tenant-specific messaging service API credentials';



COMMENT ON COLUMN "public"."tenant_messaging_config"."provider" IS 'SMS/알림톡 서비스 제공사';



COMMENT ON COLUMN "public"."tenant_messaging_config"."aligo_sender_phone" IS '알리고에 등록된 발신번호';



COMMENT ON COLUMN "public"."tenant_messaging_config"."is_active" IS '서비스 활성화 여부';



COMMENT ON COLUMN "public"."tenant_messaging_config"."is_verified" IS '테스트 발송으로 인증 완료 여부';



COMMENT ON COLUMN "public"."tenant_messaging_config"."kakao_channel_id" IS '솔라피에 등록된 카카오 채널 ID (pfId)';



COMMENT ON COLUMN "public"."tenant_messaging_config"."kakao_channel_search_id" IS '카카오톡 채널 검색 ID (@으로 시작)';



COMMENT ON COLUMN "public"."tenant_messaging_config"."kakao_channel_name" IS '카카오 비즈니스 채널 이름';



COMMENT ON COLUMN "public"."tenant_messaging_config"."kakao_channel_status" IS '채널 상태: pending(대기), active(활성), suspended(중지)';



COMMENT ON COLUMN "public"."tenant_messaging_config"."kakao_sms_fallback_enabled" IS '알림톡 실패 시 자동 SMS 전환 여부';



COMMENT ON COLUMN "public"."tenant_messaging_config"."kakao_manual_fallback_enabled" IS '수동 SMS 대체 발송 옵션 활성화';



COMMENT ON COLUMN "public"."tenant_messaging_config"."kakao_channel_verified_at" IS '채널 인증 완료 시간';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "public"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "timezone" "text" DEFAULT 'Asia/Seoul'::"text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."textbook_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "textbook_id" "uuid" NOT NULL,
    "unit_id" "uuid",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "pages_done" integer,
    "percent_done" numeric(5,2),
    "memo" "text",
    "recorded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_textbook_progress_pages" CHECK ((("pages_done" IS NULL) OR ("pages_done" >= 0))),
    CONSTRAINT "chk_textbook_progress_percent" CHECK ((("percent_done" IS NULL) OR (("percent_done" >= (0)::numeric) AND ("percent_done" <= (100)::numeric))))
);


ALTER TABLE "public"."textbook_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."textbook_progress" IS '교재 진도 기록';



COMMENT ON COLUMN "public"."textbook_progress"."recorded_by" IS '기록자(강사)';



CREATE TABLE IF NOT EXISTS "public"."textbook_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "textbook_id" "uuid" NOT NULL,
    "unit_order" integer NOT NULL,
    "unit_code" "text",
    "unit_title" "text" NOT NULL,
    "total_pages" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."textbook_units" OWNER TO "postgres";


COMMENT ON TABLE "public"."textbook_units" IS '교재 단원(챕터/유닛)';



COMMENT ON COLUMN "public"."textbook_units"."unit_order" IS '단원 순서';



CREATE TABLE IF NOT EXISTS "public"."textbooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "publisher" "text",
    "isbn" "text",
    "price" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "author" "text",
    "barcode" "text",
    "total_copies" integer DEFAULT 1 NOT NULL,
    "management_code" "text",
    CONSTRAINT "chk_textbooks_price_nonneg" CHECK ((("price" IS NULL) OR ("price" >= 0))),
    CONSTRAINT "textbooks_total_copies_check" CHECK (("total_copies" >= 1))
);


ALTER TABLE "public"."textbooks" OWNER TO "postgres";


COMMENT ON TABLE "public"."textbooks" IS '교재 마스터';



COMMENT ON COLUMN "public"."textbooks"."title" IS '교재명';



COMMENT ON COLUMN "public"."textbooks"."is_active" IS '활성 여부';



CREATE TABLE IF NOT EXISTS "public"."todo_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "subject" "text",
    "estimated_duration_minutes" integer,
    "priority" "text" DEFAULT 'normal'::"text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "todo_templates_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"])))
);


ALTER TABLE "public"."todo_templates" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."todos" AS
 SELECT "id",
    "tenant_id",
    "student_id",
    "title",
    "description",
    "subject",
    "due_date",
    "due_day_of_week",
    "priority",
    "estimated_duration_minutes",
    "status",
    "completed_at",
    "verified_at",
    "verified_by",
    "reminder_sent_at",
    "notes",
    "created_at",
    "updated_at",
    "deleted_at"
   FROM "public"."student_todos_legacy";


ALTER VIEW "public"."todos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_student_siblings" AS
 SELECT "sg1"."student_id" AS "id",
    "sg1"."student_id",
    "sg2"."student_id" AS "sibling_id",
    "s2"."student_code" AS "sibling_code",
    "s2"."name" AS "sibling_name",
    "s2"."grade" AS "sibling_grade",
    "s2"."birth_date" AS "sibling_birth_date"
   FROM (("public"."student_guardians" "sg1"
     JOIN "public"."student_guardians" "sg2" ON ((("sg1"."guardian_id" = "sg2"."guardian_id") AND ("sg1"."student_id" <> "sg2"."student_id"))))
     JOIN "public"."students" "s2" ON ((("s2"."id" = "sg2"."student_id") AND ("s2"."deleted_at" IS NULL))));


ALTER VIEW "public"."v_student_siblings" OWNER TO "postgres";


ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_session_id_student_id_key" UNIQUE ("session_id", "student_id");



ALTER TABLE ONLY "public"."attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_drafts"
    ADD CONSTRAINT "batch_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_job_items"
    ADD CONSTRAINT "batch_job_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_idempotency_key_key" UNIQUE ("idempotency_key");



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."book_lendings"
    ADD CONSTRAINT "book_lendings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_enrollments"
    ADD CONSTRAINT "class_enrollments_class_id_student_id_key" UNIQUE ("class_id", "student_id");



ALTER TABLE ONLY "public"."class_enrollments"
    ADD CONSTRAINT "class_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."class_sessions"
    ADD CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultation_notes"
    ADD CONSTRAINT "consultation_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultation_participants"
    ADD CONSTRAINT "consultation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exam_scores"
    ADD CONSTRAINT "exam_scores_exam_id_student_id_key" UNIQUE ("exam_id", "student_id");



ALTER TABLE ONLY "public"."exam_scores"
    ADD CONSTRAINT "exam_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guardians"
    ADD CONSTRAINT "guardians_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homework_submissions"
    ADD CONSTRAINT "homework_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."homework_submissions"
    ADD CONSTRAINT "homework_submissions_task_id_key" UNIQUE ("task_id");



ALTER TABLE ONLY "public"."in_app_notifications"
    ADD CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kakao_alimtalk_templates"
    ADD CONSTRAINT "kakao_alimtalk_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ref_activity_types"
    ADD CONSTRAINT "ref_activity_types_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."ref_exam_categories"
    ADD CONSTRAINT "ref_exam_categories_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."ref_roles"
    ADD CONSTRAINT "ref_roles_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."report_reads"
    ADD CONSTRAINT "report_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_sends"
    ADD CONSTRAINT "report_sends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."report_templates"
    ADD CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shared_alimtalk_templates"
    ADD CONSTRAINT "shared_alimtalk_templates_event_type_key" UNIQUE ("event_type");



ALTER TABLE ONLY "public"."shared_alimtalk_templates"
    ADD CONSTRAINT "shared_alimtalk_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."short_urls"
    ADD CONSTRAINT "short_urls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."short_urls"
    ADD CONSTRAINT "short_urls_short_code_key" UNIQUE ("short_code");



ALTER TABLE ONLY "public"."staff_invites"
    ADD CONSTRAINT "staff_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_invites"
    ADD CONSTRAINT "staff_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."student_activity_logs"
    ADD CONSTRAINT "student_activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_change_logs"
    ADD CONSTRAINT "student_change_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_guardians"
    ADD CONSTRAINT "student_guardians_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_guardians"
    ADD CONSTRAINT "student_guardians_student_id_guardian_id_key" UNIQUE ("student_id", "guardian_id");



ALTER TABLE ONLY "public"."student_schedules"
    ADD CONSTRAINT "student_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_schedules"
    ADD CONSTRAINT "student_schedules_student_id_day_of_week_key" UNIQUE ("student_id", "day_of_week");



ALTER TABLE ONLY "public"."student_tasks"
    ADD CONSTRAINT "student_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_textbooks"
    ADD CONSTRAINT "student_textbooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_todos_legacy"
    ADD CONSTRAINT "student_todos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_tenant_id_id_unique" UNIQUE ("tenant_id", "id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_tenant_id_code_key" UNIQUE ("tenant_id", "code");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_announcements"
    ADD CONSTRAINT "system_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teaching_resources"
    ADD CONSTRAINT "teaching_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_codes"
    ADD CONSTRAINT "tenant_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_event_subscriptions"
    ADD CONSTRAINT "tenant_event_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_event_subscriptions"
    ADD CONSTRAINT "tenant_event_subscriptions_tenant_id_event_type_key" UNIQUE ("tenant_id", "event_type");



ALTER TABLE ONLY "public"."tenant_messaging_config"
    ADD CONSTRAINT "tenant_messaging_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_messaging_config"
    ADD CONSTRAINT "tenant_messaging_config_tenant_id_key" UNIQUE ("tenant_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."textbook_progress"
    ADD CONSTRAINT "textbook_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."textbook_units"
    ADD CONSTRAINT "textbook_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."textbooks"
    ADD CONSTRAINT "textbooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."textbooks"
    ADD CONSTRAINT "textbooks_tenant_id_id_unique" UNIQUE ("tenant_id", "id");



ALTER TABLE ONLY "public"."todo_templates"
    ADD CONSTRAINT "todo_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guardians"
    ADD CONSTRAINT "uq_guardians_id_tenant" UNIQUE ("id", "tenant_id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "uq_students_id_tenant" UNIQUE ("id", "tenant_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "uq_users_id_tenant" UNIQUE ("id", "tenant_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_tenant_id_id_unique" UNIQUE ("tenant_id", "id");



CREATE INDEX "idx_activity_logs_date" ON "public"."student_activity_logs" USING "btree" ("activity_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_activity_logs_metadata" ON "public"."student_activity_logs" USING "gin" ("metadata") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_activity_logs_student" ON "public"."student_activity_logs" USING "btree" ("student_id", "activity_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_activity_logs_tenant" ON "public"."student_activity_logs" USING "btree" ("tenant_id", "activity_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_activity_logs_type" ON "public"."student_activity_logs" USING "btree" ("activity_type") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_att_sess_tenant_date" ON "public"."attendance_sessions" USING "btree" ("tenant_id", "session_date" DESC);



CREATE INDEX "idx_att_tenant_session_student" ON "public"."attendance" USING "btree" ("tenant_id", "session_id", "student_id");



CREATE INDEX "idx_attendance_sessions_class_id" ON "public"."attendance_sessions" USING "btree" ("class_id");



CREATE INDEX "idx_attendance_student_id" ON "public"."attendance" USING "btree" ("student_id");



CREATE INDEX "idx_batch_drafts_created_by" ON "public"."batch_drafts" USING "btree" ("tenant_id", "created_by") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_batch_drafts_status" ON "public"."batch_drafts" USING "btree" ("tenant_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_batch_drafts_tenant" ON "public"."batch_drafts" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_batch_job_items_job" ON "public"."batch_job_items" USING "btree" ("job_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_batch_job_items_status" ON "public"."batch_job_items" USING "btree" ("job_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_batch_job_items_target" ON "public"."batch_job_items" USING "btree" ("tenant_id", "target_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_batch_jobs_created_by" ON "public"."batch_jobs" USING "btree" ("tenant_id", "created_by") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_batch_jobs_draft" ON "public"."batch_jobs" USING "btree" ("draft_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_batch_jobs_status" ON "public"."batch_jobs" USING "btree" ("tenant_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_batch_jobs_tenant" ON "public"."batch_jobs" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_calendar_events_class_id" ON "public"."calendar_events" USING "btree" ("class_id") WHERE ("class_id" IS NOT NULL);



CREATE INDEX "idx_calendar_events_consultation_id" ON "public"."calendar_events" USING "btree" ("consultation_id") WHERE ("consultation_id" IS NOT NULL);



CREATE INDEX "idx_calendar_events_created_by" ON "public"."calendar_events" USING "btree" ("created_by");



CREATE INDEX "idx_calendar_events_exam_id" ON "public"."calendar_events" USING "btree" ("exam_id") WHERE ("exam_id" IS NOT NULL);



CREATE INDEX "idx_calendar_events_guardian_id" ON "public"."calendar_events" USING "btree" ("guardian_id") WHERE ("guardian_id" IS NOT NULL);



CREATE INDEX "idx_calendar_events_parent_event_id" ON "public"."calendar_events" USING "btree" ("parent_event_id") WHERE ("parent_event_id" IS NOT NULL);



CREATE INDEX "idx_calendar_events_student_id" ON "public"."calendar_events" USING "btree" ("student_id") WHERE ("student_id" IS NOT NULL);



CREATE INDEX "idx_calendar_events_updated_by" ON "public"."calendar_events" USING "btree" ("updated_by") WHERE ("updated_by" IS NOT NULL);



CREATE INDEX "idx_calendar_tenant_time" ON "public"."calendar_events" USING "btree" ("tenant_id", "start_at", "end_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_calendar_type" ON "public"."calendar_events" USING "btree" ("event_type");



CREATE INDEX "idx_class_enrollments_student_id" ON "public"."class_enrollments" USING "btree" ("student_id");



CREATE INDEX "idx_class_sessions_class" ON "public"."class_sessions" USING "btree" ("class_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_class_sessions_tenant_date" ON "public"."class_sessions" USING "btree" ("tenant_id", "session_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_classes_active" ON "public"."classes" USING "btree" ("tenant_id", "active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_classes_instructor" ON "public"."classes" USING "btree" ("instructor_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_classes_subject_id" ON "public"."classes" USING "btree" ("subject_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_classes_tenant_status" ON "public"."classes" USING "btree" ("tenant_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consultation_notes_category" ON "public"."consultation_notes" USING "btree" ("tenant_id", "category") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consultation_notes_consultation" ON "public"."consultation_notes" USING "btree" ("consultation_id", "note_order") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consultation_notes_created_by" ON "public"."consultation_notes" USING "btree" ("created_by");



CREATE INDEX "idx_consultation_participants_tenant_id" ON "public"."consultation_participants" USING "btree" ("tenant_id");



CREATE INDEX "idx_consultations_conducted_by_date" ON "public"."consultations" USING "btree" ("conducted_by", "consultation_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consultations_converted" ON "public"."consultations" USING "btree" ("converted_to_student_id") WHERE (("deleted_at" IS NULL) AND ("converted_to_student_id" IS NOT NULL));



CREATE INDEX "idx_consultations_follow_up" ON "public"."consultations" USING "btree" ("tenant_id", "follow_up_required", "next_consultation_date") WHERE (("deleted_at" IS NULL) AND ("follow_up_required" = true));



CREATE INDEX "idx_consultations_lead" ON "public"."consultations" USING "btree" ("tenant_id", "is_lead", "consultation_date" DESC) WHERE (("deleted_at" IS NULL) AND ("is_lead" = true));



CREATE INDEX "idx_consultations_student_date" ON "public"."consultations" USING "btree" ("student_id", "consultation_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consultations_tenant_date" ON "public"."consultations" USING "btree" ("tenant_id", "consultation_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_enroll_end_date" ON "public"."class_enrollments" USING "btree" ("tenant_id", "end_date");



CREATE INDEX "idx_enroll_tenant_class_student" ON "public"."class_enrollments" USING "btree" ("tenant_id", "class_id", "student_id");



CREATE INDEX "idx_event_subs_enabled" ON "public"."tenant_event_subscriptions" USING "btree" ("tenant_id", "is_enabled") WHERE (("is_enabled" = true) AND ("provisioning_status" = 'approved'::"text"));



CREATE INDEX "idx_event_subs_tenant" ON "public"."tenant_event_subscriptions" USING "btree" ("tenant_id");



CREATE INDEX "idx_exam_scores_exam" ON "public"."exam_scores" USING "btree" ("exam_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exam_scores_percentage" ON "public"."exam_scores" USING "btree" ("percentage");



CREATE INDEX "idx_exam_scores_status" ON "public"."exam_scores" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exam_scores_student" ON "public"."exam_scores" USING "btree" ("student_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exam_scores_tenant_created" ON "public"."exam_scores" USING "btree" ("tenant_id", "created_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exam_scores_tenant_id" ON "public"."exam_scores" USING "btree" ("tenant_id");



CREATE INDEX "idx_exams_archived_at" ON "public"."exams" USING "btree" ("tenant_id", "archived_at", "status", "exam_date") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exams_category" ON "public"."exams" USING "btree" ("category_code") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exams_class" ON "public"."exams" USING "btree" ("class_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exams_recurring_active" ON "public"."exams" USING "btree" ("tenant_id", "is_recurring", "is_template_active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exams_status" ON "public"."exams" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exams_subject" ON "public"."exams" USING "btree" ("subject_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exams_tenant_date" ON "public"."exams" USING "btree" ("tenant_id", "exam_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_guardians_tenant" ON "public"."guardians" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_guardians_tenant_email" ON "public"."guardians" USING "btree" ("tenant_id", "email") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_guardians_tenant_norm_phone" ON "public"."guardians" USING "btree" ("tenant_id", "normalized_phone") WHERE (("deleted_at" IS NULL) AND ("normalized_phone" IS NOT NULL));



CREATE INDEX "idx_guardians_tenant_phone" ON "public"."guardians" USING "btree" ("tenant_id", "phone") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_guardians_user_tenant" ON "public"."guardians" USING "btree" ("user_id", "tenant_id");



CREATE INDEX "idx_homework_submissions_graded_by" ON "public"."homework_submissions" USING "btree" ("graded_by") WHERE ("graded_by" IS NOT NULL);



CREATE INDEX "idx_homework_submissions_grading" ON "public"."homework_submissions" USING "btree" ("tenant_id", "graded_at" DESC) WHERE ("graded_at" IS NOT NULL);



CREATE INDEX "idx_homework_submissions_submitted_by" ON "public"."homework_submissions" USING "btree" ("submitted_by") WHERE ("submitted_by" IS NOT NULL);



CREATE INDEX "idx_homework_submissions_tenant_time" ON "public"."homework_submissions" USING "btree" ("tenant_id", "submitted_at" DESC);



CREATE INDEX "idx_in_app_notifications_tenant_id" ON "public"."in_app_notifications" USING "btree" ("tenant_id");



CREATE INDEX "idx_kakao_alimtalk_templates_shared_template_id" ON "public"."kakao_alimtalk_templates" USING "btree" ("shared_template_id") WHERE ("shared_template_id" IS NOT NULL);



CREATE INDEX "idx_kakao_templates_channel" ON "public"."kakao_alimtalk_templates" USING "btree" ("tenant_id", "channel_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_kakao_templates_solapi_id" ON "public"."kakao_alimtalk_templates" USING "btree" ("tenant_id", "solapi_template_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_kakao_templates_status" ON "public"."kakao_alimtalk_templates" USING "btree" ("tenant_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_lendings_student" ON "public"."book_lendings" USING "btree" ("student_id");



CREATE INDEX "idx_lendings_tenant_dates" ON "public"."book_lendings" USING "btree" ("tenant_id", "borrowed_at" DESC, "due_date" DESC);



CREATE INDEX "idx_lendings_textbook" ON "public"."book_lendings" USING "btree" ("textbook_id");



CREATE INDEX "idx_message_templates_tenant" ON "public"."message_templates" USING "btree" ("tenant_id", "deleted_at") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_message_templates_tenant_name_unique" ON "public"."message_templates" USING "btree" ("tenant_id", "name") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_message_templates_type" ON "public"."message_templates" USING "btree" ("tenant_id", "type", "category") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_notif_logs_type_sent" ON "public"."notification_logs" USING "btree" ("notification_type", "sent_at" DESC) WHERE ("status" = 'sent'::"public"."notification_status");



CREATE INDEX "idx_notif_unread_user" ON "public"."in_app_notifications" USING "btree" ("user_id", "created_at" DESC) WHERE ("is_read" = false);



CREATE INDEX "idx_notif_user_created" ON "public"."in_app_notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notification_logs_kakao_template_id" ON "public"."notification_logs" USING "btree" ("kakao_template_id") WHERE ("kakao_template_id" IS NOT NULL);



CREATE INDEX "idx_notification_logs_session_id" ON "public"."notification_logs" USING "btree" ("session_id") WHERE ("session_id" IS NOT NULL);



CREATE INDEX "idx_notification_logs_status" ON "public"."notification_logs" USING "btree" ("tenant_id", "status", "sent_at" DESC);



CREATE INDEX "idx_notification_logs_student" ON "public"."notification_logs" USING "btree" ("student_id", "sent_at" DESC);



CREATE INDEX "idx_notification_logs_tenant_time" ON "public"."notification_logs" USING "btree" ("tenant_id", "sent_at" DESC);



CREATE INDEX "idx_notification_logs_test" ON "public"."notification_logs" USING "btree" ("tenant_id", "sent_at" DESC) WHERE ("is_test" = true);



CREATE INDEX "idx_participants_consultation" ON "public"."consultation_participants" USING "btree" ("consultation_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_participants_guardian" ON "public"."consultation_participants" USING "btree" ("guardian_id") WHERE (("deleted_at" IS NULL) AND ("participant_type" = 'guardian'::"text"));



CREATE INDEX "idx_participants_user" ON "public"."consultation_participants" USING "btree" ("user_id") WHERE (("deleted_at" IS NULL) AND ("participant_type" = 'instructor'::"text"));



CREATE INDEX "idx_progress_recorder" ON "public"."textbook_progress" USING "btree" ("recorded_by", "date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_progress_tenant_student_textbook_date" ON "public"."textbook_progress" USING "btree" ("tenant_id", "student_id", "textbook_id", "date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_progress_textbook_date" ON "public"."textbook_progress" USING "btree" ("textbook_id", "date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_progress_unit" ON "public"."textbook_progress" USING "btree" ("unit_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_reads_read_at" ON "public"."report_reads" USING "btree" ("read_at" DESC);



CREATE INDEX "idx_report_reads_report" ON "public"."report_reads" USING "btree" ("report_id");



CREATE INDEX "idx_report_reads_report_send" ON "public"."report_reads" USING "btree" ("report_send_id");



CREATE INDEX "idx_report_reads_tenant" ON "public"."report_reads" USING "btree" ("tenant_id");



CREATE INDEX "idx_report_sends_kakao_template_id" ON "public"."report_sends" USING "btree" ("kakao_template_id") WHERE ("kakao_template_id" IS NOT NULL);



CREATE INDEX "idx_report_sends_recipient" ON "public"."report_sends" USING "btree" ("recipient_id", "recipient_type") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_sends_report" ON "public"."report_sends" USING "btree" ("report_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_sends_send_status" ON "public"."report_sends" USING "btree" ("tenant_id", "send_status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_sends_share_link" ON "public"."report_sends" USING "btree" ("share_link_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_sends_short_url_id" ON "public"."report_sends" USING "btree" ("short_url_id") WHERE ("short_url_id" IS NOT NULL);



CREATE INDEX "idx_report_sends_status" ON "public"."report_sends" USING "btree" ("send_status", "sent_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_sends_tenant" ON "public"."report_sends" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_templates_active" ON "public"."report_templates" USING "btree" ("is_active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_templates_system" ON "public"."report_templates" USING "btree" ("is_system") WHERE (("is_system" = true) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_report_templates_tenant_category" ON "public"."report_templates" USING "btree" ("tenant_id", "category") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_reports_student" ON "public"."reports" USING "btree" ("student_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_reports_tenant_period" ON "public"."reports" USING "btree" ("tenant_id", "period_start", "period_end") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_resources_category" ON "public"."teaching_resources" USING "btree" ("tenant_id", "category") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_resources_creator" ON "public"."teaching_resources" USING "btree" ("created_by", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_resources_public" ON "public"."teaching_resources" USING "btree" ("tenant_id", "is_public") WHERE (("deleted_at" IS NULL) AND ("is_public" = true));



CREATE INDEX "idx_resources_shared_with" ON "public"."teaching_resources" USING "gin" ("shared_with") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_resources_subject" ON "public"."teaching_resources" USING "btree" ("tenant_id", "subject") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_resources_tenant" ON "public"."teaching_resources" USING "btree" ("tenant_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_sched_active" ON "public"."student_schedules" USING "btree" ("tenant_id", "active");



CREATE INDEX "idx_sched_tenant_student" ON "public"."student_schedules" USING "btree" ("tenant_id", "student_id");



CREATE INDEX "idx_sg_guardian" ON "public"."student_guardians" USING "btree" ("guardian_id");



CREATE INDEX "idx_sg_tenant_student" ON "public"."student_guardians" USING "btree" ("tenant_id", "student_id");



CREATE INDEX "idx_short_urls_expires_at" ON "public"."short_urls" USING "btree" ("expires_at") WHERE (("deleted_at" IS NULL) AND ("expires_at" IS NOT NULL));



CREATE INDEX "idx_short_urls_report_send_id" ON "public"."short_urls" USING "btree" ("report_send_id") WHERE ("report_send_id" IS NOT NULL);



CREATE INDEX "idx_short_urls_short_code" ON "public"."short_urls" USING "btree" ("short_code") WHERE (("deleted_at" IS NULL) AND ("is_active" = true));



CREATE INDEX "idx_short_urls_tenant" ON "public"."short_urls" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_staff_inv_expires" ON "public"."staff_invites" USING "btree" ("expires_at");



CREATE INDEX "idx_staff_inv_tenant_email" ON "public"."staff_invites" USING "btree" ("tenant_id", "email");



CREATE INDEX "idx_staff_invites_created_by" ON "public"."staff_invites" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_student_activity_logs_created_by" ON "public"."student_activity_logs" USING "btree" ("created_by") WHERE ("created_by" IS NOT NULL);



CREATE INDEX "idx_student_change_logs_batch" ON "public"."student_change_logs" USING "btree" ("tenant_id", "batch_id") WHERE ("batch_id" IS NOT NULL);



CREATE INDEX "idx_student_change_logs_student" ON "public"."student_change_logs" USING "btree" ("tenant_id", "student_id", "changed_at" DESC);



CREATE INDEX "idx_student_change_logs_student_id" ON "public"."student_change_logs" USING "btree" ("student_id");



CREATE INDEX "idx_student_change_logs_type" ON "public"."student_change_logs" USING "btree" ("tenant_id", "change_type", "changed_at" DESC);



CREATE INDEX "idx_student_tasks_assigned_by" ON "public"."student_tasks" USING "btree" ("assigned_by") WHERE ("assigned_by" IS NOT NULL);



CREATE INDEX "idx_student_tasks_completed" ON "public"."student_tasks" USING "btree" ("tenant_id", "kind", "completed_at" DESC) WHERE (("deleted_at" IS NULL) AND ("completed_at" IS NOT NULL) AND ("verified_at" IS NULL));



CREATE INDEX "idx_student_tasks_kind_pending" ON "public"."student_tasks" USING "btree" ("tenant_id", "kind", "due_date") WHERE (("deleted_at" IS NULL) AND ("completed_at" IS NULL));



CREATE INDEX "idx_student_tasks_student_due" ON "public"."student_tasks" USING "btree" ("student_id", "due_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_student_tasks_tenant" ON "public"."student_tasks" USING "btree" ("tenant_id", "deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_student_tasks_verified" ON "public"."student_tasks" USING "btree" ("tenant_id", "verified_at" DESC) WHERE (("deleted_at" IS NULL) AND ("verified_at" IS NOT NULL));



CREATE INDEX "idx_student_tasks_verified_by" ON "public"."student_tasks" USING "btree" ("verified_by") WHERE ("verified_by" IS NOT NULL);



CREATE INDEX "idx_student_textbooks_student" ON "public"."student_textbooks" USING "btree" ("student_id", "issue_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_student_textbooks_tenant_student_textbook" ON "public"."student_textbooks" USING "btree" ("tenant_id", "student_id", "textbook_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_student_textbooks_tenant_textbook" ON "public"."student_textbooks" USING "btree" ("tenant_id", "textbook_id");



CREATE INDEX "idx_student_textbooks_textbook" ON "public"."student_textbooks" USING "btree" ("textbook_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_student_textbooks_unique_in_use" ON "public"."student_textbooks" USING "btree" ("tenant_id", "student_id", "textbook_id") WHERE (("deleted_at" IS NULL) AND ("status" = 'in_use'::"text"));



CREATE INDEX "idx_student_textbooks_unpaid" ON "public"."student_textbooks" USING "btree" ("tenant_id", "paid") WHERE (("deleted_at" IS NULL) AND ("paid" = false));



CREATE INDEX "idx_student_todos_legacy_verified_by" ON "public"."student_todos_legacy" USING "btree" ("verified_by") WHERE ("verified_by" IS NOT NULL);



CREATE INDEX "idx_students_grade" ON "public"."students" USING "btree" ("grade") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_students_name_trgm" ON "public"."students" USING "gin" ("name" "public"."gin_trgm_ops") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_students_student_code_trgm" ON "public"."students" USING "gin" ("student_code" "public"."gin_trgm_ops") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_students_student_phone_trgm" ON "public"."students" USING "gin" ("student_phone" "public"."gin_trgm_ops") WHERE (("deleted_at" IS NULL) AND ("student_phone" IS NOT NULL));



CREATE INDEX "idx_students_tenant_created_desc_active" ON "public"."students" USING "btree" ("tenant_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_students_user_id" ON "public"."students" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_subjects_tenant_active_sort" ON "public"."subjects" USING "btree" ("tenant_id", "active", "deleted_at", "sort_order");



CREATE INDEX "idx_subjects_tenant_sort" ON "public"."subjects" USING "btree" ("tenant_id", "active", "sort_order");



CREATE INDEX "idx_support_tickets_responded_by" ON "public"."support_tickets" USING "btree" ("responded_by") WHERE ("responded_by" IS NOT NULL);



CREATE INDEX "idx_support_tickets_status" ON "public"."support_tickets" USING "btree" ("tenant_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_support_tickets_user" ON "public"."support_tickets" USING "btree" ("user_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_system_announcements_active" ON "public"."system_announcements" USING "btree" ("published_at" DESC) WHERE ("is_active" = true);



CREATE INDEX "idx_tenant_event_subscriptions_kakao_template_id" ON "public"."tenant_event_subscriptions" USING "btree" ("kakao_template_id") WHERE ("kakao_template_id" IS NOT NULL);



CREATE INDEX "idx_tenant_event_subscriptions_shared_template_id" ON "public"."tenant_event_subscriptions" USING "btree" ("shared_template_id") WHERE ("shared_template_id" IS NOT NULL);



CREATE INDEX "idx_tenant_messaging_config_active" ON "public"."tenant_messaging_config" USING "btree" ("tenant_id", "is_active") WHERE (("deleted_at" IS NULL) AND ("is_active" = true));



CREATE INDEX "idx_tenant_messaging_config_tenant" ON "public"."tenant_messaging_config" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_tenants_deleted" ON "public"."tenants" USING "btree" ("deleted_at");



CREATE INDEX "idx_tenants_slug" ON "public"."tenants" USING "btree" ("slug") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_textbook_progress_tenant_recorded_by" ON "public"."textbook_progress" USING "btree" ("tenant_id", "recorded_by");



CREATE INDEX "idx_textbook_progress_tenant_textbook" ON "public"."textbook_progress" USING "btree" ("tenant_id", "textbook_id");



CREATE INDEX "idx_textbook_units_tenant_textbook_order" ON "public"."textbook_units" USING "btree" ("tenant_id", "textbook_id", "unit_order") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_textbook_units_unique" ON "public"."textbook_units" USING "btree" ("tenant_id", "textbook_id", "unit_order") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_textbooks_author_trgm" ON "public"."textbooks" USING "gin" ("author" "public"."gin_trgm_ops") WHERE (("deleted_at" IS NULL) AND ("author" IS NOT NULL));



CREATE INDEX "idx_textbooks_barcode_trgm" ON "public"."textbooks" USING "gin" ("barcode" "public"."gin_trgm_ops") WHERE (("deleted_at" IS NULL) AND ("barcode" IS NOT NULL));



CREATE INDEX "idx_textbooks_isbn_trgm" ON "public"."textbooks" USING "gin" ("isbn" "public"."gin_trgm_ops") WHERE (("deleted_at" IS NULL) AND ("isbn" IS NOT NULL));



CREATE INDEX "idx_textbooks_management_code_trgm" ON "public"."textbooks" USING "gin" ("management_code" "public"."gin_trgm_ops") WHERE (("deleted_at" IS NULL) AND ("management_code" IS NOT NULL));



CREATE INDEX "idx_textbooks_publisher_trgm" ON "public"."textbooks" USING "gin" ("publisher" "public"."gin_trgm_ops") WHERE (("deleted_at" IS NULL) AND ("publisher" IS NOT NULL));



CREATE INDEX "idx_textbooks_tenant_active" ON "public"."textbooks" USING "btree" ("tenant_id") WHERE (("deleted_at" IS NULL) AND ("is_active" = true));



CREATE UNIQUE INDEX "idx_textbooks_tenant_barcode" ON "public"."textbooks" USING "btree" ("tenant_id", "barcode") WHERE (("deleted_at" IS NULL) AND ("barcode" IS NOT NULL));



CREATE INDEX "idx_textbooks_tenant_created_desc" ON "public"."textbooks" USING "btree" ("tenant_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_textbooks_tenant_isbn_unique" ON "public"."textbooks" USING "btree" ("tenant_id", "isbn") WHERE (("deleted_at" IS NULL) AND ("isbn" IS NOT NULL));



CREATE UNIQUE INDEX "idx_textbooks_tenant_management_code" ON "public"."textbooks" USING "btree" ("tenant_id", "management_code") WHERE (("deleted_at" IS NULL) AND ("management_code" IS NOT NULL));



CREATE INDEX "idx_textbooks_title_trgm" ON "public"."textbooks" USING "gin" ("title" "public"."gin_trgm_ops") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_tmpl_tenant_active" ON "public"."todo_templates" USING "btree" ("tenant_id", "active");



CREATE INDEX "idx_tmpl_tenant_subject" ON "public"."todo_templates" USING "btree" ("tenant_id", "subject");



CREATE INDEX "idx_todos_completed" ON "public"."student_todos_legacy" USING "btree" ("tenant_id", "completed_at");



CREATE INDEX "idx_todos_student" ON "public"."student_todos_legacy" USING "btree" ("student_id");



CREATE INDEX "idx_todos_tenant_due" ON "public"."student_todos_legacy" USING "btree" ("tenant_id", "due_date");



CREATE INDEX "idx_todos_verified" ON "public"."student_todos_legacy" USING "btree" ("tenant_id", "verified_at");



CREATE INDEX "idx_users_approval" ON "public"."users" USING "btree" ("approval_status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_users_id_tenant" ON "public"."users" USING "btree" ("id", "tenant_id");



CREATE INDEX "idx_users_name_trgm" ON "public"."users" USING "gin" ("name" "public"."gin_trgm_ops") WHERE ("name" IS NOT NULL);



CREATE INDEX "idx_users_phone_trgm" ON "public"."users" USING "gin" ("phone" "public"."gin_trgm_ops") WHERE ("phone" IS NOT NULL);



CREATE INDEX "idx_users_role_code" ON "public"."users" USING "btree" ("role_code") WHERE ("role_code" IS NOT NULL);



CREATE INDEX "idx_users_tenant_role" ON "public"."users" USING "btree" ("tenant_id", "role_code") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uq_guardians_tenant_phone_name_active" ON "public"."guardians" USING "btree" ("tenant_id", "normalized_phone", "lower"("name")) WHERE (("deleted_at" IS NULL) AND ("normalized_phone" IS NOT NULL));



COMMENT ON INDEX "public"."uq_guardians_tenant_phone_name_active" IS '동일 테넌트 내에서 (정규화 전화번호 + 이름 소문자) 조합은 활성 보호자 1명만 허용';



CREATE UNIQUE INDEX "uq_sg_primary_per_student" ON "public"."student_guardians" USING "btree" ("student_id") WHERE "is_primary";



CREATE UNIQUE INDEX "uq_students_tenant_code_active" ON "public"."students" USING "btree" ("tenant_id", "student_code") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uq_subjects_tenant_code_active" ON "public"."subjects" USING "btree" ("tenant_id", "code") WHERE (("deleted_at" IS NULL) AND ("code" IS NOT NULL));



CREATE UNIQUE INDEX "uq_tenant_codes" ON "public"."tenant_codes" USING "btree" ("tenant_id", "code_type", "code");



CREATE UNIQUE INDEX "uq_users_email_active" ON "public"."users" USING "btree" ("email") WHERE (("deleted_at" IS NULL) AND ("email" IS NOT NULL));



CREATE OR REPLACE TRIGGER "event_subs_updated_at_trigger" BEFORE UPDATE ON "public"."tenant_event_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_event_subs_updated_at"();



CREATE OR REPLACE TRIGGER "kakao_templates_updated_at_trigger" BEFORE UPDATE ON "public"."kakao_alimtalk_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_kakao_templates_updated_at"();



CREATE OR REPLACE TRIGGER "set_batch_drafts_updated_at" BEFORE UPDATE ON "public"."batch_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_batch_job_items_updated_at" BEFORE UPDATE ON "public"."batch_job_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_batch_jobs_updated_at" BEFORE UPDATE ON "public"."batch_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_message_templates_updated_at" BEFORE UPDATE ON "public"."message_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_report_templates_updated_at" BEFORE UPDATE ON "public"."report_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_support_tickets_updated_at" BEFORE UPDATE ON "public"."support_tickets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "shared_templates_updated_at_trigger" BEFORE UPDATE ON "public"."shared_alimtalk_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_shared_templates_updated_at"();



CREATE OR REPLACE TRIGGER "trg_in_app_notifications_updated_at" BEFORE UPDATE ON "public"."in_app_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_set_attendance_date" BEFORE INSERT OR UPDATE ON "public"."attendance" FOR EACH ROW EXECUTE FUNCTION "public"."set_attendance_date"();



CREATE OR REPLACE TRIGGER "trg_student_tasks_normalize_dow" BEFORE INSERT OR UPDATE ON "public"."student_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."fn_student_tasks_normalize_dow"();



CREATE OR REPLACE TRIGGER "trg_system_announcements_updated_at" BEFORE UPDATE ON "public"."system_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tenant_messaging_config_set_updated_at" BEFORE UPDATE ON "public"."tenant_messaging_config" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_check_retest" BEFORE INSERT OR UPDATE OF "percentage", "status" ON "public"."exam_scores" FOR EACH ROW EXECUTE FUNCTION "public"."check_and_mark_retest"();



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_drafts"
    ADD CONSTRAINT "batch_drafts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."batch_drafts"
    ADD CONSTRAINT "batch_drafts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."batch_job_items"
    ADD CONSTRAINT "batch_job_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."batch_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."batch_job_items"
    ADD CONSTRAINT "batch_job_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "public"."batch_drafts"("id");



ALTER TABLE ONLY "public"."batch_jobs"
    ADD CONSTRAINT "batch_jobs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."book_lendings"
    ADD CONSTRAINT "book_lendings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."book_lendings"
    ADD CONSTRAINT "book_lendings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."book_lendings"
    ADD CONSTRAINT "book_lendings_textbook_id_fkey" FOREIGN KEY ("textbook_id") REFERENCES "public"."textbooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "public"."calendar_events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_events"
    ADD CONSTRAINT "calendar_events_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."class_enrollments"
    ADD CONSTRAINT "class_enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_enrollments"
    ADD CONSTRAINT "class_enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_enrollments"
    ADD CONSTRAINT "class_enrollments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_sessions"
    ADD CONSTRAINT "class_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_sessions"
    ADD CONSTRAINT "class_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultation_notes"
    ADD CONSTRAINT "consultation_notes_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultation_notes"
    ADD CONSTRAINT "consultation_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."consultation_notes"
    ADD CONSTRAINT "consultation_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultation_participants"
    ADD CONSTRAINT "consultation_participants_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultation_participants"
    ADD CONSTRAINT "consultation_participants_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultation_participants"
    ADD CONSTRAINT "consultation_participants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultation_participants"
    ADD CONSTRAINT "consultation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_conducted_by_fkey" FOREIGN KEY ("conducted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_converted_to_student_id_fkey" FOREIGN KEY ("converted_to_student_id") REFERENCES "public"."students"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_instructor_id_fkey" FOREIGN KEY ("conducted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultations"
    ADD CONSTRAINT "consultations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_scores"
    ADD CONSTRAINT "exam_scores_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_scores"
    ADD CONSTRAINT "exam_scores_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exam_scores"
    ADD CONSTRAINT "exam_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_category_code_fkey" FOREIGN KEY ("category_code") REFERENCES "public"."ref_exam_categories"("code") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."exams"
    ADD CONSTRAINT "exams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guardians"
    ADD CONSTRAINT "fk_guardian_user_same_tenant" FOREIGN KEY ("user_id", "tenant_id") REFERENCES "public"."users"("id", "tenant_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."guardians"
    ADD CONSTRAINT "guardians_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."homework_submissions"
    ADD CONSTRAINT "homework_submissions_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."homework_submissions"
    ADD CONSTRAINT "homework_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."homework_submissions"
    ADD CONSTRAINT "homework_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."student_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."homework_submissions"
    ADD CONSTRAINT "homework_submissions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."in_app_notifications"
    ADD CONSTRAINT "in_app_notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."in_app_notifications"
    ADD CONSTRAINT "in_app_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kakao_alimtalk_templates"
    ADD CONSTRAINT "kakao_alimtalk_templates_shared_template_id_fkey" FOREIGN KEY ("shared_template_id") REFERENCES "public"."shared_alimtalk_templates"("id");



ALTER TABLE ONLY "public"."kakao_alimtalk_templates"
    ADD CONSTRAINT "kakao_alimtalk_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_kakao_template_id_fkey" FOREIGN KEY ("kakao_template_id") REFERENCES "public"."kakao_alimtalk_templates"("id");



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."attendance_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notification_logs"
    ADD CONSTRAINT "notification_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_reads"
    ADD CONSTRAINT "report_reads_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_reads"
    ADD CONSTRAINT "report_reads_report_send_id_fkey" FOREIGN KEY ("report_send_id") REFERENCES "public"."report_sends"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_reads"
    ADD CONSTRAINT "report_reads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_sends"
    ADD CONSTRAINT "report_sends_kakao_template_id_fkey" FOREIGN KEY ("kakao_template_id") REFERENCES "public"."kakao_alimtalk_templates"("id");



ALTER TABLE ONLY "public"."report_sends"
    ADD CONSTRAINT "report_sends_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_sends"
    ADD CONSTRAINT "report_sends_short_url_id_fkey" FOREIGN KEY ("short_url_id") REFERENCES "public"."short_urls"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_sends"
    ADD CONSTRAINT "report_sends_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_templates"
    ADD CONSTRAINT "report_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_urls"
    ADD CONSTRAINT "short_urls_report_send_id_fkey" FOREIGN KEY ("report_send_id") REFERENCES "public"."report_sends"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."short_urls"
    ADD CONSTRAINT "short_urls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_invites"
    ADD CONSTRAINT "staff_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."staff_invites"
    ADD CONSTRAINT "staff_invites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_activity_logs"
    ADD CONSTRAINT "student_activity_logs_activity_type_fkey" FOREIGN KEY ("activity_type") REFERENCES "public"."ref_activity_types"("code");



ALTER TABLE ONLY "public"."student_activity_logs"
    ADD CONSTRAINT "student_activity_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_activity_logs"
    ADD CONSTRAINT "student_activity_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_activity_logs"
    ADD CONSTRAINT "student_activity_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_change_logs"
    ADD CONSTRAINT "student_change_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id");



ALTER TABLE ONLY "public"."student_change_logs"
    ADD CONSTRAINT "student_change_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."student_guardians"
    ADD CONSTRAINT "student_guardians_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_guardians"
    ADD CONSTRAINT "student_guardians_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_guardians"
    ADD CONSTRAINT "student_guardians_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_schedules"
    ADD CONSTRAINT "student_schedules_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_schedules"
    ADD CONSTRAINT "student_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_tasks"
    ADD CONSTRAINT "student_tasks_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_tasks"
    ADD CONSTRAINT "student_tasks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_tasks"
    ADD CONSTRAINT "student_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_tasks"
    ADD CONSTRAINT "student_tasks_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."student_textbooks"
    ADD CONSTRAINT "student_textbooks_student_fk" FOREIGN KEY ("tenant_id", "student_id") REFERENCES "public"."students"("tenant_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_textbooks"
    ADD CONSTRAINT "student_textbooks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_textbooks"
    ADD CONSTRAINT "student_textbooks_textbook_fk" FOREIGN KEY ("tenant_id", "textbook_id") REFERENCES "public"."textbooks"("tenant_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."student_todos_legacy"
    ADD CONSTRAINT "student_todos_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_todos_legacy"
    ADD CONSTRAINT "student_todos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."student_todos_legacy"
    ADD CONSTRAINT "student_todos_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."subjects"
    ADD CONSTRAINT "subjects_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."teaching_resources"
    ADD CONSTRAINT "teaching_resources_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."teaching_resources"
    ADD CONSTRAINT "teaching_resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_codes"
    ADD CONSTRAINT "tenant_codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_event_subscriptions"
    ADD CONSTRAINT "tenant_event_subscriptions_kakao_template_id_fkey" FOREIGN KEY ("kakao_template_id") REFERENCES "public"."kakao_alimtalk_templates"("id");



ALTER TABLE ONLY "public"."tenant_event_subscriptions"
    ADD CONSTRAINT "tenant_event_subscriptions_shared_template_id_fkey" FOREIGN KEY ("shared_template_id") REFERENCES "public"."shared_alimtalk_templates"("id");



ALTER TABLE ONLY "public"."tenant_event_subscriptions"
    ADD CONSTRAINT "tenant_event_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_messaging_config"
    ADD CONSTRAINT "tenant_messaging_config_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."textbook_progress"
    ADD CONSTRAINT "textbook_progress_recorded_by_fk" FOREIGN KEY ("tenant_id", "recorded_by") REFERENCES "public"."users"("tenant_id", "id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."textbook_progress"
    ADD CONSTRAINT "textbook_progress_student_fk" FOREIGN KEY ("tenant_id", "student_id") REFERENCES "public"."students"("tenant_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."textbook_progress"
    ADD CONSTRAINT "textbook_progress_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."textbook_progress"
    ADD CONSTRAINT "textbook_progress_textbook_fk" FOREIGN KEY ("tenant_id", "textbook_id") REFERENCES "public"."textbooks"("tenant_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."textbook_progress"
    ADD CONSTRAINT "textbook_progress_unit_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."textbook_units"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."textbook_units"
    ADD CONSTRAINT "textbook_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."textbook_units"
    ADD CONSTRAINT "textbook_units_textbook_fk" FOREIGN KEY ("tenant_id", "textbook_id") REFERENCES "public"."textbooks"("tenant_id", "id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."textbooks"
    ADD CONSTRAINT "textbooks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."todo_templates"
    ADD CONSTRAINT "todo_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "public"."ref_roles"("code");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



CREATE POLICY "Activity types are viewable by all authenticated users" ON "public"."ref_activity_types" FOR SELECT TO "authenticated" USING (("active" = true));



CREATE POLICY "Authenticated users can view active announcements" ON "public"."system_announcements" FOR SELECT TO "authenticated" USING ((("is_active" = true) AND (("expires_at" IS NULL) OR ("expires_at" > "now"()))));



CREATE POLICY "Service role has full access to activity logs" ON "public"."student_activity_logs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create tickets" ON "public"."support_tickets" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own notifications" ON "public"."in_app_notifications" FOR UPDATE USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Users can update own tickets" ON "public"."support_tickets" FOR UPDATE USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL)));



CREATE POLICY "Users can view own notifications" ON "public"."in_app_notifications" FOR SELECT USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_delete_staff" ON "public"."attendance" FOR DELETE USING ((("tenant_id" = "public"."current_user_tenant_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['owner'::"text", 'instructor'::"text", 'assistant'::"text"]))));



CREATE POLICY "attendance_insert_staff" ON "public"."attendance" FOR INSERT WITH CHECK ((("tenant_id" = "public"."current_user_tenant_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['owner'::"text", 'instructor'::"text", 'assistant'::"text"]))));



CREATE POLICY "attendance_select_same_tenant" ON "public"."attendance" FOR SELECT USING (("tenant_id" = "public"."current_user_tenant_id"()));



ALTER TABLE "public"."attendance_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attendance_sessions_delete_staff" ON "public"."attendance_sessions" FOR DELETE USING ((("tenant_id" = "public"."current_user_tenant_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['owner'::"text", 'instructor'::"text", 'assistant'::"text"]))));



CREATE POLICY "attendance_sessions_insert_staff" ON "public"."attendance_sessions" FOR INSERT WITH CHECK ((("tenant_id" = "public"."current_user_tenant_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['owner'::"text", 'instructor'::"text", 'assistant'::"text"]))));



CREATE POLICY "attendance_sessions_select_same_tenant" ON "public"."attendance_sessions" FOR SELECT USING (("tenant_id" = "public"."current_user_tenant_id"()));



CREATE POLICY "attendance_sessions_update_staff" ON "public"."attendance_sessions" FOR UPDATE USING ((("tenant_id" = "public"."current_user_tenant_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['owner'::"text", 'instructor'::"text", 'assistant'::"text"])))) WITH CHECK ((("tenant_id" = "public"."current_user_tenant_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['owner'::"text", 'instructor'::"text", 'assistant'::"text"]))));



CREATE POLICY "attendance_update_staff" ON "public"."attendance" FOR UPDATE USING ((("tenant_id" = "public"."current_user_tenant_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['owner'::"text", 'instructor'::"text", 'assistant'::"text"])))) WITH CHECK ((("tenant_id" = "public"."current_user_tenant_id"()) AND ("public"."current_user_role"() = ANY (ARRAY['owner'::"text", 'instructor'::"text", 'assistant'::"text"]))));



ALTER TABLE "public"."batch_drafts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "batch_drafts_delete" ON "public"."batch_drafts" FOR DELETE USING (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



CREATE POLICY "batch_drafts_insert" ON "public"."batch_drafts" FOR INSERT WITH CHECK (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



CREATE POLICY "batch_drafts_select" ON "public"."batch_drafts" FOR SELECT USING (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



CREATE POLICY "batch_drafts_update" ON "public"."batch_drafts" FOR UPDATE USING (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



ALTER TABLE "public"."batch_job_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "batch_job_items_delete" ON "public"."batch_job_items" FOR DELETE USING (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



CREATE POLICY "batch_job_items_insert" ON "public"."batch_job_items" FOR INSERT WITH CHECK (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



CREATE POLICY "batch_job_items_select" ON "public"."batch_job_items" FOR SELECT USING (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



CREATE POLICY "batch_job_items_update" ON "public"."batch_job_items" FOR UPDATE USING (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



ALTER TABLE "public"."batch_jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "batch_jobs_delete" ON "public"."batch_jobs" FOR DELETE USING (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



CREATE POLICY "batch_jobs_insert" ON "public"."batch_jobs" FOR INSERT WITH CHECK (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



CREATE POLICY "batch_jobs_select" ON "public"."batch_jobs" FOR SELECT USING (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



CREATE POLICY "batch_jobs_update" ON "public"."batch_jobs" FOR UPDATE USING (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



ALTER TABLE "public"."book_lendings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."class_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_subs_insert_policy" ON "public"."tenant_event_subscriptions" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "u"."tenant_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "event_subs_select_policy" ON "public"."tenant_event_subscriptions" FOR SELECT USING (("tenant_id" = ( SELECT "u"."tenant_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "event_subs_update_policy" ON "public"."tenant_event_subscriptions" FOR UPDATE USING (("tenant_id" = ( SELECT "u"."tenant_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid"))))) WITH CHECK (("tenant_id" = ( SELECT "u"."tenant_id"
   FROM "public"."users" "u"
  WHERE ("u"."id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."exam_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guardians" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."homework_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."in_app_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kakao_alimtalk_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kakao_templates_insert_policy" ON "public"."kakao_alimtalk_templates" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "users"."tenant_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "kakao_templates_select_policy" ON "public"."kakao_alimtalk_templates" FOR SELECT USING ((("tenant_id" = ( SELECT "users"."tenant_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("deleted_at" IS NULL)));



CREATE POLICY "kakao_templates_update_policy" ON "public"."kakao_alimtalk_templates" FOR UPDATE USING ((("tenant_id" = ( SELECT "users"."tenant_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("deleted_at" IS NULL))) WITH CHECK (("tenant_id" = ( SELECT "users"."tenant_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."message_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ref_activity_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ref_exam_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ref_exam_categories_select_policy" ON "public"."ref_exam_categories" FOR SELECT USING (true);



ALTER TABLE "public"."ref_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_sends" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "report_templates_delete" ON "public"."report_templates" FOR DELETE USING ((("tenant_id" = ( SELECT "users"."tenant_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("is_system" = false)));



CREATE POLICY "report_templates_insert" ON "public"."report_templates" FOR INSERT WITH CHECK ((("tenant_id" = ( SELECT "users"."tenant_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("is_system" = false)));



CREATE POLICY "report_templates_select" ON "public"."report_templates" FOR SELECT USING ((("is_system" = true) OR ("tenant_id" = ( SELECT "users"."tenant_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "report_templates_update" ON "public"."report_templates" FOR UPDATE USING ((("tenant_id" = ( SELECT "users"."tenant_id"
   FROM "public"."users"
  WHERE ("users"."id" = ( SELECT "auth"."uid"() AS "uid")))) AND ("is_system" = false)));



ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shared_alimtalk_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shared_templates_select_policy" ON "public"."shared_alimtalk_templates" FOR SELECT USING (true);



ALTER TABLE "public"."short_urls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_change_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_change_logs_insert" ON "public"."student_change_logs" FOR INSERT WITH CHECK (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



CREATE POLICY "student_change_logs_select" ON "public"."student_change_logs" FOR SELECT USING (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid"));



ALTER TABLE "public"."student_guardians" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_textbooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_todos_legacy" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subjects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_tickets_select" ON "public"."support_tickets" FOR SELECT USING ((("deleted_at" IS NULL) AND (("tenant_id" = (( SELECT "current_setting"('app.current_tenant_id'::"text", true) AS "current_setting"))::"uuid") OR ("user_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."system_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teaching_resources" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_event_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_messaging_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."textbook_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."textbook_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."textbooks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."todo_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_signup" ON "public"."users" FOR INSERT WITH CHECK ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_id" IS NULL) AND ("role_code" IS NULL) AND ("approval_status" IS NULL) AND ("onboarding_completed" = false)));



CREATE POLICY "users_select_self" ON "public"."users" FOR SELECT USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL)));



CREATE POLICY "users_update_self" ON "public"."users" FOR UPDATE USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) AND ("deleted_at" IS NULL))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_tenant_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_tenant_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_exam_score_counts"("p_tenant_id" "uuid", "p_exam_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_exam_score_counts"("p_tenant_id" "uuid", "p_exam_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_subject_scores"("p_student_id" "uuid", "p_year_month" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_student_detail"("p_student_id" "uuid", "p_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_student_detail"("p_student_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_student_activity"("p_tenant_id" "uuid", "p_student_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text", "p_metadata" "jsonb", "p_activity_date" timestamp with time zone, "p_created_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_student_activity"("p_tenant_id" "uuid", "p_student_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text", "p_metadata" "jsonb", "p_activity_date" timestamp with time zone, "p_created_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_students_list"("p_tenant_id" "uuid", "p_search" "text", "p_grade" "text", "p_class_id" "text", "p_school" "text", "p_commute_method" "text", "p_marketing_source" "text", "p_enrollment_date_from" "date", "p_enrollment_date_to" "date", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_students_list"("p_tenant_id" "uuid", "p_search" "text", "p_grade" "text", "p_class_id" "text", "p_school" "text", "p_commute_method" "text", "p_marketing_source" "text", "p_enrollment_date_from" "date", "p_enrollment_date_to" "date", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_textbooks_list"("p_tenant_id" "uuid", "p_search" "text", "p_active_only" boolean, "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_textbooks_list"("p_tenant_id" "uuid", "p_search" "text", "p_active_only" boolean, "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."show_current_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_current_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_current_user"() TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance_records" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance_records" TO "anon";
GRANT ALL ON TABLE "public"."attendance_records" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance_sessions" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance_sessions" TO "anon";
GRANT ALL ON TABLE "public"."attendance_sessions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."batch_drafts" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."batch_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_drafts" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."batch_job_items" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."batch_job_items" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_job_items" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."batch_jobs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."batch_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."batch_jobs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."book_lendings" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."book_lendings" TO "anon";
GRANT ALL ON TABLE "public"."book_lendings" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."calendar_events" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."calendar_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_events" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."class_enrollments" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."class_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."class_enrollments" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."class_sessions" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."class_sessions" TO "anon";
GRANT ALL ON TABLE "public"."class_sessions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."classes" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."consultation_notes" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."consultation_notes" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."consultation_notes" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."consultation_participants" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."consultation_participants" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."consultation_participants" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."consultations" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."consultations" TO "anon";
GRANT ALL ON TABLE "public"."consultations" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."exam_scores" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."exam_scores" TO "anon";
GRANT ALL ON TABLE "public"."exam_scores" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."exams" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."exams" TO "anon";
GRANT ALL ON TABLE "public"."exams" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."guardians" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."guardians" TO "anon";
GRANT ALL ON TABLE "public"."guardians" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."homework_submissions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."homework_submissions" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."homework_submissions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_tasks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_tasks" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_tasks" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."homeworks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."homeworks" TO "authenticated";
GRANT SELECT ON TABLE "public"."homeworks" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."in_app_notifications" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."in_app_notifications" TO "anon";
GRANT ALL ON TABLE "public"."in_app_notifications" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kakao_alimtalk_templates" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kakao_alimtalk_templates" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."kakao_alimtalk_templates" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."message_templates" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."message_templates" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."notification_logs" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."notification_logs" TO "anon";
GRANT ALL ON TABLE "public"."notification_logs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ref_activity_types" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ref_activity_types" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ref_activity_types" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ref_exam_categories" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ref_exam_categories" TO "anon";
GRANT ALL ON TABLE "public"."ref_exam_categories" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ref_roles" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ref_roles" TO "anon";
GRANT ALL ON TABLE "public"."ref_roles" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."report_reads" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."report_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."report_reads" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."report_sends" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."report_sends" TO "authenticated";
GRANT ALL ON TABLE "public"."report_sends" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."report_templates" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."report_templates" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."report_templates" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reports" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."shared_alimtalk_templates" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."shared_alimtalk_templates" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."shared_alimtalk_templates" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."short_urls" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."short_urls" TO "authenticated";
GRANT ALL ON TABLE "public"."short_urls" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."staff_invites" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."staff_invites" TO "anon";
GRANT ALL ON TABLE "public"."staff_invites" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."staff_invitations" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."staff_invitations" TO "anon";
GRANT ALL ON TABLE "public"."staff_invitations" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_activity_logs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_activity_logs" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_activity_logs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_change_logs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_change_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."student_change_logs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_guardians" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_guardians" TO "anon";
GRANT ALL ON TABLE "public"."student_guardians" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_schedules" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_schedules" TO "anon";
GRANT ALL ON TABLE "public"."student_schedules" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_textbooks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_textbooks" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_textbooks" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_todos" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_todos" TO "authenticated";
GRANT SELECT ON TABLE "public"."student_todos" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_todos_legacy" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_todos_legacy" TO "anon";
GRANT ALL ON TABLE "public"."student_todos_legacy" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."students" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."users" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."students_requiring_retest" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."students_requiring_retest" TO "authenticated";
GRANT SELECT ON TABLE "public"."students_requiring_retest" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."subjects" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."subjects" TO "anon";
GRANT ALL ON TABLE "public"."subjects" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."subject_statistics" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."subject_statistics" TO "authenticated";
GRANT SELECT ON TABLE "public"."subject_statistics" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."support_tickets" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."system_announcements" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."system_announcements" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."system_announcements" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."teaching_resources" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."teaching_resources" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."teaching_resources" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_codes" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_codes" TO "anon";
GRANT ALL ON TABLE "public"."tenant_codes" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_event_subscriptions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_event_subscriptions" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_event_subscriptions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_messaging_config" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_messaging_config" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_messaging_config" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenants" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbook_progress" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbook_progress" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbook_progress" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbook_units" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbook_units" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbook_units" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbooks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbooks" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbooks" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."todo_templates" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."todo_templates" TO "anon";
GRANT ALL ON TABLE "public"."todo_templates" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."todos" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."todos" TO "anon";
GRANT ALL ON TABLE "public"."todos" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_student_siblings" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_student_siblings" TO "anon";
GRANT ALL ON TABLE "public"."v_student_siblings" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";




RESET ALL;
