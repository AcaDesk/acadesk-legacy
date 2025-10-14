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
  emergency_contact?: string | null
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
  relationship?: string | null
  emergency_phone?: string | null
  occupation?: string | null
  address?: string | null
  deleted_at?: string | null
}

export interface StudentGuardian extends TenantScoped {
  id: UUID
  student_id: UUID
  guardian_id: UUID
  is_primary: boolean
  can_pickup: boolean
  can_view_reports: boolean
  relation?: string | null
  created_at: string
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
  enrolled_at: Date
  withdrawn_at?: Date | null
}

export interface ClassSession extends TenantScoped, Timestamps {
  session_id: UUID
  class_id: UUID
  scheduled_at: Date
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
  arrived_at?: Date | null
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
  submitted_at?: Date | null
  graded_at?: Date | null
  grade?: number | null
  feedback?: string | null
}
