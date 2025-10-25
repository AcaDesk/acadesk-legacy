/**
 * Database types matching Supabase schema
 */

import type { UUID, Timestamps, TenantScoped } from './common'

// ============================================================================
// User Profiles
// ============================================================================
export interface UserProfile extends Timestamps {
  id: UUID
  tenant_id?: UUID | null
  email: string
  name: string
  phone?: string | null
  academy_name?: string | null
  role: 'admin' | 'teacher' | 'staff'
}

// ============================================================================
// Tenants
// ============================================================================
export interface Tenant extends Timestamps {
  tenant_id: UUID
  name: string
  timezone: string
  settings: Record<string, unknown>
}

// ============================================================================
// Reference Codes
// ============================================================================
export interface RefCodeType {
  code_type: string
  label: string
  description?: string | null
}

export interface RefCode {
  code_type: string
  code: string
  label: string
  sort_order: number
  is_active: boolean
}

export interface TenantCode extends TenantScoped {
  code_type: string
  code: string
  label: string
  sort_order: number
  is_active: boolean
}

// ============================================================================
// Students
// ============================================================================
export interface Student extends TenantScoped, Timestamps {
  id: UUID
  user_id?: UUID | null
  student_code: string
  name: string
  grade?: string | null
  school?: string | null
  enrollment_date?: string | null
  gender?: 'male' | 'female' | 'other' | null
  student_phone?: string | null
  commute_method?: string | null
  marketing_source?: string | null
  notes?: string | null
  birth_date?: string | null
  profile_image_url?: string | null
  kiosk_pin?: string | null
  deleted_at?: string | null
  meta?: Record<string, unknown>
}

// ============================================================================
// Guardians
// ============================================================================
export interface Guardian extends TenantScoped, Timestamps {
  id: UUID
  user_id?: UUID | null
  name: string
  phone?: string | null
  email?: string | null
  relationship?: string | null
  occupation?: string | null
  address?: string | null
  notes?: string | null
  deleted_at?: string | null
}

export interface StudentGuardian extends TenantScoped {
  id: UUID
  student_id: UUID
  guardian_id: UUID
  relation?: string | null
  is_primary_contact: boolean
  receives_notifications: boolean
  receives_billing: boolean
  can_pickup: boolean
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

// ============================================================================
// Classes
// ============================================================================
export interface Class extends TenantScoped, Timestamps {
  class_id: UUID
  class_code?: string | null
  name: string
  description?: string | null
  teacher_id?: UUID | null
  start_date?: string | null
  end_date?: string | null
  is_active: boolean
  meta: Record<string, unknown>
}

export interface ClassEnrollment extends TenantScoped, Timestamps {
  enrollment_id: UUID
  class_id: UUID
  student_id: UUID
  enrolled_at: string
  withdrawn_at?: string | null
}

export interface ClassSession extends TenantScoped, Timestamps {
  session_id: UUID
  class_id: UUID
  scheduled_at: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled'
  notes?: string | null
}

// ============================================================================
// Attendance
// ============================================================================
export interface Attendance extends TenantScoped, Timestamps {
  attendance_id: UUID
  session_id: UUID
  student_id: UUID
  status: string
  arrived_at?: string | null
  notes?: string | null
}

// ============================================================================
// Student TODOs
// ============================================================================
export interface StudentTodo extends TenantScoped, Timestamps {
  id: UUID
  student_id: UUID
  title: string
  description?: string | null
  subject?: string | null
  due_date?: string | null
  due_day_of_week?: number | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  completed_at?: string | null
  verified_at?: string | null
  verified_by?: UUID | null
}

// ============================================================================
// Exams
// ============================================================================
export interface Exam extends TenantScoped, Timestamps {
  id: UUID
  name: string
  category_code?: string | null
  exam_type?: string | null
  exam_date?: string | null
  class_id?: UUID | null
  total_questions?: number | null
  passing_score?: number | null
  description?: string | null
  deleted_at?: string | null
}

export interface ExamScore extends TenantScoped, Timestamps {
  id: UUID
  exam_id: UUID
  student_id: UUID
  percentage?: number | null
  feedback?: string | null
  deleted_at?: string | null
}

// ============================================================================
// Tasks (legacy - for future features)
// ============================================================================
export interface Task extends TenantScoped, Timestamps {
  task_id: UUID
  class_id?: UUID | null
  title: string
  description?: string | null
  due_date?: string | null
  created_by?: UUID | null
}

export interface TaskAssignment extends Timestamps {
  assignment_id: UUID
  task_id: UUID
  student_id: UUID
  status: string
  submitted_at?: string | null
  graded_at?: string | null
  grade?: number | null
  feedback?: string | null
}
