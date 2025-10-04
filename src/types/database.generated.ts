export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          session_id: string | null
          status: string
          student_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          session_id?: string | null
          status: string
          student_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          session_id?: string | null
          status?: string
          student_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          actual_end_at: string | null
          actual_start_at: string | null
          class_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          scheduled_end_at: string
          scheduled_start_at: string
          session_date: string
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          class_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          scheduled_end_at: string
          scheduled_start_at: string
          session_date: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_end_at?: string | null
          actual_start_at?: string | null
          class_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          scheduled_end_at?: string
          scheduled_start_at?: string
          session_date?: string
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      book_lendings: {
        Row: {
          book_id: string | null
          borrowed_at: string
          created_at: string | null
          due_date: string
          id: string
          notes: string | null
          reminder_sent_at: string | null
          return_condition: string | null
          returned_at: string | null
          student_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          book_id?: string | null
          borrowed_at?: string
          created_at?: string | null
          due_date: string
          id?: string
          notes?: string | null
          reminder_sent_at?: string | null
          return_condition?: string | null
          returned_at?: string | null
          student_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          book_id?: string | null
          borrowed_at?: string
          created_at?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          reminder_sent_at?: string | null
          return_condition?: string | null
          returned_at?: string | null
          student_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "book_lendings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_lendings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_lendings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string | null
          available_copies: number | null
          barcode: string | null
          category_code: string | null
          condition: string | null
          cover_image_url: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          isbn: string | null
          level: string | null
          meta: Json | null
          notes: string | null
          publisher: string | null
          tenant_id: string | null
          title: string
          total_copies: number | null
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          available_copies?: number | null
          barcode?: string | null
          category_code?: string | null
          condition?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          isbn?: string | null
          level?: string | null
          meta?: Json | null
          notes?: string | null
          publisher?: string | null
          tenant_id?: string | null
          title: string
          total_copies?: number | null
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          available_copies?: number | null
          barcode?: string | null
          category_code?: string | null
          condition?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          isbn?: string | null
          level?: string | null
          meta?: Json | null
          notes?: string | null
          publisher?: string | null
          tenant_id?: string | null
          title?: string
          total_copies?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "ref_book_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "books_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      class_enrollments: {
        Row: {
          class_id: string | null
          created_at: string | null
          enrolled_at: string | null
          id: string
          status: string | null
          student_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          status?: string | null
          student_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string | null
          enrolled_at?: string | null
          id?: string
          status?: string | null
          student_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_enrollments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          active: boolean | null
          capacity: number | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          grade_level: string | null
          id: string
          instructor_id: string | null
          meta: Json | null
          name: string
          room: string | null
          schedule: Json | null
          subject: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          capacity?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          grade_level?: string | null
          id?: string
          instructor_id?: string | null
          meta?: Json | null
          name: string
          room?: string | null
          schedule?: Json | null
          subject?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          capacity?: number | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          grade_level?: string | null
          id?: string
          instructor_id?: string | null
          meta?: Json | null
          name?: string
          room?: string | null
          schedule?: Json | null
          subject?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          attendees: string[] | null
          consultation_date: string
          consultation_time: string | null
          consultation_type: string | null
          content: string
          created_at: string | null
          deleted_at: string | null
          duration_minutes: number | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          instructor_id: string | null
          meta: Json | null
          student_id: string | null
          tenant_id: string | null
          topics: string[] | null
          updated_at: string | null
        }
        Insert: {
          attendees?: string[] | null
          consultation_date: string
          consultation_time?: string | null
          consultation_type?: string | null
          content: string
          created_at?: string | null
          deleted_at?: string | null
          duration_minutes?: number | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          instructor_id?: string | null
          meta?: Json | null
          student_id?: string | null
          tenant_id?: string | null
          topics?: string[] | null
          updated_at?: string | null
        }
        Update: {
          attendees?: string[] | null
          consultation_date?: string
          consultation_time?: string | null
          consultation_type?: string | null
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          duration_minutes?: number | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          instructor_id?: string | null
          meta?: Json | null
          student_id?: string | null
          tenant_id?: string | null
          topics?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_consultation_type_fkey"
            columns: ["consultation_type"]
            isOneToOne: false
            referencedRelation: "ref_consultation_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "consultations_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_scores: {
        Row: {
          correct_answers: number | null
          created_at: string | null
          exam_id: string | null
          feedback: string | null
          grade: string | null
          id: string
          is_retest: boolean | null
          original_score_id: string | null
          percentage: number | null
          retest_count: number | null
          score: number | null
          student_id: string | null
          tenant_id: string | null
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          correct_answers?: number | null
          created_at?: string | null
          exam_id?: string | null
          feedback?: string | null
          grade?: string | null
          id?: string
          is_retest?: boolean | null
          original_score_id?: string | null
          percentage?: number | null
          retest_count?: number | null
          score?: number | null
          student_id?: string | null
          tenant_id?: string | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          correct_answers?: number | null
          created_at?: string | null
          exam_id?: string | null
          feedback?: string | null
          grade?: string | null
          id?: string
          is_retest?: boolean | null
          original_score_id?: string | null
          percentage?: number | null
          retest_count?: number | null
          score?: number | null
          student_id?: string | null
          tenant_id?: string | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_scores_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_scores_original_score_id_fkey"
            columns: ["original_score_id"]
            isOneToOne: false
            referencedRelation: "exam_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          category_code: string | null
          class_id: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          exam_date: string | null
          exam_type: string | null
          id: string
          is_recurring: boolean | null
          meta: Json | null
          name: string
          recurring_schedule: string | null
          tenant_id: string | null
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          category_code?: string | null
          class_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          exam_date?: string | null
          exam_type?: string | null
          id?: string
          is_recurring?: boolean | null
          meta?: Json | null
          name: string
          recurring_schedule?: string | null
          tenant_id?: string | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          category_code?: string | null
          class_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          exam_date?: string | null
          exam_type?: string | null
          id?: string
          is_recurring?: boolean | null
          meta?: Json | null
          name?: string
          recurring_schedule?: string | null
          tenant_id?: string | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "ref_exam_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string | null
          id: string
          relationship: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          relationship?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          relationship?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardians_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      material_distributions: {
        Row: {
          created_at: string | null
          distributed_at: string
          id: string
          material_id: string | null
          notes: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_status: string | null
          student_id: string | null
          tenant_id: string | null
          track_progress: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          distributed_at?: string
          id?: string
          material_id?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          student_id?: string | null
          tenant_id?: string | null
          track_progress?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          distributed_at?: string
          id?: string
          material_id?: string | null
          notes?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_status?: string | null
          student_id?: string | null
          tenant_id?: string | null
          track_progress?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_distributions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_distributions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_distributions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      material_progress: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          created_at: string | null
          distribution_id: string | null
          id: string
          instructor_comment: string | null
          material_id: string | null
          student_id: string | null
          tenant_id: string | null
          unit_name: string | null
          unit_number: number
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          distribution_id?: string | null
          id?: string
          instructor_comment?: string | null
          material_id?: string | null
          student_id?: string | null
          tenant_id?: string | null
          unit_name?: string | null
          unit_number: number
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          created_at?: string | null
          distribution_id?: string | null
          id?: string
          instructor_comment?: string | null
          material_id?: string | null
          student_id?: string | null
          tenant_id?: string | null
          unit_name?: string | null
          unit_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_progress_distribution_id_fkey"
            columns: ["distribution_id"]
            isOneToOne: false
            referencedRelation: "material_distributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_progress_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_progress_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          active: boolean | null
          barcode: string | null
          category_code: string | null
          cover_image_url: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          isbn: string | null
          meta: Json | null
          name: string
          price: number | null
          publisher: string | null
          tenant_id: string | null
          total_units: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          barcode?: string | null
          category_code?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          isbn?: string | null
          meta?: Json | null
          name: string
          price?: number | null
          publisher?: string | null
          tenant_id?: string | null
          total_units?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          barcode?: string | null
          category_code?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          isbn?: string | null
          meta?: Json | null
          name?: string
          price?: number | null
          publisher?: string | null
          tenant_id?: string | null
          total_units?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "ref_material_categories"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "materials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          cost: number | null
          created_at: string | null
          error_message: string | null
          guardian_id: string | null
          id: string
          message_body: string
          message_subject: string | null
          meta: Json | null
          notification_type: string | null
          provider: string | null
          provider_message_id: string | null
          recipient_email: string | null
          recipient_phone: string | null
          scheduled_at: string | null
          send_method: string | null
          sent_at: string | null
          status: string | null
          student_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          guardian_id?: string | null
          id?: string
          message_body: string
          message_subject?: string | null
          meta?: Json | null
          notification_type?: string | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          scheduled_at?: string | null
          send_method?: string | null
          sent_at?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          error_message?: string | null
          guardian_id?: string | null
          id?: string
          message_body?: string
          message_subject?: string | null
          meta?: Json | null
          notification_type?: string | null
          provider?: string | null
          provider_message_id?: string | null
          recipient_email?: string | null
          recipient_phone?: string | null
          scheduled_at?: string | null
          send_method?: string | null
          sent_at?: string | null
          status?: string | null
          student_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_notification_type_fkey"
            columns: ["notification_type"]
            isOneToOne: false
            referencedRelation: "ref_notification_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ref_book_categories: {
        Row: {
          active: boolean | null
          code: string
          description: string | null
          label: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          description?: string | null
          label: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          description?: string | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      ref_consultation_types: {
        Row: {
          active: boolean | null
          code: string
          description: string | null
          label: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          description?: string | null
          label: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          description?: string | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      ref_exam_categories: {
        Row: {
          active: boolean | null
          code: string
          description: string | null
          label: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          description?: string | null
          label: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          description?: string | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      ref_material_categories: {
        Row: {
          active: boolean | null
          code: string
          description: string | null
          label: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          description?: string | null
          label: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          description?: string | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      ref_notification_types: {
        Row: {
          active: boolean | null
          code: string
          description: string | null
          label: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          description?: string | null
          label: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          description?: string | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      ref_roles: {
        Row: {
          active: boolean | null
          code: string
          description: string | null
          label: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          description?: string | null
          label: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          description?: string | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      ref_status_codes: {
        Row: {
          active: boolean | null
          category: string
          code: string
          description: string | null
          label: string
          sort_order: number | null
        }
        Insert: {
          active?: boolean | null
          category: string
          code: string
          description?: string | null
          label: string
          sort_order?: number | null
        }
        Update: {
          active?: boolean | null
          category?: string
          code?: string
          description?: string | null
          label?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          content: Json
          created_at: string | null
          generated_at: string | null
          id: string
          period_end: string
          period_start: string
          report_type: string
          sent_at: string | null
          student_id: string | null
          tenant_id: string | null
        }
        Insert: {
          content: Json
          created_at?: string | null
          generated_at?: string | null
          id?: string
          period_end: string
          period_start: string
          report_type: string
          sent_at?: string | null
          student_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          generated_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          report_type?: string
          sent_at?: string | null
          student_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          can_pickup: boolean | null
          can_view_reports: boolean | null
          created_at: string | null
          guardian_id: string | null
          id: string
          is_primary: boolean | null
          student_id: string | null
          tenant_id: string | null
        }
        Insert: {
          can_pickup?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          guardian_id?: string | null
          id?: string
          is_primary?: boolean | null
          student_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          can_pickup?: boolean | null
          can_view_reports?: boolean | null
          created_at?: string | null
          guardian_id?: string | null
          id?: string
          is_primary?: boolean | null
          student_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_schedules: {
        Row: {
          active: boolean | null
          created_at: string | null
          day_of_week: number
          id: string
          notes: string | null
          scheduled_arrival_time: string
          student_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          day_of_week: number
          id?: string
          notes?: string | null
          scheduled_arrival_time: string
          student_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          day_of_week?: number
          id?: string
          notes?: string | null
          scheduled_arrival_time?: string
          student_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_schedules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_todos: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string
          due_day_of_week: number | null
          estimated_duration_minutes: number | null
          id: string
          meta: Json | null
          notes: string | null
          priority: string | null
          student_id: string | null
          subject: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          due_day_of_week?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          meta?: Json | null
          notes?: string | null
          priority?: string | null
          student_id?: string | null
          subject?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          due_day_of_week?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          meta?: Json | null
          notes?: string | null
          priority?: string | null
          student_id?: string | null
          subject?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_todos_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_todos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_todos_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          emergency_contact: string | null
          enrollment_date: string | null
          grade: string | null
          id: string
          meta: Json | null
          notes: string | null
          school: string | null
          student_code: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          emergency_contact?: string | null
          enrollment_date?: string | null
          grade?: string | null
          id?: string
          meta?: Json | null
          notes?: string | null
          school?: string | null
          student_code: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          emergency_contact?: string | null
          enrollment_date?: string | null
          grade?: string | null
          id?: string
          meta?: Json | null
          notes?: string | null
          school?: string | null
          student_code?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      todo_templates: {
        Row: {
          active: boolean | null
          created_at: string | null
          day_of_week: number | null
          description: string | null
          estimated_duration_minutes: number | null
          id: string
          priority: string | null
          subject: string | null
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          day_of_week?: number | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          priority?: string | null
          subject?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          day_of_week?: number | null
          description?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          priority?: string | null
          subject?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todo_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          role_code: string | null
          settings: Json | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          role_code?: string | null
          settings?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role_code?: string | null
          settings?: Json | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "ref_roles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
