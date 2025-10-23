/**
 * Authenticate With Pin Use Case (Server-side)
 * PIN으로 학생 인증 유스케이스 - Application Layer
 *
 * Server-side only - bcrypt 검증 포함
 */

import bcrypt from 'bcryptjs'
import type { IStudentRepository } from '@core/domain/repositories/IStudentRepository'
import { AuthorizationError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'
import {
  logKioskLoginAttempt,
  logKioskLoginSuccess,
  logKioskLoginFailed,
} from '@/lib/audit-logger'

export interface StudentDTO {
  id: string
  tenantId: string
  studentCode: string
  name: string
  grade: string | null
  profileImageUrl: string | null
}

export interface AuthResult {
  success: boolean
  student?: StudentDTO
  error?: string
}

export class AuthenticateWithPinUseCase {
  constructor(
    private studentRepository: IStudentRepository,
    private tenantId: string
  ) {}

  async execute(studentCode: string, pin: string): Promise<AuthResult> {
    try {
      // 로그인 시도 기록
      logKioskLoginAttempt({
        studentCode: studentCode.toUpperCase(),
        tenantId: this.tenantId,
      })

      // 학생 조회 (kiosk_pin 포함)
      const student = await this.studentRepository.findByStudentCodeForKiosk(
        studentCode.toUpperCase(),
        this.tenantId
      )

      if (!student) {
        logKioskLoginFailed({
          studentCode: studentCode.toUpperCase(),
          tenantId: this.tenantId,
          reason: '학생을 찾을 수 없습니다',
        })
        return {
          success: false,
          error: '학생을 찾을 수 없습니다.',
        }
      }

      // PIN 확인
      const kioskPin = student.kioskPin
      if (!kioskPin) {
        logKioskLoginFailed({
          studentCode: studentCode.toUpperCase(),
          tenantId: this.tenantId,
          reason: 'PIN이 설정되지 않음',
        })
        return {
          success: false,
          error: 'PIN이 설정되지 않았습니다. 선생님께 문의하세요.',
        }
      }

      // PIN 검증
      // bcrypt 해시인 경우 비교, 평문인 경우 직접 비교 (하위 호환성)
      let isValid = false
      if (kioskPin.startsWith('$2')) {
        // bcrypt 해시 (시작이 $2a, $2b, $2y 등)
        isValid = await bcrypt.compare(pin, kioskPin)
      } else {
        // 평문 (레거시)
        isValid = pin === kioskPin
      }

      if (!isValid) {
        logKioskLoginFailed({
          studentCode: studentCode.toUpperCase(),
          tenantId: this.tenantId,
          reason: 'PIN 불일치',
        })
        return {
          success: false,
          error: 'PIN이 일치하지 않습니다.',
        }
      }

      // StudentDTO 생성 (PIN 제외)
      const studentDTO: StudentDTO = {
        id: student.id,
        tenantId: student.tenantId,
        studentCode: student.studentCode.getValue(),
        name: student.name,
        grade: student.grade,
        profileImageUrl: student.profileImageUrl,
      }

      // 로그인 성공 기록
      logKioskLoginSuccess({
        studentId: student.id,
        studentCode: student.studentCode.getValue(),
        tenantId: this.tenantId,
      })

      return {
        success: true,
        student: studentDTO,
      }
    } catch (error) {
      logError(error, {
        useCase: 'AuthenticateWithPinUseCase',
        method: 'execute',
        studentCode,
      })

      if (error instanceof AuthorizationError) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: false,
        error: '인증 중 오류가 발생했습니다.',
      }
    }
  }
}
