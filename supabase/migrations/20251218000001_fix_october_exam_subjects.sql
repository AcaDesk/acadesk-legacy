-- Migration: Fix October 2025 exam subject_id assignments
-- Purpose: Add missing subject_id to October Monthly tests for proper month-over-month comparison

-- Monthly Reading Test – October → Reading
UPDATE exams SET
  subject_id = '6bd328c3-4a0d-4552-8d5f-eafce54f26c0',
  category_code = 'monthly'
WHERE id = '36ada3e3-5731-44e7-b71c-3565ad3eaafb'
  AND subject_id IS NULL;

-- Monthly Grammar Test – October → Grammar, Writing
UPDATE exams SET
  subject_id = '3186ea81-afb5-4d7b-899e-c57b9c45cfe3',
  category_code = 'monthly'
WHERE id = '50ac5d0a-f9c2-4f91-afa1-abfb4b42f2ce'
  AND subject_id IS NULL;

-- Monthly Speaking/ Listening Test – October → Speaking
UPDATE exams SET
  subject_id = 'cfb5c784-6de6-42cf-92b2-bce6f09087d8',
  category_code = 'monthly'
WHERE id = '732565f8-8462-450c-bf32-823b417455df'
  AND subject_id IS NULL;

-- Monthly vocabulary Test - October → Vocabulary
UPDATE exams SET
  subject_id = '5163a8a0-de4b-4e9a-9ea8-e83f2e7b84e2',
  category_code = 'monthly'
WHERE id = '643a2ce2-dce0-44ae-9164-7d215885ffc9'
  AND subject_id IS NULL;
