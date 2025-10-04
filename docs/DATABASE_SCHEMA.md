# Database Schema Documentation

## Overview
This document describes the complete database schema for the Acadesk Web application, including all tables created to support academy management features.

## Migration Files Created
The following migration files have been created in `supabase/migrations/`:

1. `20251001000001_add_student_schedules.sql` - Student attendance schedules by day
2. `20251001000002_add_materials_management.sql` - Textbook and material management
3. `20251001000003_add_book_lending_system.sql` - Library book lending system
4. `20251001000004_add_consultations.sql` - Parent consultation management
5. `20251001000005_add_student_todos.sql` - Student task management
6. `20251001000006_enhance_exam_system.sql` - Enhanced test/exam tracking
7. `20251001000007_add_notifications_tracking.sql` - Notification/alert tracking

## Core Tables

### 1. Student Schedules (`student_schedules`)
Manages daily attendance times for each student.

**Columns:**
- `id` (UUID) - Primary key
- `tenant_id` (UUID) - Multi-tenant isolation
- `student_id` (UUID) - References students
- `day_of_week` (INTEGER) - 0=Sunday, 6=Saturday
- `scheduled_arrival_time` (TIME) - Expected arrival time
- `notes` (TEXT) - Additional notes
- `active` (BOOLEAN) - Whether schedule is active
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Key Features:**
- Unique constraint on (student_id, day_of_week)
- Supports different arrival times per day
- Used for automatic late arrival notifications

---

### 2. Materials Management

#### Materials (`materials`)
Core table for textbooks and teaching materials.

**Columns:**
- `id`, `tenant_id` - Standard identifiers
- `name` (VARCHAR) - Material name
- `category_code` (VARCHAR) - References ref_material_categories
- `publisher` (VARCHAR)
- `isbn` (VARCHAR) - ISBN code
- `barcode` (VARCHAR) - Barcode for scanning
- `price` (DECIMAL) - Material price
- `description` (TEXT)
- `cover_image_url` (TEXT)
- `total_units` (INTEGER) - Total chapters/units
- `meta` (JSONB) - Additional metadata
- `active` (BOOLEAN)
- `created_at`, `updated_at`, `deleted_at` (TIMESTAMPTZ)

#### Material Categories (`ref_material_categories`)
Reference table for material types:
- phonics, reading, vocabulary, grammar, writing, listening, speaking, other

#### Material Distributions (`material_distributions`)
Tracks which materials are assigned to which students.

**Columns:**
- `material_id`, `student_id` - What and who
- `distributed_at` (DATE) - Distribution date
- `payment_status` (VARCHAR) - unpaid, paid, self_purchased
- `payment_amount`, `payment_date` (DECIMAL, DATE)
- `track_progress` (BOOLEAN) - Whether to track progress
- `notes` (TEXT)

#### Material Progress (`material_progress`)
Tracks student progress through materials.

**Columns:**
- `distribution_id` - References material_distributions
- `material_id`, `student_id` - For easy querying
- `unit_number` (INTEGER) - Chapter/unit number
- `unit_name` (VARCHAR)
- `completion_percentage` (INTEGER) - 0-100
- `completed_at` (DATE)
- `instructor_comment` (TEXT)

---

### 3. Book Lending System

#### Books (`books`)
Inventory of lending library books.

**Columns:**
- `id`, `tenant_id`
- `title`, `author` (VARCHAR)
- `category_code` - References ref_book_categories
- `level` (VARCHAR) - Reading level (AR, Lexile, etc.)
- `isbn`, `barcode` (VARCHAR)
- `publisher` (VARCHAR)
- `cover_image_url` (TEXT)
- `total_copies`, `available_copies` (INTEGER)
- `condition` (VARCHAR) - good, fair, poor, damaged, lost
- `notes` (TEXT)

#### Book Categories (`ref_book_categories`)
- phonics, early_reader, chapter_book, fiction, non_fiction, picture_book, other

#### Book Lendings (`book_lendings`)
Tracks book borrowing and returns.

**Columns:**
- `book_id`, `student_id`
- `borrowed_at` (DATE) - Borrowing date
- `due_date` (DATE) - Expected return date
- `returned_at` (DATE) - Actual return date (NULL if not returned)
- `return_condition` (VARCHAR) - good, damaged, lost
- `notes` (TEXT)
- `reminder_sent_at` (TIMESTAMPTZ) - When reminder was sent

**Automatic Features:**
- Trigger automatically updates `available_copies` when books are borrowed/returned
- Can track overdue books (where `returned_at` IS NULL AND `due_date` < CURRENT_DATE)

