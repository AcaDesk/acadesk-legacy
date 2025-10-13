-- =====================================================
-- Acadesk Web - Complete Database Schema
-- Initial Migration - Creates all tables from scratch
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 1. TENANTS (Multi-tenancy)
-- =====================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_deleted_at ON tenants(deleted_at);

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. REFERENCE TABLES
-- =====================================================

-- User Roles
CREATE TABLE ref_roles (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

INSERT INTO ref_roles (code, label, description, sort_order) VALUES
  ('admin', 'Administrator', '학원 원장 - 모든 권한', 1),
  ('instructor', 'Instructor', '강사 - 수업 및 학생 관리', 2),
  ('assistant', 'Assistant', '조교 - 제한적 권한', 3),
  ('student', 'Student', '학생', 4),
  ('guardian', 'Guardian', '학부모', 5);

-- Status Codes (다양한 상태값 통합 관리)
CREATE TABLE ref_status_codes (
  category VARCHAR(50) NOT NULL,
  code VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  PRIMARY KEY (category, code)
);

INSERT INTO ref_status_codes (category, code, label, sort_order) VALUES
  -- Attendance status
  ('attendance', 'present', 'Present', 1),
  ('attendance', 'late', 'Late', 2),
  ('attendance', 'absent', 'Absent', 3),
  ('attendance', 'excused', 'Excused', 4),

  -- Enrollment status
  ('enrollment', 'active', 'Active', 1),
  ('enrollment', 'inactive', 'Inactive', 2),
  ('enrollment', 'graduated', 'Graduated', 3),
  ('enrollment', 'withdrawn', 'Withdrawn', 4),

  -- Payment status
  ('payment', 'paid', 'Paid', 1),
  ('payment', 'unpaid', 'Unpaid', 2),
  ('payment', 'partial', 'Partially Paid', 3),
  ('payment', 'self_purchased', 'Self Purchased', 4),

  -- Session status
  ('session', 'scheduled', 'Scheduled', 1),
  ('session', 'in_progress', 'In Progress', 2),
  ('session', 'completed', 'Completed', 3),
  ('session', 'cancelled', 'Cancelled', 4),

  -- Notification status
  ('notification', 'pending', 'Pending', 1),
  ('notification', 'sent', 'Sent', 2),
  ('notification', 'failed', 'Failed', 3),
  ('notification', 'cancelled', 'Cancelled', 4);

-- Material Categories
CREATE TABLE ref_material_categories (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

INSERT INTO ref_material_categories (code, label, sort_order) VALUES
  ('phonics', 'Phonics', 1),
  ('reading', 'Reading', 2),
  ('vocabulary', 'Vocabulary', 3),
  ('grammar', 'Grammar', 4),
  ('writing', 'Writing', 5),
  ('listening', 'Listening', 6),
  ('speaking', 'Speaking', 7),
  ('other', 'Other', 99);

-- Book Categories
CREATE TABLE ref_book_categories (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

INSERT INTO ref_book_categories (code, label, sort_order) VALUES
  ('phonics', 'Phonics', 1),
  ('early_reader', 'Early Reader', 2),
  ('chapter_book', 'Chapter Book', 3),
  ('fiction', 'Fiction', 4),
  ('non_fiction', 'Non-Fiction', 5),
  ('picture_book', 'Picture Book', 6),
  ('other', 'Other', 99);

-- Exam Categories
CREATE TABLE ref_exam_categories (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

INSERT INTO ref_exam_categories (code, label, sort_order) VALUES
  ('vocabulary', 'Vocabulary Test', 1),
  ('listening', 'Listening Test', 2),
  ('speaking', 'Speaking Test', 3),
  ('grammar', 'Grammar Test', 4),
  ('writing', 'Writing Test', 5),
  ('reading', 'Reading Test', 6),
  ('monthly', 'Monthly Assessment', 7),
  ('other', 'Other', 99);

-- Consultation Types
CREATE TABLE ref_consultation_types (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

INSERT INTO ref_consultation_types (code, label, sort_order) VALUES
  ('phone', 'Phone Call', 1),
  ('in_person', 'In Person', 2),
  ('online', 'Online Meeting', 3),
  ('other', 'Other', 99);

-- Notification Types
CREATE TABLE ref_notification_types (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true
);

INSERT INTO ref_notification_types (code, label, sort_order) VALUES
  ('attendance_missing', 'Attendance Missing Alert', 1),
  ('book_return_reminder', 'Book Return Reminder', 2),
  ('payment_reminder', 'Payment Reminder', 3),
  ('report_sent', 'Report Sent', 4),
  ('consultation_scheduled', 'Consultation Scheduled', 5),
  ('general', 'General Notification', 99);

-- =====================================================
-- 3. USERS (통합 사용자 테이블)
-- =====================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  email VARCHAR(255),
  name VARCHAR(100) NOT NULL,
  role_code VARCHAR(50) REFERENCES ref_roles(code),
  phone VARCHAR(20),
  avatar_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_code ON users(role_code);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. STUDENTS
-- =====================================================

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  student_code VARCHAR(50) NOT NULL,
  grade VARCHAR(20),
  school VARCHAR(255),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  emergency_contact VARCHAR(20),
  notes TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_students_tenant_id ON students(tenant_id);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_student_code ON students(student_code);
CREATE INDEX idx_students_deleted_at ON students(deleted_at);

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Student Schedules (요일별 등원 시간)
CREATE TABLE student_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=일요일, 6=토요일
  scheduled_arrival_time TIME NOT NULL,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, day_of_week)
);

CREATE INDEX idx_student_schedules_tenant_id ON student_schedules(tenant_id);
CREATE INDEX idx_student_schedules_student_id ON student_schedules(student_id);
CREATE INDEX idx_student_schedules_day ON student_schedules(day_of_week);

CREATE TRIGGER update_student_schedules_updated_at
  BEFORE UPDATE ON student_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. GUARDIANS (학부모)
-- =====================================================

CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  relationship VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_guardians_tenant_id ON guardians(tenant_id);
CREATE INDEX idx_guardians_user_id ON guardians(user_id);

CREATE TRIGGER update_guardians_updated_at
  BEFORE UPDATE ON guardians
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Student-Guardian Relationship
CREATE TABLE student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardians(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  can_pickup BOOLEAN DEFAULT true,
  can_view_reports BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_student_guardians_tenant_id ON student_guardians(tenant_id);
CREATE INDEX idx_student_guardians_student_id ON student_guardians(student_id);
CREATE INDEX idx_student_guardians_guardian_id ON student_guardians(guardian_id);

-- =====================================================
-- 6. CLASSES
-- =====================================================

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES users(id),
  subject VARCHAR(100),
  grade_level VARCHAR(50),
  capacity INTEGER,
  schedule JSONB, -- {mon: ["09:00-10:00"], tue: ["14:00-15:00"], ...}
  room VARCHAR(50),
  active BOOLEAN DEFAULT true,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_classes_tenant_id ON classes(tenant_id);
CREATE INDEX idx_classes_instructor_id ON classes(instructor_id);
CREATE INDEX idx_classes_deleted_at ON classes(deleted_at);

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Class Enrollments
CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_class_enrollments_tenant_id ON class_enrollments(tenant_id);
CREATE INDEX idx_class_enrollments_class_id ON class_enrollments(class_id);
CREATE INDEX idx_class_enrollments_student_id ON class_enrollments(student_id);
CREATE INDEX idx_class_enrollments_status ON class_enrollments(status);

CREATE TRIGGER update_class_enrollments_updated_at
  BEFORE UPDATE ON class_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. ATTENDANCE
-- =====================================================

-- Attendance Sessions
CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  scheduled_end_at TIMESTAMPTZ NOT NULL,
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attendance_sessions_tenant_id ON attendance_sessions(tenant_id);
CREATE INDEX idx_attendance_sessions_class_id ON attendance_sessions(class_id);
CREATE INDEX idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX idx_attendance_sessions_status ON attendance_sessions(status);

CREATE TRIGGER update_attendance_sessions_updated_at
  BEFORE UPDATE ON attendance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Attendance Records
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL, -- present, late, absent, excused
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_attendance_tenant_id ON attendance(tenant_id);
CREATE INDEX idx_attendance_session_id ON attendance(session_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
CREATE INDEX idx_attendance_status ON attendance(status);

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. EXAMS & GRADES
-- =====================================================

CREATE TABLE exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  class_id UUID REFERENCES classes(id),
  name VARCHAR(255) NOT NULL,
  category_code VARCHAR(50) REFERENCES ref_exam_categories(code),
  exam_type VARCHAR(100),
  exam_date DATE,
  total_questions INTEGER,
  recurring_schedule VARCHAR(50), -- 'weekly_mon_wed_fri', 'weekly_fri', 'monthly'
  is_recurring BOOLEAN DEFAULT false,
  description TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_exams_tenant_id ON exams(tenant_id);
CREATE INDEX idx_exams_class_id ON exams(class_id);
CREATE INDEX idx_exams_category ON exams(category_code);
CREATE INDEX idx_exams_exam_date ON exams(exam_date);
CREATE INDEX idx_exams_recurring ON exams(is_recurring);
CREATE INDEX idx_exams_deleted_at ON exams(deleted_at);

CREATE TRIGGER update_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Exam Scores
CREATE TABLE exam_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  correct_answers INTEGER, -- 맞은 문항 수 (예: 30)
  total_questions INTEGER, -- 전체 문항 수 (예: 32)
  score NUMERIC(5, 2), -- 점수
  percentage NUMERIC(5, 2), -- 자동 계산된 퍼센트
  grade VARCHAR(10),
  is_retest BOOLEAN DEFAULT false,
  retest_count INTEGER DEFAULT 0,
  original_score_id UUID REFERENCES exam_scores(id),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exam_scores_tenant_id ON exam_scores(tenant_id);
CREATE INDEX idx_exam_scores_exam_id ON exam_scores(exam_id);
CREATE INDEX idx_exam_scores_student_id ON exam_scores(student_id);
CREATE INDEX idx_exam_scores_retest ON exam_scores(is_retest);
CREATE INDEX idx_exam_scores_original ON exam_scores(original_score_id);

CREATE TRIGGER update_exam_scores_updated_at
  BEFORE UPDATE ON exam_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-calculate percentage from fraction
CREATE OR REPLACE FUNCTION calculate_exam_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.correct_answers IS NOT NULL AND NEW.total_questions IS NOT NULL AND NEW.total_questions > 0 THEN
    NEW.percentage := ROUND((NEW.correct_answers::NUMERIC / NEW.total_questions::NUMERIC) * 100, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_exam_percentage
  BEFORE INSERT OR UPDATE ON exam_scores
  FOR EACH ROW
  EXECUTE FUNCTION calculate_exam_percentage();

-- =====================================================
-- 9. MATERIALS MANAGEMENT
-- =====================================================

CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  category_code VARCHAR(50) REFERENCES ref_material_categories(code),
  publisher VARCHAR(255),
  isbn VARCHAR(20),
  barcode VARCHAR(50),
  price NUMERIC(10, 2),
  description TEXT,
  cover_image_url TEXT,
  total_units INTEGER DEFAULT 1, -- 총 단원/챕터 수
  meta JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_materials_tenant_id ON materials(tenant_id);
CREATE INDEX idx_materials_category ON materials(category_code);
CREATE INDEX idx_materials_isbn ON materials(isbn);
CREATE INDEX idx_materials_barcode ON materials(barcode);
CREATE INDEX idx_materials_deleted_at ON materials(deleted_at);

CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Material Distributions (학생별 교재 배부)
CREATE TABLE material_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  distributed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_status VARCHAR(50) DEFAULT 'unpaid', -- paid, unpaid, partial, self_purchased
  payment_amount NUMERIC(10, 2),
  payment_date DATE,
  track_progress BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_material_distributions_tenant_id ON material_distributions(tenant_id);
CREATE INDEX idx_material_distributions_material_id ON material_distributions(material_id);
CREATE INDEX idx_material_distributions_student_id ON material_distributions(student_id);
CREATE INDEX idx_material_distributions_payment_status ON material_distributions(payment_status);

CREATE TRIGGER update_material_distributions_updated_at
  BEFORE UPDATE ON material_distributions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Material Progress (진도 관리)
CREATE TABLE material_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  distribution_id UUID REFERENCES material_distributions(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  student_id UUID REFERENCES students(id),
  unit_number INTEGER NOT NULL,
  unit_name VARCHAR(255),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  completed_at DATE,
  instructor_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(distribution_id, unit_number)
);

CREATE INDEX idx_material_progress_tenant_id ON material_progress(tenant_id);
CREATE INDEX idx_material_progress_distribution_id ON material_progress(distribution_id);
CREATE INDEX idx_material_progress_student_id ON material_progress(student_id);
CREATE INDEX idx_material_progress_material_id ON material_progress(material_id);

CREATE TRIGGER update_material_progress_updated_at
  BEFORE UPDATE ON material_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. BOOK LENDING SYSTEM
-- =====================================================

CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  category_code VARCHAR(50) REFERENCES ref_book_categories(code),
  level VARCHAR(50), -- AR 2.5, Lexile 400L 등
  isbn VARCHAR(20),
  barcode VARCHAR(50) UNIQUE,
  publisher VARCHAR(255),
  cover_image_url TEXT,
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  condition VARCHAR(50) DEFAULT 'good', -- good, fair, poor, damaged, lost
  notes TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_books_tenant_id ON books(tenant_id);
CREATE INDEX idx_books_category ON books(category_code);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_books_barcode ON books(barcode);
CREATE INDEX idx_books_level ON books(level);
CREATE INDEX idx_books_deleted_at ON books(deleted_at);

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Book Lendings
CREATE TABLE book_lendings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  borrowed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  returned_at DATE,
  return_condition VARCHAR(50), -- good, damaged, lost
  notes TEXT,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_book_lendings_tenant_id ON book_lendings(tenant_id);
CREATE INDEX idx_book_lendings_book_id ON book_lendings(book_id);
CREATE INDEX idx_book_lendings_student_id ON book_lendings(student_id);
CREATE INDEX idx_book_lendings_due_date ON book_lendings(due_date);
CREATE INDEX idx_book_lendings_returned_at ON book_lendings(returned_at);

CREATE TRIGGER update_book_lendings_updated_at
  BEFORE UPDATE ON book_lendings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update available copies
CREATE OR REPLACE FUNCTION update_book_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.returned_at IS NULL THEN
    UPDATE books SET available_copies = available_copies - 1
    WHERE id = NEW.book_id AND available_copies > 0;
  ELSIF TG_OP = 'UPDATE' AND OLD.returned_at IS NULL AND NEW.returned_at IS NOT NULL THEN
    UPDATE books SET available_copies = available_copies + 1
    WHERE id = NEW.book_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_book_availability
  AFTER INSERT OR UPDATE ON book_lendings
  FOR EACH ROW
  EXECUTE FUNCTION update_book_availability();

-- =====================================================
-- 11. CONSULTATIONS
-- =====================================================

CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  consultation_type VARCHAR(50) REFERENCES ref_consultation_types(code),
  consultation_date DATE NOT NULL,
  consultation_time TIME,
  duration_minutes INTEGER,
  instructor_id UUID REFERENCES users(id),
  attendees TEXT[], -- 참석자 배열
  topics TEXT[], -- 상담 주제 배열
  content TEXT NOT NULL,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_consultations_tenant_id ON consultations(tenant_id);
CREATE INDEX idx_consultations_student_id ON consultations(student_id);
CREATE INDEX idx_consultations_date ON consultations(consultation_date);
CREATE INDEX idx_consultations_instructor_id ON consultations(instructor_id);
CREATE INDEX idx_consultations_follow_up ON consultations(follow_up_required, follow_up_date);
CREATE INDEX idx_consultations_deleted_at ON consultations(deleted_at);

CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 12. STUDENT TODOS
-- =====================================================

CREATE TABLE student_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100),
  due_date DATE NOT NULL,
  due_day_of_week INTEGER CHECK (due_day_of_week BETWEEN 0 AND 6),
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  estimated_duration_minutes INTEGER,
  completed_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_student_todos_tenant_id ON student_todos(tenant_id);
CREATE INDEX idx_student_todos_student_id ON student_todos(student_id);
CREATE INDEX idx_student_todos_due_date ON student_todos(due_date);
CREATE INDEX idx_student_todos_completed ON student_todos(completed_at);
CREATE INDEX idx_student_todos_subject ON student_todos(subject);

CREATE TRIGGER update_student_todos_updated_at
  BEFORE UPDATE ON student_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Todo Templates
CREATE TABLE todo_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  subject VARCHAR(100),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  estimated_duration_minutes INTEGER,
  priority VARCHAR(20) DEFAULT 'normal',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_todo_templates_tenant_id ON todo_templates(tenant_id);
CREATE INDEX idx_todo_templates_day_of_week ON todo_templates(day_of_week);

CREATE TRIGGER update_todo_templates_updated_at
  BEFORE UPDATE ON todo_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 13. NOTIFICATIONS
-- =====================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  notification_type VARCHAR(50) REFERENCES ref_notification_types(code),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES guardians(id) ON DELETE CASCADE,
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(255),
  message_subject VARCHAR(255),
  message_body TEXT NOT NULL,
  send_method VARCHAR(20) DEFAULT 'sms', -- sms, kakao, email
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, cancelled
  error_message TEXT,
  provider VARCHAR(50), -- solapi, aligo, makecom
  provider_message_id VARCHAR(255),
  cost NUMERIC(10, 4),
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_notifications_student_id ON notifications(student_id);
CREATE INDEX idx_notifications_guardian_id ON notifications(guardian_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled_at ON notifications(scheduled_at);
CREATE INDEX idx_notifications_type ON notifications(notification_type);

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 14. REPORTS
-- =====================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL, -- weekly, monthly, quarterly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL, -- 리포트 내용 (JSON 형태)
  generated_at TIMESTAMPTZ DEFAULT now(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_tenant_id ON reports(tenant_id);
CREATE INDEX idx_reports_student_id ON reports(student_id);
CREATE INDEX idx_reports_report_type ON reports(report_type);
CREATE INDEX idx_reports_period ON reports(period_start, period_end);
CREATE INDEX idx_reports_generated_at ON reports(generated_at);

-- =====================================================
-- 15. ROW LEVEL SECURITY
-- =====================================================
-- RLS is DISABLED for testing/development
-- IMPORTANT: Enable RLS before production deployment

-- ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_schedules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_guardians ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE exam_scores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE material_distributions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE material_progress ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE books ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE book_lendings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_todos ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE todo_templates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- =====================================================
