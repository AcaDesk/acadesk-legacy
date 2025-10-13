# Database Migrations Index

## Overview
This directory contains all database migration files for the Acadesk Web application. Migrations are numbered in chronological order and should be applied sequentially.

## Migration Files

### Core Schema (Initial Setup)
- **20250101000001_initial_schema.sql** - Initial database schema with all core tables (users, students, classes, attendance, etc.)
- **20250101000003_sample_data.sql** - Sample data for development and testing
- **20250102000001_create_tenant_on_signup.sql** - Automatic tenant creation on user signup
- **20250102000002_add_test_admin_user.sql** - Test admin user for development

### Payment System
- **20250104_create_payment_tables.sql** - Payment and billing system tables

### System Setup
- **20251002000002_grant_public_schema_permissions.sql** - Public schema permissions
- **20251002000003_sync_auth_users.sql** - Sync authentication users with app users
- **20251002000004_create_notification_logs.sql** - Notification logging system

### Exam System
- **20251003000001_create_exam_templates.sql** - Exam template system for recurring tests

### Dashboard & Preferences
- **20251004000001_dashboard_rpc_final.sql** - Consolidated dashboard RPC function
- **20251004031946_add_user_preferences.sql** - User preferences for dashboard customization

### Student Features
- **20251004200000_add_student_extended_fields.sql** - Extended student profile fields
- **20251004210000_create_storage_buckets.sql** - Storage buckets for student photos

### Activity Logging System
- **20251004220000_create_student_activity_logs.sql** - Student activity logging tables
- **20251004220001_rls_student_activity_logs.sql** - RLS policies for activity logs
- **20251004220002_create_library_system.sql** - Library book lending system
- **20251004220003_student_enrollment_activity_logging.sql** - Consolidated enrollment activity tracking

### Guardian Management
- **20251005000003_update_guardian_relationships.sql** - Guardian relationship improvements

### Helper Functions
- **20251006000002_create_tenant_helper_functions.sql** - Tenant-scoped helper functions

### Calendar System
- **20251007000001_create_calendar_events.sql** - Calendar events table
- **20251007000002_calendar_auto_sync_triggers.sql** - Auto-sync triggers for calendar
- **20251007000005_fix_calendar_events_rls.sql** - Calendar RLS policy fixes
- **20251007000006_fix_calendar_events_tenant_id.sql** - Calendar tenant ID fixes

### Subject System
- **20251007000003_create_subjects_system.sql** - Subject management system
- **20251007000004_fix_subject_statistics_view.sql** - Subject statistics view fix

### Advanced Student Features
- **20251009000001_add_student_enhanced_fields.sql** - Enhanced student fields
- **20251009000002_create_sibling_relationships.sql** - Sibling relationship tracking
- **20251009000003_create_student_points_system.sql** - Student points/rewards system
- **20251009000004_add_class_progress_tracking.sql** - Class progress tracking
- **20251009000005_add_attendance_reason_tracking.sql** - Detailed attendance reasons
- **20251009000006_add_enrollment_status_management.sql** - Enrollment status management

## Applying Migrations

### For Local Development
```bash
# Start local Supabase
supabase start

# Apply all migrations
supabase db push
```

### For Production
1. Go to Supabase Dashboard > SQL Editor
2. Run migrations in order
3. Verify each migration completes successfully

## Migration Guidelines

1. **Naming Convention**: `YYYYMMDDNNNNNN_descriptive_name.sql`
2. **Content**: Include schema changes AND RLS policies
3. **Rollback**: Create corresponding rollback scripts when needed
4. **Testing**: Test locally before applying to production
5. **Documentation**: Update this README when adding new migrations

## Backup Directory

A backup of all original migrations is stored in `/supabase/migrations_backup/` for reference.

## Cleanup History

- **2025-10-11**: Consolidated 6 dashboard-related migrations into one
- **2025-10-11**: Consolidated 3 enrollment activity migrations into one
- **2025-10-11**: Removed duplicate and redundant migration files