---

### 4. Consultations (`consultations`)
Parent and student consultation management.

**Columns:**
- `id`, `tenant_id`, `student_id`
- `consultation_type` - phone, in_person, online, other
- `consultation_date`, `consultation_time` (DATE, TIME)
- `duration_minutes` (INTEGER)
- `instructor_id` - Who conducted the consultation
- `attendees` (TEXT[]) - Array of attendee names
- `topics` (TEXT[]) - Array of discussion topics
- `content` (TEXT) - Main notes
- `follow_up_required` (BOOLEAN)
- `follow_up_date` (DATE)

**Use Cases:**
- Track all parent-teacher meetings
- Schedule follow-up consultations
- View consultation history per student
- Calendar view support

---

### 5. Student Todos

#### Student Todos (`student_todos`)
Individual task management for students.

**Columns:**
- `id`, `tenant_id`, `student_id`
- `title`, `description` (VARCHAR, TEXT)
- `subject` (VARCHAR) - e.g., "Vocabulary", "Reading"
- `due_date` (DATE)
- `due_day_of_week` (INTEGER) - For weekly recurring tasks
- `priority` (VARCHAR) - low, normal, high, urgent
- `estimated_duration_minutes` (INTEGER)
- `completed_at` (TIMESTAMPTZ) - When student marked complete
- `verified_by`, `verified_at` - Instructor verification
- `notes` (TEXT)

**Workflow:**
1. Principal creates todos for the week
2. Students see their personal todo list
3. Students mark tasks complete
4. Instructors verify completion
5. Verified completion allows early departure

#### Todo Templates (`todo_templates`)
Reusable templates for recurring tasks.

**Columns:**
- `title`, `description`, `subject`
- `day_of_week` - Which day to create this todo
- `estimated_duration_minutes`
- `priority`
- `active` (BOOLEAN)

---

### 6. Enhanced Exam System

#### Exam Categories (`ref_exam_categories`)
- vocabulary, listening, speaking, grammar, writing, reading, monthly, other

#### Enhanced Exam Columns
New columns added to existing `exams` table:
- `category_code` - Type of exam
- `recurring_schedule` - e.g., 'weekly_mon_wed_fri', 'weekly_fri', 'monthly'
- `is_recurring` (BOOLEAN)

#### Enhanced Exam Scores
New columns added to existing `exam_scores` table:
- `correct_answers` (INTEGER) - e.g., 30 in "30/32"
- `total_questions` (INTEGER) - e.g., 32 in "30/32"
- `retest_count` (INTEGER) - Number of retests
- `is_retest` (BOOLEAN)
- `original_score_id` - References original exam if this is a retest

**Automatic Calculation:**
- Trigger automatically calculates `percentage` from correct_answers/total_questions
- Formula: ROUND((correct_answers / total_questions) * 100, 2)

**Key Features:**
- Input scores as fractions (30/32)
- System auto-calculates percentage
- Track retests and improvement
- Support for recurring exam schedules

---

### 7. Notifications (`notifications`)
Tracks all outbound notifications to parents/students.

**Columns:**
- `id`, `tenant_id`
- `notification_type` - attendance_missing, book_return_reminder, payment_reminder, report_sent, etc.
- `student_id`, `guardian_id`
- `recipient_phone`, `recipient_email` (VARCHAR)
- `message_subject`, `message_body` (VARCHAR, TEXT)
- `send_method` (VARCHAR) - sms, kakao, email
- `scheduled_at` (TIMESTAMPTZ) - When to send
- `sent_at` (TIMESTAMPTZ) - When actually sent
- `status` (VARCHAR) - pending, sent, failed, cancelled
- `error_message` (TEXT) - If failed
- `provider` (VARCHAR) - solapi, aligo, makecom, etc.
- `provider_message_id` (VARCHAR) - External provider's ID
- `cost` (DECIMAL) - SMS/message cost

**Use Cases:**
- Late arrival notifications (30 min after scheduled time)
- Book return reminders (Monday if not returned)
- Material payment reminders (if unpaid)
- Weekly/monthly report delivery tracking

---

## Notification Types Reference (`ref_notification_types`)
- `attendance_missing` - Student didn't arrive on time
- `book_return_reminder` - Book is overdue
- `payment_reminder` - Material/tuition payment due
- `report_sent` - Weekly/monthly report delivered
- `consultation_scheduled` - Consultation appointment
- `general` - General notifications

---

## Key Relationships

