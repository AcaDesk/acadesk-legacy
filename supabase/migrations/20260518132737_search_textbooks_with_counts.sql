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
$function$;;
