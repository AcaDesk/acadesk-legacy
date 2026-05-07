-- ============================================================================
-- Search Performance
-- ============================================================================
-- 학생/교재 목록 검색 최적화:
-- 1. 부분 문자열 ILIKE 검색을 위한 pg_trgm + GIN 인덱스
-- 2. 학생/교재 검색을 전용 DB 함수로 처리해 왕복과 불필요한 컬럼 제거

SET search_path = public, extensions;

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Textbook search indexes
CREATE INDEX IF NOT EXISTS idx_textbooks_title_trgm
  ON public.textbooks USING gin (title gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_textbooks_author_trgm
  ON public.textbooks USING gin (author gin_trgm_ops)
  WHERE deleted_at IS NULL AND author IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_textbooks_publisher_trgm
  ON public.textbooks USING gin (publisher gin_trgm_ops)
  WHERE deleted_at IS NULL AND publisher IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_textbooks_barcode_trgm
  ON public.textbooks USING gin (barcode gin_trgm_ops)
  WHERE deleted_at IS NULL AND barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_textbooks_isbn_trgm
  ON public.textbooks USING gin (isbn gin_trgm_ops)
  WHERE deleted_at IS NULL AND isbn IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_textbooks_management_code_trgm
  ON public.textbooks USING gin (management_code gin_trgm_ops)
  WHERE deleted_at IS NULL AND management_code IS NOT NULL;

-- Student/user search indexes
CREATE INDEX IF NOT EXISTS idx_students_student_code_trgm
  ON public.students USING gin (student_code gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_students_student_phone_trgm
  ON public.students USING gin (student_phone gin_trgm_ops)
  WHERE deleted_at IS NULL AND student_phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_name_trgm
  ON public.users USING gin (name gin_trgm_ops)
  WHERE name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_phone_trgm
  ON public.users USING gin (phone gin_trgm_ops)
  WHERE phone IS NOT NULL;

-- Existing list order optimization with soft-delete predicate.
CREATE INDEX IF NOT EXISTS idx_students_tenant_created_desc_active
  ON public.students (tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Search RPC used by the server action after verifyStaff().
CREATE OR REPLACE FUNCTION public.search_students_list(
  p_tenant_id uuid,
  p_search text DEFAULT NULL,
  p_grade text DEFAULT NULL,
  p_class_id text DEFAULT NULL,
  p_school text DEFAULT NULL,
  p_commute_method text DEFAULT NULL,
  p_marketing_source text DEFAULT NULL,
  p_enrollment_date_from date DEFAULT NULL,
  p_enrollment_date_to date DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(student jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
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
      u.phone AS user_phone
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
        OR s.student_code ILIKE p.pattern ESCAPE '\'
        OR s.student_phone ILIKE p.pattern ESCAPE '\'
        OR u.name ILIKE p.pattern ESCAPE '\'
        OR u.phone ILIKE p.pattern ESCAPE '\'
      )
    ORDER BY s.created_at DESC
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
        jsonb_build_object(
          'id', c.id,
          'name', c.name
        )
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
        jsonb_build_object(
          'id', g.id,
          'name', gu.name,
          'phone', gu.phone
        )
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
  ORDER BY b.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.search_students_list(
  uuid, text, text, text, text, text, text, date, date, integer, integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_students_list(
  uuid, text, text, text, text, text, text, date, date, integer, integer
) TO service_role;

CREATE OR REPLACE FUNCTION public.search_textbooks_list(
  p_tenant_id uuid,
  p_search text DEFAULT NULL,
  p_active_only boolean DEFAULT false,
  p_limit integer DEFAULT 15,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(textbook jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
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
      t.id,
      t.title,
      t.author,
      t.publisher,
      t.isbn,
      t.barcode,
      t.management_code,
      t.total_copies,
      t.price,
      t.is_active,
      t.created_at
    FROM public.textbooks t
    CROSS JOIN params p
    WHERE t.tenant_id = p_tenant_id
      AND t.deleted_at IS NULL
      AND (NOT COALESCE(p_active_only, false) OR t.is_active = true)
      AND (
        p.query IS NULL
        OR t.title ILIKE p.pattern ESCAPE '\'
        OR t.author ILIKE p.pattern ESCAPE '\'
        OR t.publisher ILIKE p.pattern ESCAPE '\'
        OR t.barcode ILIKE p.pattern ESCAPE '\'
        OR t.isbn ILIKE p.pattern ESCAPE '\'
        OR t.management_code ILIKE p.pattern ESCAPE '\'
      )
    ORDER BY t.created_at DESC
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
    'created_at', b.created_at
  ) AS textbook
  FROM base b
  ORDER BY b.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.search_textbooks_list(
  uuid, text, boolean, integer, integer
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_textbooks_list(
  uuid, text, boolean, integer, integer
) TO service_role;