### Student-Centric Views
Each student has:
1. **Schedule** - Daily arrival times (student_schedules)
2. **Classes** - Enrolled classes (class_enrollments)
3. **Attendance** - Attendance records (attendance)
4. **Materials** - Assigned textbooks (material_distributions → material_progress)
5. **Books** - Borrowed books (book_lendings)
6. **Exams** - Test scores (exam_scores)
7. **Todos** - Personal task list (student_todos)
8. **Consultations** - Meeting history (consultations)
9. **Reports** - Generated reports (reports)
10. **Notifications** - Messages sent (notifications)

### Instructor Workflows
1. **Attendance Management**
   - View student schedules by day
   - Mark attendance in sessions
   - Auto-send late alerts after 30 min

2. **Material Management**
   - Assign materials to students
   - Track payment status
   - Monitor progress through units

3. **Book Management**
   - Check out books to students
   - Track due dates
   - Send return reminders

4. **Assessment**
   - Create recurring exam schedules
   - Input scores as fractions (30/32)
   - Track retests and improvement

5. **Todo Management**
   - Create weekly todos in bulk
   - Verify student completions
   - Allow early departure when done

6. **Reporting**
   - Auto-generate monthly reports with:
     - Achievement percentages by subject
     - Trend graphs (month-over-month)
     - Attendance rate
     - Homework completion rate
     - Instructor comments

---

## Applying Migrations

### Method 1: Via Supabase CLI
```bash
# Ensure you're linked to the project
supabase link --project-ref mzftcusxsvwbzobmlwpm

# Apply all migrations
supabase db push
```

### Method 2: Via Supabase Dashboard
1. Go to Supabase Dashboard > SQL Editor
2. Copy contents of each migration file
3. Execute in order (sorted by filename)

### Method 3: Direct SQL Execution
If you have direct database access:
```bash
psql $DATABASE_URL < supabase/migrations/20251001000001_add_student_schedules.sql
psql $DATABASE_URL < supabase/migrations/20251001000002_add_materials_management.sql
# ... and so on
```

---

## Row Level Security (RLS)

All tables have RLS enabled. You need to add policies for:
- Tenant isolation (users can only see their tenant's data)
- Role-based access (admin, instructor, student roles)

Example policy template:
```sql
-- Read policy for instructors/admins
CREATE POLICY "Instructors can view all students"
ON students FOR SELECT
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  )
);

-- Students can only view their own data
CREATE POLICY "Students can view own data"
ON students FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);
```

---

## Next Steps

1. **Apply Migrations** - Run the migration files on your Supabase database
2. **Set Up RLS Policies** - Define security policies for each table
3. **Build UI Components** - Create forms and views for each feature
4. **Implement Notification System** - Integrate with SMS/Kakao API
5. **Create Report Generator** - Build PDF report generation with charts
6. **Add Data Import** - Create Excel import functionality for existing data

---

## Additional Features to Implement

### Priority 0 (Most Urgent)
- **Automated Report Generation**
  - Monthly achievement reports
  - Performance graphs (trend over time)
  - Attendance and homework statistics
  - PDF export
  - Auto-send to parents

### Priority 1
- **Attendance Automation**
  - Auto-detect late arrivals
  - Send notifications 30 min after scheduled time

- **Material Payment Tracking**
  - Payment reminder notifications
  - Payment status dashboard

### Priority 2
- **Data Migration Tools**
  - Excel template for bulk import
  - CSV import functionality
  - Data validation

- **Book Lending Automation**
  - Weekly return reminders (Monday)
  - Overdue book tracking
  - Reading statistics

### Priority 3
- **Device Management** (Separate System)
  - Windows PC management (GPO/MDM)
  - Samsung tablet management (Knox)
  - Whitelist apps/websites
  - Prevent device name changes

---

## Technical Notes

### Performance Optimization
- Indexes created on foreign keys for fast joins
- Composite indexes on frequently queried combinations
- JSONB columns for flexible metadata storage

### Triggers
- `update_updated_at_column()` - Auto-updates `updated_at` timestamp
- `calculate_exam_percentage()` - Auto-calculates percentage from fraction
- `update_book_availability()` - Auto-updates available book copies

### Data Integrity
- Foreign key constraints ensure referential integrity
- Check constraints validate data ranges (e.g., 0-100 for percentages)
- Unique constraints prevent duplicate records
- Soft deletes via `deleted_at` timestamp

---

## Contact & Support
For questions about the schema or implementation, refer to:
- Internal documentation in `/internal/tech/`
- ERD diagram in `/internal/tech/ERD.md`
- Architecture guide in `/internal/tech/Architecture.md`
