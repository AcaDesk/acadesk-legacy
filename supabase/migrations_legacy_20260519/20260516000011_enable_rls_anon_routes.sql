-- RLS 활성화 — 공개 라우트 테이블 (옵션 E2-B - Part 3)
--
-- 대상: /r/[linkId], /s/[code], /short/[code] 에서 접근하던 테이블 4개.
-- 동일 PR 에서 라우트들을 service_role 사용으로 전환했으므로
-- 정책 없이 RLS 활성화 가능 (service_role BYPASSRLS).
--
-- 변경된 라우트:
--   src/app/r/[linkId]/page.tsx
--   src/app/s/[code]/route.ts
--   src/app/short/[code]/route.ts

ALTER TABLE public.short_urls    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_sends  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_reads  ENABLE ROW LEVEL SECURITY;
