-- 일괄작업 "템플릿으로 저장" 기능 제거에 따른 미사용 컬럼/인덱스 정리.
-- /batch·/jobs 페이지를 /reports 도메인으로 통합하면서 템플릿 UX를 폐기했습니다.
-- 확인 결과 is_template = true 행은 0건이므로 데이터 손실 없음.

DROP INDEX IF EXISTS public.idx_batch_jobs_template;

ALTER TABLE public.batch_jobs
  DROP COLUMN IF EXISTS is_template,
  DROP COLUMN IF EXISTS template_name;
