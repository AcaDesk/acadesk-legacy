// Database types - Will be auto-generated after migration
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          timezone: string
          settings: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['tenants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tenants']['Insert']>
      }
      users: {
        Row: {
          id: string
          tenant_id: string
          email: string | null
          name: string
          role_code: string
          phone: string | null
          avatar_url: string | null
          settings: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      students: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          student_code: string
          grade: string | null
          school: string | null
          enrollment_date: string
          emergency_contact: string | null
          notes: string | null
          meta: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['students']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['students']['Insert']>
      }
      exams: {
        Row: {
          id: string
          tenant_id: string
          class_id: string | null
          name: string
          category_code: string
          exam_type: string | null
          exam_date: string | null
          total_questions: number | null
          recurring_schedule: string | null
          is_recurring: boolean
          description: string | null
          meta: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['exams']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['exams']['Insert']>
      }
      exam_scores: {
        Row: {
          id: string
          tenant_id: string
          exam_id: string
          student_id: string
          correct_answers: number | null
          total_questions: number | null
          score: number | null
          percentage: number | null
          grade: string | null
          is_retest: boolean
          retest_count: number
          original_score_id: string | null
          feedback: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['exam_scores']['Row'], 'id' | 'created_at' | 'updated_at' | 'percentage'>
        Update: Partial<Database['public']['Tables']['exam_scores']['Insert']>
      }
      reports: {
        Row: {
          id: string
          tenant_id: string
          student_id: string
          report_type: string
          period_start: string
          period_end: string
          content: Json
          generated_at: string
          sent_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['reports']['Row'], 'id' | 'generated_at' | 'created_at'>
        Update: Partial<Database['public']['Tables']['reports']['Insert']>
      }
      classes: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          instructor_id: string | null
          subject: string | null
          grade_level: string | null
          capacity: number | null
          schedule: Json
          room: string | null
          active: boolean
          meta: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['classes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['classes']['Insert']>
      }
      attendance: {
        Row: {
          id: string
          tenant_id: string
          session_id: string
          student_id: string
          status: string
          check_in_at: string | null
          check_out_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['attendance']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['attendance']['Insert']>
      }
      student_todos: {
        Row: {
          id: string
          tenant_id: string
          student_id: string
          title: string
          description: string | null
          subject: string | null
          due_date: string
          due_day_of_week: number | null
          priority: string
          estimated_duration_minutes: number | null
          completed_at: string | null
          verified_by: string | null
          verified_at: string | null
          notes: string | null
          meta: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['student_todos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['student_todos']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
