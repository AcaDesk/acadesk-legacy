-- Update existing guardians with sample relationship data
-- This helps test the guardian relationship display feature

UPDATE guardians
SET relationship = 'father'
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%아버지%' OR name LIKE '김문수'
)
AND relationship IS NULL;

UPDATE guardians
SET relationship = 'mother'
WHERE user_id IN (
  SELECT id FROM users WHERE name LIKE '%어머니%'
)
AND relationship IS NULL;
