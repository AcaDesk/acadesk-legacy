-- ============================================================================
-- Migration: Fix NULL exam_dates
-- Date: 2025-12-16
-- Description: Update exams with NULL exam_date to have proper dates
--              이 시험들은 exam_date가 NULL이어서 리포트에 포함되지 않았음
-- ============================================================================

-- 1. Monthly Reading Test – Nov (11월 월말 시험) → 11월 24일로 설정
UPDATE exams
SET exam_date = '2025-11-24 00:00:00+00',
    updated_at = NOW()
WHERE id = 'c28c202f-c338-4cd8-82d4-1e888fba996f'
  AND exam_date IS NULL;

-- 2. Regular Vocabulary Test - Nov (11월 정규 시험) → created_at 기준
UPDATE exams
SET exam_date = '2025-11-05 00:00:00+00',
    updated_at = NOW()
WHERE id = '13c49379-37e6-4e16-8a03-9668fc976e73'
  AND exam_date IS NULL;

-- 3. Regular Vocabulary Test - Dec (12월 정규 시험) → created_at 기준
UPDATE exams
SET exam_date = '2025-12-01 00:00:00+00',
    updated_at = NOW()
WHERE id = 'c8830a5a-b53e-4ff7-b7b2-44f246605d73'
  AND exam_date IS NULL;

-- 4. 단어시험(29일) → 10월 29일로 추정
UPDATE exams
SET exam_date = '2025-10-29 00:00:00+00',
    updated_at = NOW()
WHERE id = 'bf8fc251-39a4-4642-9da1-f009f4230fb8'
  AND exam_date IS NULL;

-- ============================================================================
-- End of Migration
-- ============================================================================
