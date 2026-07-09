-- Seed point reward/penalty activity types.
--
-- The trigger `trg_log_student_point_activity` (migration 20251009000003) inserts
-- activity logs with activity_type 'point_reward' / 'point_penalty', but those
-- codes were never added to ref_activity_types. Because student_activity_logs has
-- a FK on activity_type -> ref_activity_types(code), every student_points insert
-- failed with a foreign-key violation — the point system could not store data.
--
-- This backfills the missing reference rows so point awards succeed and render in
-- the activity timeline.

INSERT INTO ref_activity_types (code, label, description, icon, color, sort_order) VALUES
  ('point_reward', '상점 획득', '상점(리워드) 부여', 'Award', 'default', 45),
  ('point_penalty', '벌점 부여', '벌점(페널티) 부여', 'AlertTriangle', 'destructive', 46)
ON CONFLICT (code) DO NOTHING;
