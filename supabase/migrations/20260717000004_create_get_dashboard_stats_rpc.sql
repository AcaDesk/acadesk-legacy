-- get_dashboard_stats RPC 생성 (스키마 드리프트 해소)
--
-- 배경: dashboard.ts fetchStats()가 호출하는 이 함수는 과거 SQL 에디터로
-- 원격에만 생성되었다가(추적 마이그레이션 없음) 2026-05 정리 때 삭제되어,
-- 이후 대시보드 stats 위젯이 폴백(0)으로만 렌더되고 있었다.
-- 추적되는 마이그레이션으로 재정의한다.
--
-- 설계:
-- - SECURITY INVOKER (service_role 클라이언트가 호출 — RLS 우회는 호출자 권한으로)
-- - p_tenant_id는 검증된 세션에서 전달 (앱 레벨 테넌트 격리 패턴과 동일)
-- - 실행 권한은 service_role에만 부여

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_tenant_id uuid, p_today date)
RETURNS TABLE (
  total_students bigint,
  active_classes bigint,
  today_attendance bigint,
  pending_todos bigint,
  average_score numeric,
  completion_rate numeric,
  previous_month_students bigint,
  previous_week_attendance bigint,
  previous_month_avg_score numeric,
  previous_week_completion_rate numeric,
  lead_consultations bigint,
  converted_consultations bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    -- 재적생 수
    (SELECT count(*) FROM students s
      WHERE s.tenant_id = p_tenant_id AND s.deleted_at IS NULL) AS total_students,

    -- 운영 중인 수업 수
    (SELECT count(*) FROM classes c
      WHERE c.tenant_id = p_tenant_id AND c.deleted_at IS NULL) AS active_classes,

    -- 오늘 출석(지각 포함) 인원
    (SELECT count(*) FROM attendance a
      WHERE a.tenant_id = p_tenant_id
        AND a.attendance_date = p_today
        AND a.status IN ('present', 'late')) AS today_attendance,

    -- 미완료 TODO 수 (todos 뷰 = 앱의 TODO 도메인과 동일 소스)
    (SELECT count(*) FROM todos t
      WHERE t.tenant_id = p_tenant_id
        AND t.completed_at IS NULL
        AND t.deleted_at IS NULL) AS pending_todos,

    -- 이번 달 평균 성적(%)
    (SELECT COALESCE(avg(es.percentage), 0) FROM exam_scores es
      WHERE es.tenant_id = p_tenant_id
        AND es.deleted_at IS NULL
        AND es.percentage IS NOT NULL
        AND es.created_at >= date_trunc('month', p_today::timestamptz)
        AND es.created_at <  date_trunc('month', p_today::timestamptz) + interval '1 month'
    ) AS average_score,

    -- 최근 7일 TODO 완료율(%)
    (SELECT COALESCE(
        count(*) FILTER (WHERE t.completed_at IS NOT NULL)::numeric
          / NULLIF(count(*), 0) * 100, 0)
      FROM todos t
      WHERE t.tenant_id = p_tenant_id
        AND t.deleted_at IS NULL
        AND t.due_date::date BETWEEN p_today - 6 AND p_today
    ) AS completion_rate,

    -- 30일 전 시점 재적생 수 (추세 비교용 근사치)
    (SELECT count(*) FROM students s
      WHERE s.tenant_id = p_tenant_id
        AND s.deleted_at IS NULL
        AND s.created_at < (p_today - 30)::timestamptz) AS previous_month_students,

    -- 지난주 같은 요일 출석 인원
    (SELECT count(*) FROM attendance a
      WHERE a.tenant_id = p_tenant_id
        AND a.attendance_date = p_today - 7
        AND a.status IN ('present', 'late')) AS previous_week_attendance,

    -- 지난달 평균 성적(%)
    (SELECT COALESCE(avg(es.percentage), 0) FROM exam_scores es
      WHERE es.tenant_id = p_tenant_id
        AND es.deleted_at IS NULL
        AND es.percentage IS NOT NULL
        AND es.created_at >= date_trunc('month', p_today::timestamptz) - interval '1 month'
        AND es.created_at <  date_trunc('month', p_today::timestamptz)
    ) AS previous_month_avg_score,

    -- 그 전 7일 TODO 완료율(%)
    (SELECT COALESCE(
        count(*) FILTER (WHERE t.completed_at IS NOT NULL)::numeric
          / NULLIF(count(*), 0) * 100, 0)
      FROM todos t
      WHERE t.tenant_id = p_tenant_id
        AND t.deleted_at IS NULL
        AND t.due_date::date BETWEEN p_today - 13 AND p_today - 7
    ) AS previous_week_completion_rate,

    -- 미전환 리드 상담 수
    (SELECT count(*) FROM consultations con
      WHERE con.tenant_id = p_tenant_id
        AND con.deleted_at IS NULL
        AND con.is_lead = true
        AND con.converted_to_student_id IS NULL) AS lead_consultations,

    -- 전환된 리드 상담 수
    (SELECT count(*) FROM consultations con
      WHERE con.tenant_id = p_tenant_id
        AND con.deleted_at IS NULL
        AND con.is_lead = true
        AND con.converted_to_student_id IS NOT NULL) AS converted_consultations
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid, date) TO service_role;

COMMENT ON FUNCTION public.get_dashboard_stats(uuid, date)
  IS '대시보드 stats 위젯용 집계 (dashboard.ts fetchStats에서 호출)';
