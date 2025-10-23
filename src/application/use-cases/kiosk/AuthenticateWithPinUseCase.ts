/**
 * Authenticate With Pin Use Case
 * PIN으로 학생 인증 유스케이스 - Application Layer
 */

import { createClient } from '@/lib/supabase/client'
import { AuthorizationError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'

export interface StudentDTO {
  id: string
  tenantId: string
  studentCode: string
  name: string
  grade: string | null
  profileImageUrl: string | null
}

export class AuthenticateWithPinUseCase {
  private supabase = createClient()

  async execute(studentCode: string, pin: string): Promise<StudentDTO> {
    try {
      // 학생 코드와 PIN으로 조회
      const { data: student, error } = await this.supabase
        .from('students')
        .select('id, tenant_id, student_code, name, grade, profile_image_url, kiosk_pin')
        .eq('student_code', studentCode.toUpperCase())
        .eq('kiosk_pin', pin)
        .is('deleted_at', null)
        .single()

      if (error || !student) {
        logError(error, {
          useCase: 'AuthenticateWithPinUseCase',
          method: 'execute',
          studentCode
        })
        throw new AuthorizationError('학생 코드 또는 PIN이 일치하지 않습니다')
      }

      // Map database columns to DTO
      return {
        id: student.id,
        tenantId: student.tenant_id,
        studentCode: student.student_code,
        name: student.name,
        grade: student.grade,
        profileImageUrl: student.profile_image_url,
      }
    } catch (error) {
      if (error instanceof AuthorizationError) throw error
      logError(error, { useCase: 'AuthenticateWithPinUseCase', method: 'execute' })
      throw new AuthorizationError('인증 중 오류가 발생했습니다')
    }
  }
}
