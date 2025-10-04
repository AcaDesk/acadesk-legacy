# Migration Guide

## Overview
This guide explains how to apply database migrations for Acadesk Web.

## Migration Files
Location: `/supabase/migrations/`

1. `20251001000001_add_student_schedules.sql`
2. `20251001000002_add_materials_management.sql`
3. `20251001000003_add_book_lending_system.sql`
4. `20251001000004_add_consultations.sql`
5. `20251001000005_add_student_todos.sql`
6. `20251001000006_enhance_exam_system.sql`
7. `20251001000007_add_notifications_tracking.sql`

## Apply via Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" → "+ New query"
4. Copy/paste each migration file
5. Run in order

## Apply via CLI

```bash
supabase link --project-ref mzftcusxsvwbzobmlwpm
supabase db push
```

## Verify

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%student_schedules%';
```
