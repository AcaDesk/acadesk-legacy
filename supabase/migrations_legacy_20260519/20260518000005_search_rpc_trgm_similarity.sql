-- search_students_list / search_textbooks_list RPC 검색 방식 개선
--
-- 변경 사항:
--   1. ILIKE '%term%'  →  trgm `%` similarity 연산자 OR ILIKE fallback
--      - `col % query` 는 pg_trgm GIN 인덱스 활용 보장
--      - ILIKE 도 함께 OR 로 묶어 짧은 검색어 / threshold 미달 케이스 안전망
--   2. ORDER BY created_at DESC  →  similarity DESC, created_at DESC
--      - 검색 결과를 관련도 순으로 정렬 (정확히 일치하는 row 상단)
--      - 검색어 없을 때는 기존 created_at DESC 동작 유지
--   3. pg_trgm GIN 인덱스 (이미 존재) 자동 활용
--      - idx_students_name_trgm, idx_students_student_code_trgm,
--        idx_students_student_phone_trgm, idx_users_name_trgm, idx_users_phone_trgm
--      - idx_textbooks_title_trgm, _author_trgm, _publisher_trgm,
--        _isbn_trgm, _barcode_trgm, _management_code_trgm
--
-- 기대 효과:
--   - 데이터 증가 시 ILIKE seq_scan 풀스캔 → trgm GIN 인덱스 활용으로 선형 확장 제거
--   - 부분 일치 + 오타 허용 자동 (trigram 유사도)
--   - 관련도 기반 결과 정렬로 사용자 체감 큰 개선
--
-- pg_trgm.similarity_threshold default 0.3 그대로 사용. 짧은 검색어 / 한글 매칭
-- 부족할 경우 ILIKE fallback 이 잡아주므로 결과 누락 위험 최소.

-- ============================================================
-- search_students_list
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_students_list(
  p_tenant_id uuid,
  p_search text DEFAULT NULL::text,
  p_grade text DEFAULT NULL::text,
  p_class_id text DEFAULT NULL::text,
  p_school text DEFAULT NULL::text,
  p_commute_method text DEFAULT NULL::text,
  p_marketing_source text DEFAULT NULL::text,
  p_enrollment_date_from date DEFAULT NULL::date,
  p_enrollment_date_to date DEFAULT NULL::date,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(student jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
$function$;

-- ============================================================
-- search_textbooks_list
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_textbooks_list(
  p_tenant_id uuid,
  p_search text DEFAULT NULL::text,
  p_active_only boolean DEFAULT false,
  p_limit integer DEFAULT 15,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(textbook jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
      t.created_at,
      -- 관련도 점수 (검색어 NULL 이면 coalesce 로 빈 문자열 → similarity = 0)
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
        -- trgm similarity (인덱스 활용 보장)
        OR t.title % p.query
        OR t.author % p.query
        OR t.publisher % p.query
        OR t.isbn % p.query
        OR t.barcode % p.query
        OR t.management_code % p.query
        -- ILIKE fallback (안전망)
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
    'created_at', b.created_at
  ) AS textbook
  FROM base b
  ORDER BY b.rel_score DESC NULLS LAST, b.created_at DESC;
$function$;
