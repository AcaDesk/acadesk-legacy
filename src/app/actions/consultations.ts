/**
 * Consultation Management Server Actions
 *
 * 모든 상담 기록 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 * 클라이언트에서 직접 Supabase CUD를 사용하지 않습니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyRole } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Validation Schemas
// ============================================================================

const createConsultationSchema = z.object({
  student_id: z.string().uuid('유효한 학생 ID가 아닙니다'),
  consultation_date: z.string().min(1, '상담 날짜는 필수입니다'),
  consultation_type: z.string().min(1, '상담 유형은 필수입니다'),
  content: z.string().min(1, '상담 내용은 필수입니다'),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 상담 기록 생성
 * @param data - 상담 기록 데이터
 * @returns 생성된 상담 기록 또는 에러
 */
export async function createConsultation(
  data: z.infer<typeof createConsultationSchema>
) {
  try {
    // 1. 권한 검증 (instructor 이상)
    const { tenantId, userId } = await verifyRole(['owner', 'instructor'])

    // 2. 입력값 검증
    const validatedData = createConsultationSchema.parse(data)

    // 3. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    const { data: consultation, error } = await supabase
      .from('consultations')
      .insert({
        tenant_id: tenantId,
        student_id: validatedData.student_id,
        consultation_date: validatedData.consultation_date,
        consultation_type: validatedData.consultation_type,
        content: validatedData.content,
        instructor_id: userId,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`상담 기록 생성 실패: ${error.message}`)
    }

    // 4. 캐시 무효화
    revalidatePath(`/students/${validatedData.student_id}`)

    return { success: true, data: consultation }
  } catch (error) {
    console.error('createConsultation error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
