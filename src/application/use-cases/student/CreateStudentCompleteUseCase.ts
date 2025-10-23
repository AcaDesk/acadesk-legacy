/**
 * Create Student Complete Use Case
 * 학생과 보호자를 함께 생성하는 유스케이스
 */

import type { IDataSource } from '@/domain/data-sources/IDataSource'

export interface CreateStudentCompleteInput {
  student: {
    name: string
    birth_date: string | null
    grade: string
    school: string | null
    gender: string | null
    email: string | null
    student_phone: string | null
    profile_image_url: string | null
    enrollment_date: string
    notes: string | null
    commute_method: string | null
    marketing_source: string | null
    kiosk_pin: string | null
  }
  guardian: any | null
  guardianMode: 'new' | 'existing' | 'skip'
}

export interface CreateStudentCompleteOutput {
  success: boolean
  data?: any
  error: Error | null
}

export class CreateStudentCompleteUseCase {
  constructor(private readonly dataSource: IDataSource) {}

  async execute(input: CreateStudentCompleteInput): Promise<CreateStudentCompleteOutput> {
    try {
      const { data: result, error: rpcError } = await this.dataSource.rpc('create_student_complete', {
        _student: input.student,
        _guardian: input.guardian,
        _guardian_mode: input.guardianMode,
      })

      if (rpcError) {
        throw rpcError
      }

      // Check RPC response format
      if (!result || typeof result !== 'object') {
        throw new Error('서버 응답이 올바르지 않습니다.')
      }

      // Handle RPC result
      if ('ok' in result && !result.ok) {
        // Error response from RPC
        const errorCode = (result as any).code || 'unknown_error'
        const errorMessage = (result as any).message || '학생을 추가하는 중 오류가 발생했습니다.'
        throw new Error(`[${errorCode}] ${errorMessage}`)
      }

      // Success response
      const responseData = (result as any).data || result

      return {
        success: true,
        data: responseData,
        error: null,
      }
    } catch (error) {
      console.error('[CreateStudentCompleteUseCase] Error:', error)
      return {
        success: false,
        error: error as Error,
      }
    }
  }
}
