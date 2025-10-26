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
    const supabase = createServiceRoleClient()

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
        is_primary_contact: false,
        can_view_reports: true,
        receives_notifications: true,
        receives_billing: false,
        can_pickup: true,
      }))

      const { error: linkError } = await supabase
        .from('student_guardians')
        .insert(guardianStudentRecords)

      if (linkError) {
        throw new Error('학생과 보호자를 연결하는 데 실패했습니다: ' + linkError.message)
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
    const supabase = createServiceRoleClient()

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
    const supabase = createServiceRoleClient()

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

/**
 * 모든 보호자 목록과 연결된 학생 정보 조회
 * @returns 보호자 목록 (학생 정보 포함)
 */
export async function getGuardiansWithDetails() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 1. 모든 보호자 조회 (users 정보 포함)
    const { data: guardians, error: guardiansError } = await supabase
      .from('guardians')
      .select(`
        id,
        user_id,
        relationship,
        users (
          name,
          email,
          phone
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (guardiansError) throw guardiansError

    // 2. 각 보호자에 대해 연결된 학생 정보 조회
    const guardiansWithDetails = await Promise.all(
      (guardians || []).map(async (guardian) => {
        const { data: studentLinks, error: studentsError } = await supabase
          .from('student_guardians')
          .select(`
            relation,
            is_primary,
            students (
              id,
              student_code,
              users (
                name
              )
            )
          `)
          .eq('guardian_id', guardian.id)
          .eq('tenant_id', tenantId)

        if (studentsError) {
          console.error('[getGuardiansWithDetails] Error loading students:', studentsError)
        }

        // 타입 안전한 변환
        // TODO(any): Supabase nested query types are not properly inferred
        const users = guardian.users as any
        const students = (studentLinks || []).map((link) => {
          const student = link.students as any
          return {
            id: student?.id || '',
            studentCode: student?.student_code || '',
            name: student?.users?.name || '',
            relation: link.relation || '',
            isPrimary: link.is_primary || false,
          }
        })

        return {
          guardian: {
            id: guardian.id,
            relationship: guardian.relationship,
          },
          userName: users?.name || null,
          userEmail: users?.email || null,
          userPhone: users?.phone || null,
          students,
        }
      })
    )

    return { success: true, data: guardiansWithDetails, error: null }
  } catch (error) {
    console.error('[getGuardiansWithDetails] Error:', error)
    return {
      success: false,
      data: [],
      error: getErrorMessage(error),
    }
  }
}

/**
 * 학생의 보호자 목록 조회
 * @param studentId - 학생 ID
 * @returns 보호자 목록
 */
export async function getStudentGuardians(studentId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('student_guardians')
      .select('*, guardians!guardian_id(*, users!user_id(*))')
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .is('guardians.deleted_at', null)

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    return { success: false, error: getErrorMessage(error), data: [] }
  }
}

/**
 * 연결 가능한 보호자 목록 조회 (이미 연결되지 않은 보호자)
 * @param studentId - 학생 ID
 * @returns 보호자 목록
 */
export async function getAvailableGuardians(studentId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 이미 연결된 보호자 ID 목록
    const { data: linkedGuardians } = await supabase
      .from('student_guardians')
      .select('guardian_id')
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)

    const linkedIds = linkedGuardians?.map(g => g.guardian_id) || []

    // 연결되지 않은 보호자 조회
    const query = supabase
      .from('guardians')
      .select('*, users!user_id(*)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (linkedIds.length > 0) {
      query.not('id', 'in', `(${linkedIds.join(',')})`)
    }

    const { data, error } = await query

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    return { success: false, error: getErrorMessage(error), data: [] }
  }
}

/**
 * 보호자를 학생에게 연결
 * @param studentId - 학생 ID
 * @param guardianId - 보호자 ID
 * @param relationship - 관계
 * @returns 성공 여부
 */
export async function linkGuardianToStudent(
  studentId: string,
  guardianId: string,
  relationship: string
) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('student_guardians')
      .insert({
        tenant_id: tenantId,
        student_id: studentId,
        guardian_id: guardianId,
        relation: relationship,
        is_primary: false,
        is_primary_contact: false,
        can_view_reports: true,
        receives_notifications: true,
        receives_billing: false,
        can_pickup: true,
      })

    if (error) throw error

    revalidatePath(`/students/${studentId}`)
    revalidatePath('/guardians')
    return { success: true }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * 보호자와 학생 연결 해제
 * @param studentId - 학생 ID
 * @param guardianId - 보호자 ID
 * @returns 성공 여부
 */
export async function unlinkGuardianFromStudent(
  studentId: string,
  guardianId: string
) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('student_guardians')
      .delete()
      .eq('student_id', studentId)
      .eq('guardian_id', guardianId)
      .eq('tenant_id', tenantId)

    if (error) throw error

    revalidatePath(`/students/${studentId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * 보호자 검색 (이름, 전화번호, 이메일)
 * @param query - 검색어
 * @param limit - 결과 제한 수 (기본 10)
 * @returns 보호자 목록
 */
export async function searchGuardians(query: string, limit: number = 10) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // guardians와 users 조인하여 검색
    const { data, error } = await supabase
      .from('guardians')
      .select('*, users!user_id(*)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .or(`users.name.ilike.%${query}%,users.phone.ilike.%${query}%,users.email.ilike.%${query}%`)
      .limit(limit)

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: getErrorMessage(error), data: [] }
  }
}

/**
 * 학생의 보호자 연락처 정보 조회 (연락용)
 * @param studentId - 학생 ID
 * @returns 간소화된 보호자 목록 (이름, 관계, 연락처)
 */
export async function getGuardiansForContact(studentId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // student_guardians를 통해 보호자 조회
    const { data: links, error: linksError } = await supabase
      .from('student_guardians')
      .select(`
        guardian_id,
        relation,
        guardians!inner (
          id,
          relationship,
          users!inner (
            name,
            email,
            phone
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .is('guardians.deleted_at', null)

    if (linksError) {
      console.error('[getGuardiansForContact] Error:', linksError)
      throw linksError
    }

    // TODO(any): Supabase nested query types need proper typing
    const guardians = (links || []).map((link: any) => {
      const guardian = link.guardians
      const user = guardian?.users

      return {
        id: guardian?.id || '',
        name: user?.name || '',
        relationship: link.relation || guardian?.relationship || null,
        email: user?.email || null,
        phone: user?.phone || null,
      }
    })

    return guardians
  } catch (error) {
    console.error('[getGuardiansForContact] Exception:', error)
    throw new Error(getErrorMessage(error))
  }
}

/**
 * 보호자 연락 기록 저장
 * @param data - 연락 기록 데이터
 * @returns 성공 여부
 */
export async function logGuardianContact(data: {
  studentId: string
  guardianId: string
  sessionId: string
  notificationType: string
  message: string
  notes?: string
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // notification_type은 'sms' 또는 'email'만 허용 (DB constraint)
    // 'phone' → 'sms'로 매핑 (전화 연락도 SMS 알림으로 기록)
    let notificationType = data.notificationType
    if (notificationType === 'phone') {
      notificationType = 'sms'
    }

    // 보호자 정보 조회
    const { data: guardian, error: guardianError } = await supabase
      .from('guardians')
      .select('users!user_id(name)')
      .eq('id', data.guardianId)
      .eq('tenant_id', tenantId)
      .single()

    if (guardianError) {
      console.error('[logGuardianContact] Guardian not found:', guardianError)
    }

    // TODO(any): Supabase nested query type
    const guardianName = (guardian?.users as any)?.name || '보호자'

    // 메시지 구성 (보호자 이름 + 원본 메시지 + 추가 메모)
    const fullMessage = [
      `[${guardianName}]`,
      data.message,
      data.notes ? `메모: ${data.notes}` : null,
    ]
      .filter(Boolean)
      .join(' ')

    // notification_logs에 기록
    const { error: logError } = await supabase.from('notification_logs').insert({
      tenant_id: tenantId,
      student_id: data.studentId,
      session_id: data.sessionId,
      notification_type: notificationType,
      status: 'sent',
      message: fullMessage,
      sent_at: new Date().toISOString(),
    })

    if (logError) {
      console.error('[logGuardianContact] Insert error:', logError)
      throw new Error(`연락 기록 저장 실패: ${logError.message}`)
    }

    // 캐시 무효화
    revalidatePath(`/students/${data.studentId}`)
    revalidatePath('/attendance')

    return { success: true, error: null }
  } catch (error) {
    console.error('[logGuardianContact] Exception:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
