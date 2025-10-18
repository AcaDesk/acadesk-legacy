/**
 * Get Student Detail Use Case
 * 학생 상세 정보 조회 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/server'
import { DatabaseError, NotFoundError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

export interface StudentDetailDTO {
  id: string
  student_code: string
  grade: string | null
  school: string | null
  enrollment_date: string
  birth_date: string | null
  gender: string | null
  student_phone: string | null
  profile_image_url: string | null
  commute_method: string | null
  marketing_source: string | null
  emergency_contact: string | null
  notes: string | null
  users: {
    name: string
    email: string | null
    phone: string | null
  } | null
  student_guardians: Array<{
    guardians: {
      id: string
      relationship: string | null
      users: {
        name: string
        phone: string | null
      }
    }
  }>
  class_enrollments: Array<{
    id: string
    class_id: string
    status: string
    enrolled_at: string
    end_date: string | null
    withdrawal_reason: string | null
    notes: string | null
    classes: {
      id: string
      name: string
      subject: string | null
      instructor_id: string | null
    }
  }>
  student_schedules: Array<{
    day_of_week: number
    scheduled_arrival_time: string
  }>
}

export class GetStudentDetailUseCase {
  async execute(studentId: string): Promise<StudentDetailDTO> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_code,
          grade,
          school,
          enrollment_date,
          birth_date,
          gender,
          student_phone,
          profile_image_url,
          commute_method,
          marketing_source,
          emergency_contact,
          notes,
          users (
            name,
            email,
            phone
          ),
          student_guardians (
            guardians (
              id,
              relationship,
              users (
                name,
                phone
              )
            )
          ),
          class_enrollments (
            id,
            class_id,
            status,
            enrolled_at,
            end_date,
            withdrawal_reason,
            notes,
            classes (
              id,
              name,
              subject,
              instructor_id
            )
          ),
          student_schedules (
            day_of_week,
            scheduled_arrival_time
          )
        `)
        .eq('id', studentId)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        logError(error, {
          useCase: 'GetStudentDetailUseCase',
          method: 'execute',
          studentId
        })
        throw new DatabaseError('학생 정보를 조회할 수 없습니다', error)
      }

      if (!data) {
        throw new NotFoundError('학생')
      }

      return data as unknown as StudentDetailDTO
    } catch (error) {
      if (error instanceof DatabaseError || error instanceof NotFoundError) throw error
      logError(error, { useCase: 'GetStudentDetailUseCase', method: 'execute' })
      throw new DatabaseError('학생 정보를 조회할 수 없습니다')
    }
  }
}
