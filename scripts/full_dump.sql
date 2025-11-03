


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


CREATE SCHEMA IF NOT EXISTS "auth";


ALTER SCHEMA "auth" OWNER TO "supabase_admin";


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "auth"."aal_level" AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE "auth"."aal_level" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."code_challenge_method" AS ENUM (
    's256',
    'plain'
);


ALTER TYPE "auth"."code_challenge_method" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_status" AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE "auth"."factor_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."factor_type" AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE "auth"."factor_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_authorization_status" AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE "auth"."oauth_authorization_status" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_client_type" AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE "auth"."oauth_client_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_registration_type" AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE "auth"."oauth_registration_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."oauth_response_type" AS ENUM (
    'code'
);


ALTER TYPE "auth"."oauth_response_type" OWNER TO "supabase_auth_admin";


CREATE TYPE "auth"."one_time_token_type" AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE "auth"."one_time_token_type" OWNER TO "supabase_auth_admin";


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
    'email'
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


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "auth"."email"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION "auth"."email"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."email"() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';



CREATE OR REPLACE FUNCTION "auth"."jwt"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION "auth"."jwt"() OWNER TO "supabase_auth_admin";


CREATE OR REPLACE FUNCTION "auth"."role"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION "auth"."role"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."role"() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';



CREATE OR REPLACE FUNCTION "auth"."uid"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION "auth"."uid"() OWNER TO "supabase_auth_admin";


COMMENT ON FUNCTION "auth"."uid"() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';



CREATE OR REPLACE FUNCTION "public"."check_and_mark_retest"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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



CREATE OR REPLACE FUNCTION "public"."fn_student_tasks_normalize_dow"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.due_day_of_week = 0 THEN
    NEW.due_day_of_week := 7;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."fn_student_tasks_normalize_dow"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_subject_scores"("p_student_id" "uuid", "p_year_month" "text") RETURNS TABLE("subject_id" "uuid", "subject_name" "text", "subject_code" "text", "avg_score" numeric, "total_exams" bigint, "improvement_from_prev_month" numeric)
    LANGUAGE "plpgsql" STABLE
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
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_student_detail"("p_student_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_student_detail"("p_student_id" "uuid", "p_tenant_id" "uuid") IS 'Returns complete student detail data including related records and calculated KPIs.
Requires student_id and tenant_id for security.';



