/**
 * Guardian Management Server Actions
 *
 * 모든 보호자 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 * 클라이언트에서 직접 Supabase CUD를 사용하지 않습니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Validation Schemas
// ============================================================================

const createGuardianSchema = z.object({
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 형식이 아닙니다').nullable().optional(),
  phone: z.string().min(1, '연락처를 입력해주세요'),
  relationship: z.string().min(1, '관계를 선택해주세요'),
  occupation: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  student_ids: z.array(z.string().uuid()).optional(),
})

const updateGuardianSchema = z.object({
  guardian_id: z.string().uuid('유효한 보호자 ID가 아닙니다'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  email: z.string().email('올바른 이메일 형식이 아닙니다').nullable().optional(),
  phone: z.string().min(1, '연락처를 입력해주세요'),
  relationship: z.string().min(1, '관계를 선택해주세요'),
  occupation: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})

// ============================================================================
// Server Actions
// ============================================================================

/**
 * 보호자 생성
 * @param data - 보호자 데이터
 * @returns 생성된 보호자 또는 에러
 */
export async function createGuardian(data: z.infer<typeof createGuardianSchema>) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. 입력값 검증
    const validatedData = createGuardianSchema.parse(data)

    // 3. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    // 트랜잭션 시뮬레이션 (Supabase에서는 RPC를 사용하거나 순차적으로 처리)
    // 3-1. users 테이블에 보호자 생성
    const { data: newUser, error: userCreateError } = await supabase
      .from('users')
      .insert({
        tenant_id: tenantId,
        email: validatedData.email || null,
        name: validatedData.name,
        phone: validatedData.phone,
        role_code: 'guardian',
      })
      .select()
      .single()

    if (userCreateError || !newUser) {
      throw new Error(`사용자 레코드 생성 실패: ${userCreateError?.message}`)
    }

    // 3-2. guardians 테이블에 보호자 정보 저장
    const { data: newGuardian, error: guardianError } = await supabase
      .from('guardians')
      .insert({
        tenant_id: tenantId,
        user_id: newUser.id,
        relationship: validatedData.relationship,
      })
      .select()
      .single()

    if (guardianError || !newGuardian) {
      throw new Error(`보호자 정보 생성 실패: ${guardianError?.message}`)
    }

    // 3-3. 선택된 학생들과 연결
    if (validatedData.student_ids && validatedData.student_ids.length > 0) {
      const guardianStudentRecords = validatedData.student_ids.map((studentId) => ({
        tenant_id: tenantId,
        student_id: studentId,
        guardian_id: newGuardian.id,
        relation: validatedData.relationship,
        is_primary: false,
      }))

      const { error: linkError } = await supabase
        .from('student_guardians')
        .insert(guardianStudentRecords)

      if (linkError) {
        console.warn('학생 연결 오류:', linkError)
      }
    }

    // 4. 캐시 무효화
    revalidatePath('/guardians')

    return { success: true, data: newGuardian }
  } catch (error) {
    console.error('createGuardian error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 보호자 정보 수정
 * @param data - 수정할 보호자 데이터
 * @returns 수정된 보호자 또는 에러
 */
export async function updateGuardian(data: z.infer<typeof updateGuardianSchema>) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. 입력값 검증
    const validatedData = updateGuardianSchema.parse(data)

    // 3. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    // 3-1. guardian에서 user_id 조회
    const { data: guardian, error: guardianError } = await supabase
      .from('guardians')
      .select('user_id')
      .eq('id', validatedData.guardian_id)
      .eq('tenant_id', tenantId)
      .single()

    if (guardianError || !guardian) {
      throw new Error('보호자 정보를 찾을 수 없습니다')
    }

    // 3-2. users 테이블 업데이트
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        name: validatedData.name,
        email: validatedData.email || null,
        phone: validatedData.phone,
      })
      .eq('id', guardian.user_id)
      .eq('tenant_id', tenantId)

    if (userUpdateError) {
      throw new Error(`사용자 정보 수정 실패: ${userUpdateError.message}`)
    }

    // 3-3. guardians 테이블 업데이트
    const { data: updatedGuardian, error: updateError } = await supabase
      .from('guardians')
      .update({
        relationship: validatedData.relationship,
      })
      .eq('id', validatedData.guardian_id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`보호자 정보 수정 실패: ${updateError.message}`)
    }

    // 4. 캐시 무효화
    revalidatePath('/guardians')
    revalidatePath(`/guardians/${validatedData.guardian_id}`)

    return { success: true, data: updatedGuardian }
  } catch (error) {
    console.error('updateGuardian error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 보호자 삭제 (Soft Delete)
 * @param guardianId - 보호자 ID
 * @returns 성공 여부
 */
export async function deleteGuardian(guardianId: string) {
  try {
    // 1. 권한 검증 (staff)
    const { tenantId } = await verifyStaff()

    // 2. Service Role 클라이언트로 DB 작업
    const supabase = await createServiceRoleClient()

    // 2-1. guardian에서 user_id 조회
    const { data: guardian, error: guardianError } = await supabase
      .from('guardians')
      .select('user_id')
      .eq('id', guardianId)
      .eq('tenant_id', tenantId)
      .single()

    if (guardianError || !guardian) {
      throw new Error('보호자 정보를 찾을 수 없습니다')
    }

    // 2-2. users 테이블 소프트 삭제
    const { error: userDeleteError } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', guardian.user_id)
      .eq('tenant_id', tenantId)

    if (userDeleteError) {
      throw new Error(`사용자 삭제 실패: ${userDeleteError.message}`)
    }

    // 2-3. guardians 테이블 소프트 삭제
    const { error: deleteError } = await supabase
      .from('guardians')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', guardianId)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      throw new Error(`보호자 삭제 실패: ${deleteError.message}`)
    }

    // 3. 캐시 무효화
    revalidatePath('/guardians')

    return { success: true }
  } catch (error) {
    console.error('deleteGuardian error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
