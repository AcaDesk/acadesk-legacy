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
import { createNotification } from '@/lib/notification-helpers'

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

const updateGuardianWithStudentsSchema = updateGuardianSchema.extend({
  student_ids: z.array(z.string().uuid()).optional(),
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
      // 롤백: 생성된 user 삭제
      await supabase.from('users').delete().eq('id', newUser.id)
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
        // 롤백: 생성된 guardian, user 삭제
        await supabase.from('guardians').delete().eq('id', newGuardian.id)
        await supabase.from('users').delete().eq('id', newUser.id)
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
        occupation: validatedData.occupation || null,
        address: validatedData.address || null,
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

    // 단일 쿼리로 보호자 + 사용자 + 학생 연결 정보 조회 (N+1 제거)
    const { data: guardians, error: guardiansError } = await supabase
      .from('guardians')
      .select(`
        id,
        relationship,
        users (
          name,
          email,
          phone
        ),
        student_guardians (
          relation,
          is_primary,
          students (
            id,
            student_code,
            users (
              name
            )
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (guardiansError) throw guardiansError

    interface GuardianRow {
      id: string
      relationship: string | null
      users: { name: string | null; email: string | null; phone: string | null } | { name: string | null; email: string | null; phone: string | null }[] | null
      student_guardians: Array<{
        relation: string | null
        is_primary: boolean | null
        students: { id: string; student_code: string | null; users: { name: string | null } | { name: string | null }[] | null } | { id: string; student_code: string | null; users: { name: string | null } | { name: string | null }[] | null }[] | null
      }> | null
    }
    const guardiansWithDetails = ((guardians || []) as GuardianRow[]).map((guardian) => {
      const usersData = Array.isArray(guardian.users) ? guardian.users[0] : guardian.users

      const students = (guardian.student_guardians || []).map((link) => {
        const student = Array.isArray(link.students) ? link.students[0] : link.students
        const studentUsers = student?.users
        const studentUserName = Array.isArray(studentUsers) ? studentUsers[0]?.name : studentUsers?.name
        return {
          id: student?.id || '',
          studentCode: student?.student_code || '',
          name: studentUserName || '',
          relation: link.relation || '',
          isPrimary: link.is_primary || false,
        }
      })

      return {
        guardian: {
          id: guardian.id,
          relationship: guardian.relationship,
        },
        userName: usersData?.name || null,
        userEmail: usersData?.email || null,
        userPhone: usersData?.phone || null,
        students,
      }
    })

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
 * 보호자 상세 정보 조회
 * @param guardianId - 보호자 ID
 * @returns 보호자 상세 정보 (연결된 학생 정보 포함)
 */
export async function getGuardianDetail(guardianId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('guardians')
      .select(`
        id,
        relationship,
        occupation,
        address,
        users (
          name,
          email,
          phone
        ),
        student_guardians (
          is_primary,
          students (
            id,
            student_code,
            grade,
            users (
              name
            )
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('id', guardianId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      console.error('[getGuardianDetail] Error:', error)
      throw error
    }

    if (!data) {
      return { success: false, data: null, error: '보호자 정보를 찾을 수 없습니다' }
    }

    return { success: true, data, error: null }
  } catch (error) {
    console.error('[getGuardianDetail] Exception:', error)
    return {
      success: false,
      data: null,
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
 * 보호자 검색 (이름, 전화번호, 이메일, 학생 이름)
 * @param query - 검색어
 * @param limit - 결과 제한 수 (기본 10)
 * @returns 보호자 목록 (연결된 학생 정보 포함)
 */
export async function searchGuardians(query: string, limit: number = 10) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const guardianIdSet = new Set<string>()

    // 1. users 테이블에서 보호자 이름/전화번호/이메일로 검색
    const { data: guardianUsers, error: guardianUsersError } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role_code', 'guardian')
      .is('deleted_at', null)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit)

    if (guardianUsersError) {
      console.error('[searchGuardians] Guardian users search error:', guardianUsersError)
    } else if (guardianUsers && guardianUsers.length > 0) {
      // 보호자의 user_id를 guardian_id로 변환
      const { data: guardiansFromUsers } = await supabase
        .from('guardians')
        .select('id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .in('user_id', guardianUsers.map(u => u.id))

      guardiansFromUsers?.forEach(g => guardianIdSet.add(g.id))
    }

    // 2. students 테이블에서 학생 이름으로 검색 후 해당 학생의 보호자 찾기
    const { data: studentUsers, error: studentUsersError } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role_code', 'student')
      .is('deleted_at', null)
      .ilike('name', `%${query}%`)
      .limit(limit)

    if (studentUsersError) {
      console.error('[searchGuardians] Student users search error:', studentUsersError)
    } else if (studentUsers && studentUsers.length > 0) {
      // 학생의 user_id로 student_id 찾기
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .in('user_id', studentUsers.map(u => u.id))

      if (students && students.length > 0) {
        // 학생의 보호자 찾기
        const { data: studentGuardianLinks } = await supabase
          .from('student_guardians')
          .select('guardian_id')
          .eq('tenant_id', tenantId)
          .in('student_id', students.map(s => s.id))

        studentGuardianLinks?.forEach(sg => guardianIdSet.add(sg.guardian_id))
      }
    }

    // 3. 검색된 모든 guardian_id로 상세 정보 조회
    if (guardianIdSet.size === 0) {
      return { success: true, data: [] }
    }

    const { data: guardians, error: guardiansError } = await supabase
      .from('guardians')
      .select(`
        *,
        users!user_id(*),
        student_guardians (
          student_id,
          students (
            id,
            users (
              name
            )
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .in('id', Array.from(guardianIdSet))
      .limit(limit)

    if (guardiansError) throw guardiansError

    return { success: true, data: guardians || [] }
  } catch (error) {
    console.error('[searchGuardians] Error:', error)
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

    interface StudentGuardianLinkRow {
      guardian_id: string
      relation: string | null
      guardians: {
        id: string
        relationship: string | null
        users: { name: string | null; email: string | null; phone: string | null } | null
      } | null
    }
    const guardians = ((links || []) as unknown as StudentGuardianLinkRow[]).map((link) => {
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
 * 보호자에게 SMS 발송 + 연락 기록 저장
 * 설정된 메시징 provider(Aligo/Solapi)를 사용합니다.
 */
export async function sendGuardianSMS(data: {
  studentId: string
  guardianId: string
  sessionId: string | null
  phone: string
  message: string
}) {
  try {
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { sendMessage } = await import('@/lib/messaging/provider')

    // 설정된 provider로 SMS 발송 (자동으로 SMS/LMS 타입 결정)
    const msgType = data.message.length <= 90 ? 'sms' : 'lms'
    const smsResult = await sendMessage({
      type: msgType,
      to: data.phone,
      message: data.message,
    })

    if (!smsResult.success) {
      return {
        success: false,
        error: smsResult.error || 'SMS 발송에 실패했습니다.',
      }
    }

    // sessionId가 있을 때만 notification_logs 기록
    if (data.sessionId) {
      const { error: logError } = await supabase.from('notification_logs').insert({
        tenant_id: tenantId,
        student_id: data.studentId,
        session_id: data.sessionId,
        notification_type: 'sms',
        status: 'sent',
        message: data.message,
        sent_at: new Date().toISOString(),
      })

      if (logError) {
        console.error('[sendGuardianSMS] Log insert error:', logError)
      }
    }

    // 보호자 문자 발송 알림 (fire-and-forget)
    void createNotification({
      supabase,
      tenantId,
      actorUserId: userId,
      type: 'new_message',
      title: '보호자 문자 발송',
      message: `학생(${data.studentId}) 보호자에게 SMS가 발송되었습니다.`,
      referenceType: 'student',
      referenceId: data.studentId,
      actionUrl: '/notifications',
    })

    revalidatePath(`/students/${data.studentId}`)
    revalidatePath('/attendance')

    return { success: true, error: null }
  } catch (error) {
    console.error('[sendGuardianSMS] Exception:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 보호자에게 카카오 알림톡 발송 + 연락 기록 저장
 * Solapi + 카카오 채널 연동이 필요합니다.
 */
export async function sendGuardianAlimtalk(data: {
  studentId: string
  guardianId: string
  sessionId: string | null
  phone: string
  templateId: string
  variables: Record<string, string>
}) {
  try {
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()
    const { sendAlimtalk } = await import('@/lib/messaging/provider')

    const result = await sendAlimtalk({
      to: data.phone,
      templateId: data.templateId,
      variables: data.variables,
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || '알림톡 발송에 실패했습니다.',
      }
    }

    if (data.sessionId) {
      const { error: logError } = await supabase.from('notification_logs').insert({
        tenant_id: tenantId,
        student_id: data.studentId,
        session_id: data.sessionId,
        notification_type: 'kakao',
        status: 'sent',
        message: `알림톡 발송 (templateId: ${data.templateId})`,
        sent_at: new Date().toISOString(),
      })

      if (logError) {
        console.error('[sendGuardianAlimtalk] Log insert error:', logError)
      }
    }

    // 알림톡 발송 알림 (fire-and-forget)
    void createNotification({
      supabase,
      tenantId,
      actorUserId: userId,
      type: 'new_message',
      title: '보호자 알림톡 발송',
      message: `학생(${data.studentId}) 보호자에게 카카오 알림톡이 발송되었습니다.`,
      referenceType: 'student',
      referenceId: data.studentId,
      actionUrl: '/notifications',
    })

    revalidatePath(`/students/${data.studentId}`)
    revalidatePath('/attendance')

    return { success: true, error: null }
  } catch (error) {
    console.error('[sendGuardianAlimtalk] Exception:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
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

    const typedGuardianUsers = guardian?.users as unknown as { name: string } | null
    const guardianName = typedGuardianUsers?.name || '보호자'

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

/**
 * 보호자 정보 + 학생 연결을 함께 수정
 * @param data - 보호자 정보 + 학생 ID 배열
 * @returns 성공 여부
 */
export async function updateGuardianWithStudents(
  data: z.infer<typeof updateGuardianWithStudentsSchema>
) {
  try {
    const { tenantId } = await verifyStaff()
    const validatedData = updateGuardianWithStudentsSchema.parse(data)
    const supabase = createServiceRoleClient()

    // 1. guardian에서 user_id 조회
    const { data: guardian, error: guardianError } = await supabase
      .from('guardians')
      .select('user_id')
      .eq('id', validatedData.guardian_id)
      .eq('tenant_id', tenantId)
      .single()

    if (guardianError || !guardian) {
      throw new Error('보호자 정보를 찾을 수 없습니다')
    }

    // 2. users 테이블 업데이트
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

    // 3. guardians 테이블 업데이트
    const { error: updateError } = await supabase
      .from('guardians')
      .update({
        relationship: validatedData.relationship,
        occupation: validatedData.occupation || null,
        address: validatedData.address || null,
      })
      .eq('id', validatedData.guardian_id)
      .eq('tenant_id', tenantId)

    if (updateError) {
      throw new Error(`보호자 정보 수정 실패: ${updateError.message}`)
    }

    // 4. 학생 연결 업데이트 (student_ids가 제공된 경우)
    if (validatedData.student_ids !== undefined) {
      // 기존 연결 백업 (롤백용)
      const { data: existingLinks } = await supabase
        .from('student_guardians')
        .select('*')
        .eq('guardian_id', validatedData.guardian_id)
        .eq('tenant_id', tenantId)

      // 기존 연결 삭제
      const { error: deleteError } = await supabase
        .from('student_guardians')
        .delete()
        .eq('guardian_id', validatedData.guardian_id)
        .eq('tenant_id', tenantId)

      if (deleteError) {
        throw new Error(`기존 학생 연결 삭제 실패: ${deleteError.message}`)
      }

      // 새 연결 생성
      if (validatedData.student_ids.length > 0) {
        const records = validatedData.student_ids.map((studentId) => ({
          tenant_id: tenantId,
          student_id: studentId,
          guardian_id: validatedData.guardian_id,
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
          .insert(records)

        if (linkError) {
          // 롤백: 기존 연결 복원
          if (existingLinks && existingLinks.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const restoreRecords = existingLinks.map(({ id, created_at, updated_at, ...rest }) => rest)
            await supabase.from('student_guardians').insert(restoreRecords)
          }
          throw new Error(`학생 연결 생성 실패: ${linkError.message}`)
        }
      }
    }

    revalidatePath('/guardians')
    revalidatePath(`/guardians/${validatedData.guardian_id}`)

    return { success: true }
  } catch (error) {
    console.error('[updateGuardianWithStudents] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * 학생 선택 목록 조회 (select용 간단한 목록)
 * @returns 학생 목록 (id, student_code, name)
 */
export async function getStudentsForSelect() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        users (
          name
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('student_code')

    if (error) throw error

    interface StudentRow {
      id: string
      student_code: string | null
      users: { name: string | null } | { name: string | null }[] | null
    }
    const students = ((data || []) as StudentRow[]).map((s) => {
      const usersData = Array.isArray(s.users) ? s.users[0] : s.users
      return {
        id: s.id,
        student_code: s.student_code || '',
        name: usersData?.name || '',
      }
    })

    return { success: true, data: students }
  } catch (error) {
    console.error('[getStudentsForSelect] Error:', error)
    return { success: false, data: [], error: getErrorMessage(error) }
  }
}

/**
 * 보호자 일괄 삭제 (Soft Delete)
 * @param ids - 삭제할 보호자 ID 배열
 * @returns 성공 여부 및 삭제 수
 */
export async function bulkDeleteGuardians(ids: string[]) {
  try {
    if (!ids.length) {
      return { success: false, error: '삭제할 보호자를 선택해주세요', data: null }
    }

    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // guardian → user_id 조회
    const { data: guardians, error: guardianError } = await supabase
      .from('guardians')
      .select('id, user_id')
      .in('id', ids)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (guardianError) throw guardianError

    if (!guardians || guardians.length === 0) {
      return { success: false, error: '삭제할 보호자를 찾을 수 없습니다', data: null }
    }

    const now = new Date().toISOString()
    const userIds = guardians.map((g) => g.user_id)

    // users 소프트 삭제
    const { error: userDeleteError } = await supabase
      .from('users')
      .update({ deleted_at: now })
      .in('id', userIds)
      .eq('tenant_id', tenantId)

    if (userDeleteError) {
      throw new Error(`사용자 삭제 실패: ${userDeleteError.message}`)
    }

    // guardians 소프트 삭제
    const { data: deletedGuardians, error: deleteError } = await supabase
      .from('guardians')
      .update({ deleted_at: now })
      .in('id', ids)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('id')

    if (deleteError) {
      // users 소프트 삭제 롤백
      await supabase
        .from('users')
        .update({ deleted_at: null })
        .in('id', userIds)
        .eq('tenant_id', tenantId)
      throw new Error(`보호자 삭제 실패: ${deleteError.message}`)
    }

    revalidatePath('/guardians')

    return {
      success: true,
      data: { deletedCount: deletedGuardians?.length ?? 0 },
      error: null,
    }
  } catch (error) {
    console.error('[bulkDeleteGuardians] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 주 보호자 토글
 * @param guardianId - 보호자 ID
 * @param studentId - 학생 ID
 * @param isPrimary - 주 보호자 여부
 * @returns 성공 여부
 */
export async function togglePrimaryGuardian(
  guardianId: string,
  studentId: string,
  isPrimary: boolean
) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    if (isPrimary) {
      // 해당 학생의 다른 보호자 is_primary를 false로 변경
      const { error: resetError } = await supabase
        .from('student_guardians')
        .update({ is_primary: false })
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)

      if (resetError) {
        throw new Error(`주 보호자 초기화 실패: ${resetError.message}`)
      }
    }

    // 해당 보호자의 is_primary 설정
    const { error: updateError } = await supabase
      .from('student_guardians')
      .update({ is_primary: isPrimary })
      .eq('guardian_id', guardianId)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)

    if (updateError) {
      throw new Error(`주 보호자 설정 실패: ${updateError.message}`)
    }

    revalidatePath('/guardians')
    revalidatePath(`/guardians/${guardianId}`)
    revalidatePath(`/students/${studentId}`)

    return { success: true }
  } catch (error) {
    console.error('[togglePrimaryGuardian] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}