CREATE OR REPLACE FUNCTION "public"."log_student_activity"("p_tenant_id" "uuid", "p_student_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_activity_date" timestamp with time zone DEFAULT "now"(), "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
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



CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
    NEW.updated_at := now();
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."show_current_user"() RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select current_user::text;
$$;


ALTER FUNCTION "public"."show_current_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."add_prefixes"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_rows_deleted integer;
BEGIN
    LOOP
        WITH candidates AS (
            SELECT DISTINCT
                t.bucket_id,
                unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        ),
        uniq AS (
             SELECT
                 bucket_id,
                 name,
                 storage.get_level(name) AS level
             FROM candidates
             WHERE name <> ''
             GROUP BY bucket_id, name
        ),
        leaf AS (
             SELECT
                 p.bucket_id,
                 p.name,
                 p.level
             FROM storage.prefixes AS p
                  JOIN uniq AS u
                       ON u.bucket_id = p.bucket_id
                           AND u.name = p.name
                           AND u.level = p.level
             WHERE NOT EXISTS (
                 SELECT 1
                 FROM storage.objects AS o
                 WHERE o.bucket_id = p.bucket_id
                   AND o.level = p.level + 1
                   AND o.name COLLATE "C" LIKE p.name || '/%'
             )
             AND NOT EXISTS (
                 SELECT 1
                 FROM storage.prefixes AS c
                 WHERE c.bucket_id = p.bucket_id
                   AND c.level = p.level + 1
                   AND c.name COLLATE "C" LIKE p.name || '/%'
             )
        )
        DELETE
        FROM storage.prefixes AS p
            USING leaf AS l
        WHERE p.bucket_id = l.bucket_id
          AND p.name = l.name
          AND p.level = l.level;

        GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
        EXIT WHEN v_rows_deleted = 0;
    END LOOP;
END;
$$;


ALTER FUNCTION "storage"."delete_leaf_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix"("_bucket_id" "text", "_name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."delete_prefix_hierarchy_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$$;


ALTER FUNCTION "storage"."delete_prefix_hierarchy_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_level"("name" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
SELECT array_length(string_to_array("name", '/'), 1);
$$;


ALTER FUNCTION "storage"."get_level"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefix"("name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $_$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$_$;


ALTER FUNCTION "storage"."get_prefix"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_prefixes"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE STRICT
    AS $$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$$;


ALTER FUNCTION "storage"."get_prefixes"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket text;
    v_top text;
BEGIN
    FOR v_bucket, v_top IN
        SELECT DISTINCT t.bucket_id,
            split_part(t.name, '/', 1) AS top
        FROM unnest(bucket_ids, names) AS t(bucket_id, name)
        WHERE t.name <> ''
        ORDER BY 1, 2
        LOOP
            PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket || '/' || v_top, 0));
        END LOOP;
END;
$$;


ALTER FUNCTION "storage"."lock_top_prefixes"("bucket_ids" "text"[], "names" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_insert_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_insert_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    -- NEW - OLD (destinations to create prefixes for)
    v_add_bucket_ids text[];
    v_add_names      text[];

    -- OLD - NEW (sources to prune)
    v_src_bucket_ids text[];
    v_src_names      text[];
BEGIN
    IF TG_OP <> 'UPDATE' THEN
        RETURN NULL;
    END IF;

    -- 1) Compute NEW−OLD (added paths) and OLD−NEW (moved-away paths)
    WITH added AS (
        SELECT n.bucket_id, n.name
        FROM new_rows n
        WHERE n.name <> '' AND position('/' in n.name) > 0
        EXCEPT
        SELECT o.bucket_id, o.name FROM old_rows o WHERE o.name <> ''
    ),
    moved AS (
         SELECT o.bucket_id, o.name
         FROM old_rows o
         WHERE o.name <> ''
         EXCEPT
         SELECT n.bucket_id, n.name FROM new_rows n WHERE n.name <> ''
    )
    SELECT
        -- arrays for ADDED (dest) in stable order
        COALESCE( (SELECT array_agg(a.bucket_id ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        COALESCE( (SELECT array_agg(a.name      ORDER BY a.bucket_id, a.name) FROM added a), '{}' ),
        -- arrays for MOVED (src) in stable order
        COALESCE( (SELECT array_agg(m.bucket_id ORDER BY m.bucket_id, m.name) FROM moved m), '{}' ),
        COALESCE( (SELECT array_agg(m.name      ORDER BY m.bucket_id, m.name) FROM moved m), '{}' )
    INTO v_add_bucket_ids, v_add_names, v_src_bucket_ids, v_src_names;

    -- Nothing to do?
    IF (array_length(v_add_bucket_ids, 1) IS NULL) AND (array_length(v_src_bucket_ids, 1) IS NULL) THEN
        RETURN NULL;
    END IF;

    -- 2) Take per-(bucket, top) locks: ALL prefixes in consistent global order to prevent deadlocks
    DECLARE
        v_all_bucket_ids text[];
        v_all_names text[];
    BEGIN
        -- Combine source and destination arrays for consistent lock ordering
        v_all_bucket_ids := COALESCE(v_src_bucket_ids, '{}') || COALESCE(v_add_bucket_ids, '{}');
        v_all_names := COALESCE(v_src_names, '{}') || COALESCE(v_add_names, '{}');

        -- Single lock call ensures consistent global ordering across all transactions
        IF array_length(v_all_bucket_ids, 1) IS NOT NULL THEN
            PERFORM storage.lock_top_prefixes(v_all_bucket_ids, v_all_names);
        END IF;
    END;

    -- 3) Create destination prefixes (NEW−OLD) BEFORE pruning sources
    IF array_length(v_add_bucket_ids, 1) IS NOT NULL THEN
        WITH candidates AS (
            SELECT DISTINCT t.bucket_id, unnest(storage.get_prefixes(t.name)) AS name
            FROM unnest(v_add_bucket_ids, v_add_names) AS t(bucket_id, name)
            WHERE name <> ''
        )
        INSERT INTO storage.prefixes (bucket_id, name)
        SELECT c.bucket_id, c.name
        FROM candidates c
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4) Prune source prefixes bottom-up for OLD−NEW
    IF array_length(v_src_bucket_ids, 1) IS NOT NULL THEN
        -- re-entrancy guard so DELETE on prefixes won't recurse
        IF current_setting('storage.gc.prefixes', true) <> '1' THEN
            PERFORM set_config('storage.gc.prefixes', '1', true);
        END IF;

        PERFORM storage.delete_leaf_prefixes(v_src_bucket_ids, v_src_names);
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."objects_update_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_level_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Set the new level
        NEW."level" := "storage"."get_level"(NEW."name");
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_level_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."objects_update_prefix_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."objects_update_prefix_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_delete_cleanup"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_bucket_ids text[];
    v_names      text[];
BEGIN
    IF current_setting('storage.gc.prefixes', true) = '1' THEN
        RETURN NULL;
    END IF;

    PERFORM set_config('storage.gc.prefixes', '1', true);

    SELECT COALESCE(array_agg(d.bucket_id), '{}'),
           COALESCE(array_agg(d.name), '{}')
    INTO v_bucket_ids, v_names
    FROM deleted AS d
    WHERE d.name <> '';

    PERFORM storage.lock_top_prefixes(v_bucket_ids, v_names);
    PERFORM storage.delete_leaf_prefixes(v_bucket_ids, v_names);

    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."prefixes_delete_cleanup"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."prefixes_insert_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$$;


ALTER FUNCTION "storage"."prefixes_insert_trigger"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_legacy_v1"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search_v1_optimised"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    sort_col text;
    sort_ord text;
    cursor_op text;
    cursor_expr text;
    sort_expr text;
BEGIN
    -- Validate sort_order
    sort_ord := lower(sort_order);
    IF sort_ord NOT IN ('asc', 'desc') THEN
        sort_ord := 'asc';
    END IF;

    -- Determine cursor comparison operator
    IF sort_ord = 'asc' THEN
        cursor_op := '>';
    ELSE
        cursor_op := '<';
    END IF;
    
    sort_col := lower(sort_column);
    -- Validate sort column  
    IF sort_col IN ('updated_at', 'created_at') THEN
        cursor_expr := format(
            '($5 = '''' OR ROW(date_trunc(''milliseconds'', %I), name COLLATE "C") %s ROW(COALESCE(NULLIF($6, '''')::timestamptz, ''epoch''::timestamptz), $5))',
            sort_col, cursor_op
        );
        sort_expr := format(
            'COALESCE(date_trunc(''milliseconds'', %I), ''epoch''::timestamptz) %s, name COLLATE "C" %s',
            sort_col, sort_ord, sort_ord
        );
    ELSE
        cursor_expr := format('($5 = '''' OR name COLLATE "C" %s $5)', cursor_op);
        sort_expr := format('name COLLATE "C" %s', sort_ord);
    END IF;

    RETURN QUERY EXECUTE format(
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    NULL::uuid AS id,
                    updated_at,
                    created_at,
                    NULL::timestamptz AS last_accessed_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
            UNION ALL
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name,
                    id,
                    updated_at,
                    created_at,
                    last_accessed_at,
                    metadata
                FROM storage.objects
                WHERE name COLLATE "C" LIKE $1 || '%%'
                    AND bucket_id = $2
                    AND level = $4
                    AND %s
                ORDER BY %s
                LIMIT $3
            )
        ) obj
        ORDER BY %s
        LIMIT $3
        $sql$,
        cursor_expr,    -- prefixes WHERE
        sort_expr,      -- prefixes ORDER BY
        cursor_expr,    -- objects WHERE
        sort_expr,      -- objects ORDER BY
        sort_expr       -- final ORDER BY
    )
    USING prefix, bucket_name, limits, levels, start_after, sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "auth"."audit_log_entries" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "payload" json,
    "created_at" timestamp with time zone,
    "ip_address" character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE "auth"."audit_log_entries" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."audit_log_entries" IS 'Auth: Audit trail for user actions.';



CREATE TABLE IF NOT EXISTS "auth"."flow_state" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "auth_code" "text" NOT NULL,
    "code_challenge_method" "auth"."code_challenge_method" NOT NULL,
    "code_challenge" "text" NOT NULL,
    "provider_type" "text" NOT NULL,
    "provider_access_token" "text",
    "provider_refresh_token" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "authentication_method" "text" NOT NULL,
    "auth_code_issued_at" timestamp with time zone
);


ALTER TABLE "auth"."flow_state" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."flow_state" IS 'stores metadata for pkce logins';



CREATE TABLE IF NOT EXISTS "auth"."identities" (
    "provider_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "identity_data" "jsonb" NOT NULL,
    "provider" "text" NOT NULL,
    "last_sign_in_at" timestamp with time zone,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "email" "text" GENERATED ALWAYS AS ("lower"(("identity_data" ->> 'email'::"text"))) STORED,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL
);


ALTER TABLE "auth"."identities" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."identities" IS 'Auth: Stores identities associated to a user.';



COMMENT ON COLUMN "auth"."identities"."email" IS 'Auth: Email is a generated column that references the optional email property in the identity_data';



CREATE TABLE IF NOT EXISTS "auth"."instances" (
    "id" "uuid" NOT NULL,
    "uuid" "uuid",
    "raw_base_config" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "auth"."instances" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."instances" IS 'Auth: Manages users across multiple sites.';



CREATE TABLE IF NOT EXISTS "auth"."mfa_amr_claims" (
    "session_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "authentication_method" "text" NOT NULL,
    "id" "uuid" NOT NULL
);


ALTER TABLE "auth"."mfa_amr_claims" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_amr_claims" IS 'auth: stores authenticator method reference claims for multi factor authentication';



CREATE TABLE IF NOT EXISTS "auth"."mfa_challenges" (
    "id" "uuid" NOT NULL,
    "factor_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "verified_at" timestamp with time zone,
    "ip_address" "inet" NOT NULL,
    "otp_code" "text",
    "web_authn_session_data" "jsonb"
);


ALTER TABLE "auth"."mfa_challenges" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_challenges" IS 'auth: stores metadata about challenge requests made';



CREATE TABLE IF NOT EXISTS "auth"."mfa_factors" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "friendly_name" "text",
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "updated_at" timestamp with time zone NOT NULL,
    "secret" "text",
    "phone" "text",
    "last_challenged_at" timestamp with time zone,
    "web_authn_credential" "jsonb",
    "web_authn_aaguid" "uuid"
);


ALTER TABLE "auth"."mfa_factors" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."mfa_factors" IS 'auth: stores metadata about factors';



CREATE TABLE IF NOT EXISTS "auth"."oauth_authorizations" (
    "id" "uuid" NOT NULL,
    "authorization_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "redirect_uri" "text" NOT NULL,
    "scope" "text" NOT NULL,
    "state" "text",
    "resource" "text",
    "code_challenge" "text",
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" DEFAULT 'code'::"auth"."oauth_response_type" NOT NULL,
    "status" "auth"."oauth_authorization_status" DEFAULT 'pending'::"auth"."oauth_authorization_status" NOT NULL,
    "authorization_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '00:03:00'::interval) NOT NULL,
    "approved_at" timestamp with time zone,
    CONSTRAINT "oauth_authorizations_authorization_code_length" CHECK (("char_length"("authorization_code") <= 255)),
    CONSTRAINT "oauth_authorizations_code_challenge_length" CHECK (("char_length"("code_challenge") <= 128)),
    CONSTRAINT "oauth_authorizations_expires_at_future" CHECK (("expires_at" > "created_at")),
    CONSTRAINT "oauth_authorizations_redirect_uri_length" CHECK (("char_length"("redirect_uri") <= 2048)),
    CONSTRAINT "oauth_authorizations_resource_length" CHECK (("char_length"("resource") <= 2048)),
    CONSTRAINT "oauth_authorizations_scope_length" CHECK (("char_length"("scope") <= 4096)),
    CONSTRAINT "oauth_authorizations_state_length" CHECK (("char_length"("state") <= 4096))
);


ALTER TABLE "auth"."oauth_authorizations" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_clients" (
    "id" "uuid" NOT NULL,
    "client_secret_hash" "text",
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" "text" NOT NULL,
    "grant_types" "text" NOT NULL,
    "client_name" "text",
    "client_uri" "text",
    "logo_uri" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "client_type" "auth"."oauth_client_type" DEFAULT 'confidential'::"auth"."oauth_client_type" NOT NULL,
    CONSTRAINT "oauth_clients_client_name_length" CHECK (("char_length"("client_name") <= 1024)),
    CONSTRAINT "oauth_clients_client_uri_length" CHECK (("char_length"("client_uri") <= 2048)),
    CONSTRAINT "oauth_clients_logo_uri_length" CHECK (("char_length"("logo_uri") <= 2048))
);


ALTER TABLE "auth"."oauth_clients" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."oauth_consents" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "scopes" "text" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    CONSTRAINT "oauth_consents_revoked_after_granted" CHECK ((("revoked_at" IS NULL) OR ("revoked_at" >= "granted_at"))),
    CONSTRAINT "oauth_consents_scopes_length" CHECK (("char_length"("scopes") <= 2048)),
    CONSTRAINT "oauth_consents_scopes_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "scopes")) > 0))
);


ALTER TABLE "auth"."oauth_consents" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."one_time_tokens" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" "text" NOT NULL,
    "relates_to" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "one_time_tokens_token_hash_check" CHECK (("char_length"("token_hash") > 0))
);


ALTER TABLE "auth"."one_time_tokens" OWNER TO "supabase_auth_admin";


CREATE TABLE IF NOT EXISTS "auth"."refresh_tokens" (
    "instance_id" "uuid",
    "id" bigint NOT NULL,
    "token" character varying(255),
    "user_id" character varying(255),
    "revoked" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "parent" character varying(255),
    "session_id" "uuid"
);


ALTER TABLE "auth"."refresh_tokens" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."refresh_tokens" IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';



CREATE SEQUENCE IF NOT EXISTS "auth"."refresh_tokens_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNER TO "supabase_auth_admin";


ALTER SEQUENCE "auth"."refresh_tokens_id_seq" OWNED BY "auth"."refresh_tokens"."id";



CREATE TABLE IF NOT EXISTS "auth"."saml_providers" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "entity_id" "text" NOT NULL,
    "metadata_xml" "text" NOT NULL,
    "metadata_url" "text",
    "attribute_mapping" "jsonb",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "name_id_format" "text",
    CONSTRAINT "entity_id not empty" CHECK (("char_length"("entity_id") > 0)),
    CONSTRAINT "metadata_url not empty" CHECK ((("metadata_url" = NULL::"text") OR ("char_length"("metadata_url") > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK (("char_length"("metadata_xml") > 0))
);


ALTER TABLE "auth"."saml_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_providers" IS 'Auth: Manages SAML Identity Provider connections.';



CREATE TABLE IF NOT EXISTS "auth"."saml_relay_states" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "request_id" "text" NOT NULL,
    "for_email" "text",
    "redirect_to" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "flow_state_id" "uuid",
    CONSTRAINT "request_id not empty" CHECK (("char_length"("request_id") > 0))
);


ALTER TABLE "auth"."saml_relay_states" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."saml_relay_states" IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';



CREATE TABLE IF NOT EXISTS "auth"."schema_migrations" (
    "version" character varying(255) NOT NULL
);


ALTER TABLE "auth"."schema_migrations" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."schema_migrations" IS 'Auth: Manages updates to the auth system.';



CREATE TABLE IF NOT EXISTS "auth"."sessions" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "factor_id" "uuid",
    "aal" "auth"."aal_level",
    "not_after" timestamp with time zone,
    "refreshed_at" timestamp without time zone,
    "user_agent" "text",
    "ip" "inet",
    "tag" "text",
    "oauth_client_id" "uuid"
);


ALTER TABLE "auth"."sessions" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sessions" IS 'Auth: Stores session data associated to a user.';



COMMENT ON COLUMN "auth"."sessions"."not_after" IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';



CREATE TABLE IF NOT EXISTS "auth"."sso_domains" (
    "id" "uuid" NOT NULL,
    "sso_provider_id" "uuid" NOT NULL,
    "domain" "text" NOT NULL,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK (("char_length"("domain") > 0))
);


ALTER TABLE "auth"."sso_domains" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_domains" IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';



CREATE TABLE IF NOT EXISTS "auth"."sso_providers" (
    "id" "uuid" NOT NULL,
    "resource_id" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "disabled" boolean,
    CONSTRAINT "resource_id not empty" CHECK ((("resource_id" = NULL::"text") OR ("char_length"("resource_id") > 0)))
);


ALTER TABLE "auth"."sso_providers" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."sso_providers" IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';



COMMENT ON COLUMN "auth"."sso_providers"."resource_id" IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';



CREATE TABLE IF NOT EXISTS "auth"."users" (
    "instance_id" "uuid",
    "id" "uuid" NOT NULL,
    "aud" character varying(255),
    "role" character varying(255),
    "email" character varying(255),
    "encrypted_password" character varying(255),
    "email_confirmed_at" timestamp with time zone,
    "invited_at" timestamp with time zone,
    "confirmation_token" character varying(255),
    "confirmation_sent_at" timestamp with time zone,
    "recovery_token" character varying(255),
    "recovery_sent_at" timestamp with time zone,
    "email_change_token_new" character varying(255),
    "email_change" character varying(255),
    "email_change_sent_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "raw_app_meta_data" "jsonb",
    "raw_user_meta_data" "jsonb",
    "is_super_admin" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "phone" "text" DEFAULT NULL::character varying,
    "phone_confirmed_at" timestamp with time zone,
    "phone_change" "text" DEFAULT ''::character varying,
    "phone_change_token" character varying(255) DEFAULT ''::character varying,
    "phone_change_sent_at" timestamp with time zone,
    "confirmed_at" timestamp with time zone GENERATED ALWAYS AS (LEAST("email_confirmed_at", "phone_confirmed_at")) STORED,
    "email_change_token_current" character varying(255) DEFAULT ''::character varying,
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamp with time zone,
    "reauthentication_token" character varying(255) DEFAULT ''::character varying,
    "reauthentication_sent_at" timestamp with time zone,
    "is_sso_user" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_anonymous" boolean DEFAULT false NOT NULL,
    CONSTRAINT "users_email_change_confirm_status_check" CHECK ((("email_change_confirm_status" >= 0) AND ("email_change_confirm_status" <= 2)))
);


ALTER TABLE "auth"."users" OWNER TO "supabase_auth_admin";


COMMENT ON TABLE "auth"."users" IS 'Auth: Stores user login data within a secure schema.';



COMMENT ON COLUMN "auth"."users"."is_sso_user" IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';



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
    CONSTRAINT "attendance_status_check" CHECK (("status" = ANY (ARRAY['present'::"text", 'absent'::"text", 'late'::"text", 'excused'::"text", 'left_early'::"text"])))
);


ALTER TABLE "public"."attendance" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."book_lendings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "book_id" "uuid" NOT NULL,
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


CREATE TABLE IF NOT EXISTS "public"."books" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "author" "text",
    "barcode" "text",
    "meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."books" OWNER TO "postgres";


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
    "deleted_at" timestamp with time zone
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
    CONSTRAINT "exams_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'in_progress'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."exams" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exams"."passing_score" IS '합격 점수 (%). 이 점수 미달 시 자동으로 재시험 대상이 됨';



COMMENT ON COLUMN "public"."exams"."subject_id" IS '과목 ID (Voca, Reading, Speaking 등)';



COMMENT ON COLUMN "public"."exams"."status" IS '시험 상태: scheduled(예정), in_progress(진행중), completed(완료), cancelled(취소)';



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
    "deleted_at" timestamp with time zone
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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."in_app_notifications" OWNER TO "postgres";


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
    "status" "public"."notification_status"
);


ALTER TABLE "public"."notification_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_logs" IS '알림 전송 로그';



COMMENT ON COLUMN "public"."notification_logs"."notification_type" IS '전송 채널: sms / email';



COMMENT ON COLUMN "public"."notification_logs"."status" IS '전송 상태: pending / sent / failed';



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
    CONSTRAINT "report_sends_message_type_check" CHECK (("message_type" = ANY (ARRAY['SMS'::"text", 'LMS'::"text"]))),
    CONSTRAINT "report_sends_recipient_type_check" CHECK (("recipient_type" = ANY (ARRAY['guardian'::"text", 'student'::"text"]))),
    CONSTRAINT "report_sends_send_status_check" CHECK (("send_status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'delivered'::"text"])))
);


ALTER TABLE "public"."report_sends" OWNER TO "postgres";


COMMENT ON TABLE "public"."report_sends" IS '리포트 문자 발송 이력 및 공유 링크 관리';



COMMENT ON COLUMN "public"."report_sends"."share_link_id" IS '공유 링크 고유 ID (UUID 기반)';



COMMENT ON COLUMN "public"."report_sends"."link_expires_at" IS '링크 만료일 (null이면 무제한)';



COMMENT ON COLUMN "public"."report_sends"."aligo_msgid" IS '알리고 API 응답 msgid (발송 추적용)';



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
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."tenant_messaging_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_messaging_config" IS 'Tenant-specific messaging service API credentials';



COMMENT ON COLUMN "public"."tenant_messaging_config"."provider" IS 'SMS/알림톡 서비스 제공사';



COMMENT ON COLUMN "public"."tenant_messaging_config"."aligo_sender_phone" IS '알리고에 등록된 발신번호';



COMMENT ON COLUMN "public"."tenant_messaging_config"."is_active" IS '서비스 활성화 여부';



COMMENT ON COLUMN "public"."tenant_messaging_config"."is_verified" IS '테스트 발송으로 인증 완료 여부';



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
    CONSTRAINT "chk_textbooks_price_nonneg" CHECK ((("price" IS NULL) OR ("price" >= 0)))
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


CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb",
    "level" integer
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."prefixes" (
    "bucket_id" "text" NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "level" integer GENERATED ALWAYS AS ("storage"."get_level"("name")) STORED NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "storage"."prefixes" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "auth"."refresh_tokens" ALTER COLUMN "id" SET DEFAULT "nextval"('"auth"."refresh_tokens_id_seq"'::"regclass");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "amr_id_pk" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."audit_log_entries"
    ADD CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."flow_state"
    ADD CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_provider_id_provider_unique" UNIQUE ("provider_id", "provider");



ALTER TABLE ONLY "auth"."instances"
    ADD CONSTRAINT "instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_authentication_method_pkey" UNIQUE ("session_id", "authentication_method");



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_last_challenged_at_key" UNIQUE ("last_challenged_at");



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_code_key" UNIQUE ("authorization_code");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_authorization_id_key" UNIQUE ("authorization_id");



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_clients"
    ADD CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_client_unique" UNIQUE ("user_id", "client_id");



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_unique" UNIQUE ("token");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_entity_id_key" UNIQUE ("entity_id");



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."sso_providers"
    ADD CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "auth"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attendance"
    ADD CONSTRAINT "attendance_session_id_student_id_key" UNIQUE ("session_id", "student_id");



ALTER TABLE ONLY "public"."attendance_sessions"
    ADD CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."book_lendings"
    ADD CONSTRAINT "book_lendings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."books"
    ADD CONSTRAINT "books_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."books"
    ADD CONSTRAINT "books_tenant_id_barcode_key" UNIQUE ("tenant_id", "barcode");



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



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."teaching_resources"
    ADD CONSTRAINT "teaching_resources_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_codes"
    ADD CONSTRAINT "tenant_codes_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_pkey" PRIMARY KEY ("bucket_id", "level", "name");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries" USING "btree" ("instance_id");



CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users" USING "btree" ("confirmation_token") WHERE (("confirmation_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users" USING "btree" ("email_change_token_current") WHERE (("email_change_token_current")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users" USING "btree" ("email_change_token_new") WHERE (("email_change_token_new")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors" USING "btree" ("user_id", "created_at");



CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state" USING "btree" ("created_at" DESC);



CREATE INDEX "identities_email_idx" ON "auth"."identities" USING "btree" ("email" "text_pattern_ops");



COMMENT ON INDEX "auth"."identities_email_idx" IS 'Auth: Ensures indexed queries on the email column';



CREATE INDEX "identities_user_id_idx" ON "auth"."identities" USING "btree" ("user_id");



CREATE INDEX "idx_auth_code" ON "auth"."flow_state" USING "btree" ("auth_code");



CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state" USING "btree" ("user_id", "authentication_method");



CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges" USING "btree" ("created_at" DESC);



CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors" USING "btree" ("friendly_name", "user_id") WHERE (TRIM(BOTH FROM "friendly_name") <> ''::"text");



CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors" USING "btree" ("user_id");



CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations" USING "btree" ("expires_at") WHERE ("status" = 'pending'::"auth"."oauth_authorization_status");



CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients" USING "btree" ("deleted_at");



CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents" USING "btree" ("client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "client_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents" USING "btree" ("user_id", "granted_at" DESC);



CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("relates_to");



CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING "hash" ("token_hash");



CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens" USING "btree" ("user_id", "token_type");



CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users" USING "btree" ("reauthentication_token") WHERE (("reauthentication_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users" USING "btree" ("recovery_token") WHERE (("recovery_token")::"text" !~ '^[0-9 ]*$'::"text");



CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id");



CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens" USING "btree" ("instance_id", "user_id");



CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens" USING "btree" ("parent");



CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens" USING "btree" ("session_id", "revoked");



CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens" USING "btree" ("updated_at" DESC);



CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers" USING "btree" ("sso_provider_id");



CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states" USING "btree" ("created_at" DESC);



CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states" USING "btree" ("for_email");



CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states" USING "btree" ("sso_provider_id");



CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions" USING "btree" ("not_after" DESC);



CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions" USING "btree" ("oauth_client_id");



CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "sso_domains_domain_idx" ON "auth"."sso_domains" USING "btree" ("lower"("domain"));



CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains" USING "btree" ("sso_provider_id");



CREATE UNIQUE INDEX "sso_providers_resource_id_idx" ON "auth"."sso_providers" USING "btree" ("lower"("resource_id"));



CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers" USING "btree" ("resource_id" "text_pattern_ops");



CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors" USING "btree" ("user_id", "phone");



CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions" USING "btree" ("user_id", "created_at");



CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users" USING "btree" ("email") WHERE ("is_sso_user" = false);



COMMENT ON INDEX "auth"."users_email_partial_key" IS 'Auth: A partial unique index that applies only when is_sso_user is false';



CREATE INDEX "users_instance_id_email_idx" ON "auth"."users" USING "btree" ("instance_id", "lower"(("email")::"text"));



CREATE INDEX "users_instance_id_idx" ON "auth"."users" USING "btree" ("instance_id");



CREATE INDEX "users_is_anonymous_idx" ON "auth"."users" USING "btree" ("is_anonymous");



CREATE INDEX "idx_activity_logs_date" ON "public"."student_activity_logs" USING "btree" ("activity_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_activity_logs_metadata" ON "public"."student_activity_logs" USING "gin" ("metadata") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_activity_logs_student" ON "public"."student_activity_logs" USING "btree" ("student_id", "activity_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_activity_logs_tenant" ON "public"."student_activity_logs" USING "btree" ("tenant_id", "activity_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_activity_logs_type" ON "public"."student_activity_logs" USING "btree" ("activity_type") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_att_sess_tenant_date" ON "public"."attendance_sessions" USING "btree" ("tenant_id", "session_date" DESC);



CREATE INDEX "idx_att_tenant_session_student" ON "public"."attendance" USING "btree" ("tenant_id", "session_id", "student_id");



CREATE INDEX "idx_books_barcode" ON "public"."books" USING "btree" ("barcode") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_books_tenant_active" ON "public"."books" USING "btree" ("tenant_id", "active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_calendar_tenant_time" ON "public"."calendar_events" USING "btree" ("tenant_id", "start_at", "end_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_calendar_type" ON "public"."calendar_events" USING "btree" ("event_type");



CREATE INDEX "idx_class_sessions_class" ON "public"."class_sessions" USING "btree" ("class_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_class_sessions_tenant_date" ON "public"."class_sessions" USING "btree" ("tenant_id", "session_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_classes_active" ON "public"."classes" USING "btree" ("tenant_id", "active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_classes_instructor" ON "public"."classes" USING "btree" ("instructor_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_classes_subject_id" ON "public"."classes" USING "btree" ("subject_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_classes_tenant_status" ON "public"."classes" USING "btree" ("tenant_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consult_student" ON "public"."consultations" USING "btree" ("student_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consult_tenant_date" ON "public"."consultations" USING "btree" ("tenant_id", "consultation_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consultation_notes_category" ON "public"."consultation_notes" USING "btree" ("tenant_id", "category") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consultation_notes_consultation" ON "public"."consultation_notes" USING "btree" ("consultation_id", "note_order") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consultations_conducted_by_date" ON "public"."consultations" USING "btree" ("conducted_by", "consultation_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consultations_converted" ON "public"."consultations" USING "btree" ("converted_to_student_id") WHERE (("deleted_at" IS NULL) AND ("converted_to_student_id" IS NOT NULL));



CREATE INDEX "idx_consultations_follow_up" ON "public"."consultations" USING "btree" ("tenant_id", "follow_up_required", "next_consultation_date") WHERE (("deleted_at" IS NULL) AND ("follow_up_required" = true));



CREATE INDEX "idx_consultations_lead" ON "public"."consultations" USING "btree" ("tenant_id", "is_lead", "consultation_date" DESC) WHERE (("deleted_at" IS NULL) AND ("is_lead" = true));



CREATE INDEX "idx_consultations_student_date" ON "public"."consultations" USING "btree" ("student_id", "consultation_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_consultations_tenant_date" ON "public"."consultations" USING "btree" ("tenant_id", "consultation_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_enroll_end_date" ON "public"."class_enrollments" USING "btree" ("tenant_id", "end_date");



CREATE INDEX "idx_enroll_tenant_class_student" ON "public"."class_enrollments" USING "btree" ("tenant_id", "class_id", "student_id");



CREATE INDEX "idx_exam_scores_exam" ON "public"."exam_scores" USING "btree" ("exam_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exam_scores_percentage" ON "public"."exam_scores" USING "btree" ("percentage");



CREATE INDEX "idx_exam_scores_status" ON "public"."exam_scores" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exam_scores_student" ON "public"."exam_scores" USING "btree" ("student_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exams_category" ON "public"."exams" USING "btree" ("category_code") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exams_class" ON "public"."exams" USING "btree" ("class_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exams_status" ON "public"."exams" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exams_subject" ON "public"."exams" USING "btree" ("subject_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_exams_tenant_date" ON "public"."exams" USING "btree" ("tenant_id", "exam_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_guardians_tenant" ON "public"."guardians" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_guardians_tenant_email" ON "public"."guardians" USING "btree" ("tenant_id", "email") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_guardians_tenant_phone" ON "public"."guardians" USING "btree" ("tenant_id", "phone") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_guardians_user_tenant" ON "public"."guardians" USING "btree" ("user_id", "tenant_id");



CREATE INDEX "idx_homework_submissions_grading" ON "public"."homework_submissions" USING "btree" ("tenant_id", "graded_at" DESC) WHERE ("graded_at" IS NOT NULL);



CREATE INDEX "idx_homework_submissions_tenant_time" ON "public"."homework_submissions" USING "btree" ("tenant_id", "submitted_at" DESC);



CREATE INDEX "idx_lendings_book" ON "public"."book_lendings" USING "btree" ("book_id");



CREATE INDEX "idx_lendings_student" ON "public"."book_lendings" USING "btree" ("student_id");



CREATE INDEX "idx_lendings_tenant_dates" ON "public"."book_lendings" USING "btree" ("tenant_id", "borrowed_at" DESC, "due_date" DESC);



CREATE INDEX "idx_message_templates_deleted_at" ON "public"."message_templates" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_message_templates_tenant" ON "public"."message_templates" USING "btree" ("tenant_id", "deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_message_templates_tenant_id" ON "public"."message_templates" USING "btree" ("tenant_id");



CREATE UNIQUE INDEX "idx_message_templates_tenant_name_unique" ON "public"."message_templates" USING "btree" ("tenant_id", "name") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_message_templates_type" ON "public"."message_templates" USING "btree" ("tenant_id", "type", "category") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_notif_logs_student" ON "public"."notification_logs" USING "btree" ("student_id", "sent_at" DESC);



CREATE INDEX "idx_notif_user_created" ON "public"."in_app_notifications" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_notification_logs_status" ON "public"."notification_logs" USING "btree" ("tenant_id", "status", "sent_at" DESC);



CREATE INDEX "idx_notification_logs_student" ON "public"."notification_logs" USING "btree" ("student_id", "sent_at" DESC);



CREATE INDEX "idx_notification_logs_tenant_time" ON "public"."notification_logs" USING "btree" ("tenant_id", "sent_at" DESC);



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



CREATE INDEX "idx_report_sends_recipient" ON "public"."report_sends" USING "btree" ("recipient_id", "recipient_type") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_sends_report" ON "public"."report_sends" USING "btree" ("report_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_sends_send_status" ON "public"."report_sends" USING "btree" ("tenant_id", "send_status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_sends_share_link" ON "public"."report_sends" USING "btree" ("share_link_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_sends_status" ON "public"."report_sends" USING "btree" ("send_status", "sent_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_report_sends_tenant" ON "public"."report_sends" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



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



CREATE INDEX "idx_short_urls_short_code" ON "public"."short_urls" USING "btree" ("short_code") WHERE (("deleted_at" IS NULL) AND ("is_active" = true));



CREATE INDEX "idx_short_urls_tenant" ON "public"."short_urls" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_staff_inv_expires" ON "public"."staff_invites" USING "btree" ("expires_at");



CREATE INDEX "idx_staff_inv_tenant_email" ON "public"."staff_invites" USING "btree" ("tenant_id", "email");



CREATE INDEX "idx_student_tasks_completed" ON "public"."student_tasks" USING "btree" ("tenant_id", "kind", "completed_at" DESC) WHERE (("deleted_at" IS NULL) AND ("completed_at" IS NOT NULL) AND ("verified_at" IS NULL));



CREATE INDEX "idx_student_tasks_kind_pending" ON "public"."student_tasks" USING "btree" ("tenant_id", "kind", "due_date") WHERE (("deleted_at" IS NULL) AND ("completed_at" IS NULL));



CREATE INDEX "idx_student_tasks_student_due" ON "public"."student_tasks" USING "btree" ("student_id", "due_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_student_tasks_tenant" ON "public"."student_tasks" USING "btree" ("tenant_id", "deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_student_tasks_verified" ON "public"."student_tasks" USING "btree" ("tenant_id", "verified_at" DESC) WHERE (("deleted_at" IS NULL) AND ("verified_at" IS NOT NULL));



CREATE INDEX "idx_student_textbooks_student" ON "public"."student_textbooks" USING "btree" ("student_id", "issue_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_student_textbooks_tenant_student_textbook" ON "public"."student_textbooks" USING "btree" ("tenant_id", "student_id", "textbook_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_student_textbooks_textbook" ON "public"."student_textbooks" USING "btree" ("textbook_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_student_textbooks_unique_in_use" ON "public"."student_textbooks" USING "btree" ("tenant_id", "student_id", "textbook_id") WHERE (("deleted_at" IS NULL) AND ("status" = 'in_use'::"text"));



CREATE INDEX "idx_student_textbooks_unpaid" ON "public"."student_textbooks" USING "btree" ("tenant_id", "paid") WHERE (("deleted_at" IS NULL) AND ("paid" = false));



CREATE INDEX "idx_students_grade" ON "public"."students" USING "btree" ("grade") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_students_name_trgm" ON "public"."students" USING "gin" ("name" "public"."gin_trgm_ops") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_students_tenant_created" ON "public"."students" USING "btree" ("tenant_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_students_user_id" ON "public"."students" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_subjects_tenant_active_sort" ON "public"."subjects" USING "btree" ("tenant_id", "active", "deleted_at", "sort_order");



CREATE INDEX "idx_subjects_tenant_sort" ON "public"."subjects" USING "btree" ("tenant_id", "active", "sort_order");



CREATE INDEX "idx_tenant_messaging_config_active" ON "public"."tenant_messaging_config" USING "btree" ("tenant_id", "is_active") WHERE (("deleted_at" IS NULL) AND ("is_active" = true));



CREATE INDEX "idx_tenant_messaging_config_tenant" ON "public"."tenant_messaging_config" USING "btree" ("tenant_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_tenants_deleted" ON "public"."tenants" USING "btree" ("deleted_at");



CREATE INDEX "idx_tenants_slug" ON "public"."tenants" USING "btree" ("slug") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_textbook_units_tenant_textbook_order" ON "public"."textbook_units" USING "btree" ("tenant_id", "textbook_id", "unit_order") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_textbook_units_unique" ON "public"."textbook_units" USING "btree" ("tenant_id", "textbook_id", "unit_order") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_textbooks_tenant_active" ON "public"."textbooks" USING "btree" ("tenant_id") WHERE (("deleted_at" IS NULL) AND ("is_active" = true));



CREATE INDEX "idx_textbooks_tenant_created_desc" ON "public"."textbooks" USING "btree" ("tenant_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_textbooks_tenant_isbn_unique" ON "public"."textbooks" USING "btree" ("tenant_id", "isbn") WHERE (("deleted_at" IS NULL) AND ("isbn" IS NOT NULL));



CREATE INDEX "idx_tmpl_tenant_active" ON "public"."todo_templates" USING "btree" ("tenant_id", "active");



CREATE INDEX "idx_tmpl_tenant_subject" ON "public"."todo_templates" USING "btree" ("tenant_id", "subject");



CREATE INDEX "idx_todos_completed" ON "public"."student_todos_legacy" USING "btree" ("tenant_id", "completed_at");



CREATE INDEX "idx_todos_student" ON "public"."student_todos_legacy" USING "btree" ("student_id");



CREATE INDEX "idx_todos_tenant_due" ON "public"."student_todos_legacy" USING "btree" ("tenant_id", "due_date");



CREATE INDEX "idx_todos_verified" ON "public"."student_todos_legacy" USING "btree" ("tenant_id", "verified_at");



CREATE INDEX "idx_users_approval" ON "public"."users" USING "btree" ("approval_status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_users_id_tenant" ON "public"."users" USING "btree" ("id", "tenant_id");



CREATE INDEX "idx_users_tenant_role" ON "public"."users" USING "btree" ("tenant_id", "role_code") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uq_sg_primary_per_student" ON "public"."student_guardians" USING "btree" ("student_id") WHERE "is_primary";



CREATE UNIQUE INDEX "uq_students_tenant_code_active" ON "public"."students" USING "btree" ("tenant_id", "student_code") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "uq_subjects_tenant_code_active" ON "public"."subjects" USING "btree" ("tenant_id", "code") WHERE (("deleted_at" IS NULL) AND ("code" IS NOT NULL));



CREATE UNIQUE INDEX "uq_tenant_codes" ON "public"."tenant_codes" USING "btree" ("tenant_id", "code_type", "code");



CREATE UNIQUE INDEX "uq_users_email_active" ON "public"."users" USING "btree" ("email") WHERE (("deleted_at" IS NULL) AND ("email" IS NOT NULL));



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE UNIQUE INDEX "idx_name_bucket_level_unique" ON "storage"."objects" USING "btree" ("name" COLLATE "C", "bucket_id", "level");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_lower_name" ON "storage"."objects" USING "btree" (("path_tokens"["level"]), "lower"("name") "text_pattern_ops", "bucket_id", "level");



CREATE INDEX "idx_prefixes_lower_name" ON "storage"."prefixes" USING "btree" ("bucket_id", "level", (("string_to_array"("name", '/'::"text"))["level"]), "lower"("name") "text_pattern_ops");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "objects_bucket_id_level_idx" ON "storage"."objects" USING "btree" ("bucket_id", "level", "name" COLLATE "C");



CREATE OR REPLACE TRIGGER "set_message_templates_updated_at" BEFORE UPDATE ON "public"."message_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_student_tasks_normalize_dow" BEFORE INSERT OR UPDATE ON "public"."student_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."fn_student_tasks_normalize_dow"();



CREATE OR REPLACE TRIGGER "trg_tenant_messaging_config_set_updated_at" BEFORE UPDATE ON "public"."tenant_messaging_config" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_check_retest" BEFORE INSERT OR UPDATE OF "percentage", "status" ON "public"."exam_scores" FOR EACH ROW EXECUTE FUNCTION "public"."check_and_mark_retest"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "objects_delete_delete_prefix" AFTER DELETE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "objects_insert_create_prefix" BEFORE INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."objects_insert_prefix_trigger"();



CREATE OR REPLACE TRIGGER "objects_update_create_prefix" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW WHEN ((("new"."name" <> "old"."name") OR ("new"."bucket_id" <> "old"."bucket_id"))) EXECUTE FUNCTION "storage"."objects_update_prefix_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_create_hierarchy" BEFORE INSERT ON "storage"."prefixes" FOR EACH ROW WHEN (("pg_trigger_depth"() < 1)) EXECUTE FUNCTION "storage"."prefixes_insert_trigger"();



CREATE OR REPLACE TRIGGER "prefixes_delete_hierarchy" AFTER DELETE ON "storage"."prefixes" FOR EACH ROW EXECUTE FUNCTION "storage"."delete_prefix_hierarchy_trigger"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "auth"."identities"
    ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_amr_claims"
    ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_challenges"
    ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."mfa_factors"
    ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_authorizations"
    ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."oauth_consents"
    ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."one_time_tokens"
    ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_providers"
    ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."saml_relay_states"
    ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "auth"."sso_domains"
    ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."book_lendings"
    ADD CONSTRAINT "book_lendings_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."book_lendings"
    ADD CONSTRAINT "book_lendings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."book_lendings"
    ADD CONSTRAINT "book_lendings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."books"
    ADD CONSTRAINT "books_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "report_sends_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_sends"
    ADD CONSTRAINT "report_sends_short_url_id_fkey" FOREIGN KEY ("short_url_id") REFERENCES "public"."short_urls"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."report_sends"
    ADD CONSTRAINT "report_sends_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."teaching_resources"
    ADD CONSTRAINT "teaching_resources_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."teaching_resources"
    ADD CONSTRAINT "teaching_resources_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_codes"
    ADD CONSTRAINT "tenant_codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."prefixes"
    ADD CONSTRAINT "prefixes_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE "auth"."audit_log_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."flow_state" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."identities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_amr_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."mfa_factors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."one_time_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."refresh_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."saml_relay_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."schema_migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_domains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."sso_providers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Activity types are viewable by all authenticated users" ON "public"."ref_activity_types" FOR SELECT TO "authenticated" USING (("active" = true));



CREATE POLICY "Service role has full access to activity logs" ON "public"."student_activity_logs" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."ref_activity_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ref_exam_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ref_exam_categories_select_policy" ON "public"."ref_exam_categories" FOR SELECT USING (true);



ALTER TABLE "public"."student_activity_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_insert_signup" ON "public"."users" FOR INSERT WITH CHECK ((("id" = "auth"."uid"()) AND ("tenant_id" IS NULL) AND ("role_code" IS NULL) AND ("approval_status" IS NULL) AND ("onboarding_completed" = false)));



CREATE POLICY "users_select_self" ON "public"."users" FOR SELECT USING ((("id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "users_update_self" ON "public"."users" FOR UPDATE USING ((("id" = "auth"."uid"()) AND ("deleted_at" IS NULL))) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can upload student profiles" ON "storage"."objects" FOR INSERT TO "authenticated" WITH CHECK (("bucket_id" = 'student-profiles'::"text"));



CREATE POLICY "Public read access to student profiles" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'student-profiles'::"text"));



CREATE POLICY "Users can delete their tenant's student profiles" ON "storage"."objects" FOR DELETE TO "authenticated" USING (("bucket_id" = 'student-profiles'::"text"));



CREATE POLICY "Users can update their tenant's student profiles" ON "storage"."objects" FOR UPDATE TO "authenticated" USING (("bucket_id" = 'student-profiles'::"text")) WITH CHECK (("bucket_id" = 'student-profiles'::"text"));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."prefixes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "auth" TO "anon";
GRANT USAGE ON SCHEMA "auth" TO "authenticated";
GRANT USAGE ON SCHEMA "auth" TO "service_role";
GRANT ALL ON SCHEMA "auth" TO "supabase_auth_admin";
GRANT ALL ON SCHEMA "auth" TO "dashboard_user";
GRANT USAGE ON SCHEMA "auth" TO "postgres";



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT ALL ON SCHEMA "public" TO PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin";
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."email"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."jwt"() TO "postgres";
GRANT ALL ON FUNCTION "auth"."jwt"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."role"() TO "dashboard_user";



GRANT ALL ON FUNCTION "auth"."uid"() TO "dashboard_user";



GRANT ALL ON FUNCTION "public"."get_monthly_subject_scores"("p_student_id" "uuid", "p_year_month" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_student_detail"("p_student_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_student_detail"("p_student_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_student_activity"("p_tenant_id" "uuid", "p_student_id" "uuid", "p_activity_type" "text", "p_title" "text", "p_description" "text", "p_metadata" "jsonb", "p_activity_date" timestamp with time zone, "p_created_by" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."show_current_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_current_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_current_user"() TO "service_role";



GRANT ALL ON TABLE "auth"."audit_log_entries" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."audit_log_entries" TO "postgres";
GRANT SELECT ON TABLE "auth"."audit_log_entries" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."flow_state" TO "postgres";
GRANT SELECT ON TABLE "auth"."flow_state" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."flow_state" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."identities" TO "postgres";
GRANT SELECT ON TABLE "auth"."identities" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."identities" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."instances" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."instances" TO "postgres";
GRANT SELECT ON TABLE "auth"."instances" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_amr_claims" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_amr_claims" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_amr_claims" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_challenges" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_challenges" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_challenges" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."mfa_factors" TO "postgres";
GRANT SELECT ON TABLE "auth"."mfa_factors" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."mfa_factors" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_authorizations" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_clients" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_clients" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."oauth_consents" TO "postgres";
GRANT ALL ON TABLE "auth"."oauth_consents" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."one_time_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."one_time_tokens" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."one_time_tokens" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."refresh_tokens" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."refresh_tokens" TO "postgres";
GRANT SELECT ON TABLE "auth"."refresh_tokens" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "dashboard_user";
GRANT ALL ON SEQUENCE "auth"."refresh_tokens_id_seq" TO "postgres";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_providers" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."saml_relay_states" TO "postgres";
GRANT SELECT ON TABLE "auth"."saml_relay_states" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."saml_relay_states" TO "dashboard_user";



GRANT SELECT ON TABLE "auth"."schema_migrations" TO "postgres" WITH GRANT OPTION;



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sessions" TO "postgres";
GRANT SELECT ON TABLE "auth"."sessions" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sessions" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_domains" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_domains" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_domains" TO "dashboard_user";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."sso_providers" TO "postgres";
GRANT SELECT ON TABLE "auth"."sso_providers" TO "postgres" WITH GRANT OPTION;
GRANT ALL ON TABLE "auth"."sso_providers" TO "dashboard_user";



GRANT ALL ON TABLE "auth"."users" TO "dashboard_user";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "auth"."users" TO "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "postgres" WITH GRANT OPTION;



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance" TO "anon";
GRANT ALL ON TABLE "public"."attendance" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance_records" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance_records" TO "anon";
GRANT ALL ON TABLE "public"."attendance_records" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance_sessions" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attendance_sessions" TO "anon";
GRANT ALL ON TABLE "public"."attendance_sessions" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."book_lendings" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."book_lendings" TO "anon";
GRANT ALL ON TABLE "public"."book_lendings" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."books" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."books" TO "anon";
GRANT ALL ON TABLE "public"."books" TO "service_role";



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



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."consultation_participants" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."consultation_participants" TO "authenticated";



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



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_tasks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_tasks" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."homeworks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."homeworks" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."in_app_notifications" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."in_app_notifications" TO "anon";
GRANT ALL ON TABLE "public"."in_app_notifications" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."message_templates" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."message_templates" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."notification_logs" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."notification_logs" TO "anon";
GRANT ALL ON TABLE "public"."notification_logs" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ref_activity_types" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."ref_activity_types" TO "authenticated";



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



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reports" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



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



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_guardians" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_guardians" TO "anon";
GRANT ALL ON TABLE "public"."student_guardians" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_schedules" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_schedules" TO "anon";
GRANT ALL ON TABLE "public"."student_schedules" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_textbooks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_textbooks" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_todos" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."student_todos" TO "authenticated";



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



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."teaching_resources" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."teaching_resources" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_codes" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_codes" TO "anon";
GRANT ALL ON TABLE "public"."tenant_codes" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_messaging_config" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenant_messaging_config" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_messaging_config" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenants" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbook_progress" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbook_progress" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbook_units" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbook_units" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbooks" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."textbooks" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."todo_templates" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."todo_templates" TO "anon";
GRANT ALL ON TABLE "public"."todo_templates" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."todos" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."todos" TO "anon";
GRANT ALL ON TABLE "public"."todos" TO "service_role";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_student_siblings" TO "authenticated";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."v_student_siblings" TO "anon";
GRANT ALL ON TABLE "public"."v_student_siblings" TO "service_role";



GRANT ALL ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT ALL ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."prefixes" TO "service_role";
GRANT ALL ON TABLE "storage"."prefixes" TO "authenticated";
GRANT ALL ON TABLE "storage"."prefixes" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON SEQUENCES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON FUNCTIONS TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_auth_admin" IN SCHEMA "auth" GRANT ALL ON TABLES TO "dashboard_user";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";




RESET ALL;
