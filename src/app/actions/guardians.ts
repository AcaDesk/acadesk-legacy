/**
 * Guardian Management Server Actions
 *
 * 모든 보호자 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 * 클라이언트에서 직접 Supabase CUD를 사용하지 않습니다.
 */

'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { createNotification } from '@/lib/notification-helpers'
import { filterOwnedStudentIds } from '@/lib/tenant-guards'

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

    // 3-1. 동일 (tenant, 정규화 전화번호, 이름) 보호자가 이미 있는지 확인
    const normalizedPhone = validatedData.phone.replace(/\D/g, '')
    if (normalizedPhone.length >= 9) {
      const { data: existing } = await supabase
        .from('guardians')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('normalized_phone', normalizedPhone)
        .ilike('name', validatedData.name)
        .is('deleted_at', null)
        .maybeSingle()

      if (existing) {
        throw new Error(
          `이미 등록된 보호자입니다 (${existing.name}). 기존 보호자에 학생을 연결해주세요.`
        )
      }
    }

    // 3-2. users 테이블에 보호자 생성
    const { data: newUser, error: userCreateError } = await supabase
      .from('users')
      .insert({
        tenant_id: tenantId,
        email: validatedData.email || null,
        name: validatedData.name,
        phone: validatedData.phone,
        role_code: 'parent',
      })
      .select()
      .single()

    if (userCreateError || !newUser) {
      throw new Error(`사용자 레코드 생성 실패: ${userCreateError?.message}`)
    }

    // 3-3. guardians 테이블에 보호자 정보 저장 (단일 출처: guardians.{name,phone,email})
    const { data: newGuardian, error: guardianError } = await supabase
      .from('guardians')
      .insert({
        tenant_id: tenantId,
        user_id: newUser.id,
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email || null,
        relationship: validatedData.relationship,
        occupation: validatedData.occupation || null,
        address: validatedData.address || null,
      })
      .select()
      .single()

    if (guardianError || !newGuardian) {
      // 롤백: 생성된 user 삭제
      await supabase.from('users').delete().eq('id', newUser.id)
      if (guardianError?.code === '23505') {
        throw new Error('같은 전화번호와 이름의 보호자가 이미 존재합니다')
      }
      throw new Error(`보호자 정보 생성 실패: ${guardianError?.message}`)
    }

    // 3-3. 선택된 학생들과 연결 (소유 검증된 학생만)
    const ownedStudentIds =
      validatedData.student_ids && validatedData.student_ids.length > 0
        ? await filterOwnedStudentIds(supabase, tenantId, validatedData.student_ids)
        : []
    if (ownedStudentIds.length > 0) {
      const guardianStudentRecords = ownedStudentIds.map((studentId) => ({
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
        console.error('[addGuardian] Link error:', linkError.message)
        throw new Error('학생과 보호자를 연결하는 데 실패했습니다')
      }
    }

    // 4. 캐시 무효화
    revalidatePath('/guardians')
    revalidateTag(`guardians:${tenantId}`)

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

    // 3-2. guardians 테이블 업데이트 (단일 출처)
    const { data: updatedGuardian, error: updateError } = await supabase
      .from('guardians')
      .update({
        name: validatedData.name,
        phone: validatedData.phone,
        email: validatedData.email || null,
        relationship: validatedData.relationship,
        occupation: validatedData.occupation || null,
        address: validatedData.address || null,
      })
      .eq('id', validatedData.guardian_id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        throw new Error('같은 전화번호와 이름의 보호자가 이미 존재합니다')
      }
      throw new Error(`보호자 정보 수정 실패: ${updateError.message}`)
    }

    // 3-3. users 테이블 동기화 (로그인/알림 호환성을 위해 유지)
    if (guardian.user_id) {
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
        console.error('[updateGuardian] users sync failed:', userUpdateError.message)
        // guardians 업데이트는 이미 성공했으므로 throw하지 않음
      }
    }

    // 4. 캐시 무효화
    revalidatePath('/guardians')
    revalidatePath(`/guardians/${validatedData.guardian_id}`)
    revalidateTag(`guardians:${tenantId}`)

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
    revalidateTag(`guardians:${tenantId}`)

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

    // guardians 단일 출처로 조회 (users 우회 제거)
    const { data: guardians, error: guardiansError } = await supabase
      .from('guardians')
      .select(`
        id,
        name,
        phone,
        email,
        relationship,
        student_guardians (
          relation,
          is_primary,
          deleted_at,
          students (
            id,
            name,
            student_code
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (guardiansError) throw guardiansError

    interface GuardianRow {
      id: string
      name: string | null
      phone: string | null
      email: string | null
      relationship: string | null
      student_guardians: Array<{
        relation: string | null
        is_primary: boolean | null
        deleted_at: string | null
        students: { id: string; name: string | null; student_code: string | null }
          | { id: string; name: string | null; student_code: string | null }[]
          | null
      }> | null
    }
    const guardiansWithDetails = ((guardians || []) as GuardianRow[]).map((guardian) => {
      const students = (guardian.student_guardians || [])
        .filter((link) => link.deleted_at === null)
        .map((link) => {
          const student = Array.isArray(link.students) ? link.students[0] : link.students
          return {
            id: student?.id || '',
            studentCode: student?.student_code || '',
            name: student?.name || '',
            relation: link.relation || '',
            isPrimary: link.is_primary || false,
          }
        })

      return {
        guardian: {
          id: guardian.id,
          relationship: guardian.relationship,
        },
        userName: guardian.name,
        userEmail: guardian.email,
        userPhone: guardian.phone,
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
        name,
        phone,
        email,
        relationship,
        occupation,
        address,
        student_guardians (
          is_primary,
          is_primary_contact,
          receives_notifications,
          receives_billing,
          can_pickup,
          can_view_reports,
          deleted_at,
          students (
            id,
            name,
            student_code,
            grade
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
    revalidateTag(`guardians:${tenantId}`)
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
    revalidateTag(`guardians:${tenantId}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * 정규화 전화번호로 정확 매칭되는 보호자 검색
 * 등록 폼에서 사용자가 전화번호 입력 시 사전 안내용
 *
 * @param phone - 입력된 전화번호 (정규화 전)
 * @returns 같은 전화번호의 보호자 + 연결된 학생 이름 리스트
 */
export async function findGuardiansByPhone(phone: string) {
  try {
    const { tenantId } = await verifyStaff()
    const normalized = phone.replace(/\D/g, '')

    if (normalized.length < 9) {
      return { success: true, data: [] as Array<{
        id: string
        name: string
        phone: string | null
        relationship: string | null
        students: string[]
      }> }
    }

    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('guardians')
      .select(`
        id, name, phone, relationship,
        student_guardians (
          deleted_at,
          students (
            name
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('normalized_phone', normalized)
      .is('deleted_at', null)

    if (error) throw error

    const result = (data || []).map((g) => ({
      id: g.id,
      name: g.name,
      phone: g.phone,
      relationship: g.relationship,
      students: (g.student_guardians || [])
        .filter((sg: { deleted_at: string | null }) => sg.deleted_at === null)
        .map((sg: { students: { name: string } | { name: string }[] | null }) => {
          const s = Array.isArray(sg.students) ? sg.students[0] : sg.students
          return s?.name || ''
        })
        .filter(Boolean),
    }))

    return { success: true, data: result }
  } catch (error) {
    console.error('[findGuardiansByPhone] Error:', error)
    return { success: false, error: getErrorMessage(error), data: [] }
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

    const safeQuery = query.trim().slice(0, 100).replace(/[%_\\]/g, '\\$&')
    const digitsOnly = query.replace(/\D/g, '')
    const guardianIdSet = new Set<string>()

    // 1. guardians 테이블에서 이름/전화번호/이메일/정규화전화번호로 검색 (단일 출처)
    const orFilters = [
      `name.ilike.%${safeQuery}%`,
      `phone.ilike.%${safeQuery}%`,
      `email.ilike.%${safeQuery}%`,
    ]
    if (digitsOnly.length >= 4) {
      orFilters.push(`normalized_phone.ilike.%${digitsOnly}%`)
    }

    const { data: directHits, error: directError } = await supabase
      .from('guardians')
      .select('id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .or(orFilters.join(','))
      .limit(limit)

    if (directError) {
      console.error('[searchGuardians] Direct search error:', directError)
    } else {
      directHits?.forEach((g) => guardianIdSet.add(g.id))
    }

    // 2. 학생 이름으로 검색 후 해당 학생의 보호자 찾기 (관계망 검색)
    const { data: studentUsers, error: studentUsersError } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('role_code', 'student')
      .is('deleted_at', null)
      .ilike('name', `%${safeQuery}%`)
      .limit(limit)

    if (studentUsersError) {
      console.error('[searchGuardians] Student users search error:', studentUsersError)
    } else if (studentUsers && studentUsers.length > 0) {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .in('user_id', studentUsers.map(u => u.id))

      if (students && students.length > 0) {
        const { data: studentGuardianLinks } = await supabase
          .from('student_guardians')
          .select('guardian_id')
          .eq('tenant_id', tenantId)
          .is('deleted_at', null)
          .in('student_id', students.map(s => s.id))

        studentGuardianLinks?.forEach(sg => guardianIdSet.add(sg.guardian_id))
      }
    }

    if (guardianIdSet.size === 0) {
      return { success: true, data: [] }
    }

    // 3. 보호자 상세 정보 조회 (guardians 단일 출처, 연결 학생 포함)
    const { data: guardians, error: guardiansError } = await supabase
      .from('guardians')
      .select(`
        id, name, phone, email, relationship, occupation, address,
        student_guardians (
          student_id,
          deleted_at,
          students (
            id,
            name
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .in('id', Array.from(guardianIdSet))
      .limit(limit)

    if (guardiansError) throw guardiansError

    // active student_guardians만 남기고 정리
    const cleaned = (guardians || []).map(g => ({
      ...g,
      student_guardians: (g.student_guardians || []).filter(
        (sg: { deleted_at: string | null }) => sg.deleted_at === null
      ),
    }))

    return { success: true, data: cleaned }
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
 * 여러 학생의 보호자 정보를 한 번에 조회 (결석자 일괄 발송용)
 *
 * @param studentIds - 학생 ID 배열
 * @returns 학생별 보호자 목록 매핑 + 학생 이름
 */
export async function getGuardiansForStudents(studentIds: string[]) {
  try {
    if (studentIds.length === 0) {
      return { success: true, data: [], error: null }
    }

    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data: links, error: linksError } = await supabase
      .from('student_guardians')
      .select(`
        student_id,
        guardian_id,
        relation,
        students!inner (
          users!inner ( name )
        ),
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
      .in('student_id', studentIds)
      .eq('tenant_id', tenantId)
      .is('guardians.deleted_at', null)

    if (linksError) {
      console.error('[getGuardiansForStudents] Error:', linksError)
      throw linksError
    }

    interface LinkRow {
      student_id: string
      guardian_id: string
      relation: string | null
      students: { users: { name: string | null } | null } | null
      guardians: {
        id: string
        relationship: string | null
        users: { name: string | null; email: string | null; phone: string | null } | null
      } | null
    }

    const grouped = new Map<
      string,
      {
        studentId: string
        studentName: string
        guardians: Array<{
          id: string
          name: string
          relationship: string | null
          email: string | null
          phone: string | null
        }>
      }
    >()

    for (const link of ((links || []) as unknown as LinkRow[])) {
      const studentId = link.student_id
      const studentName = link.students?.users?.name || ''
      const guardian = link.guardians
      const user = guardian?.users
      const entry = grouped.get(studentId) || {
        studentId,
        studentName,
        guardians: [],
      }
      if (guardian) {
        entry.guardians.push({
          id: guardian.id,
          name: user?.name || '',
          relationship: link.relation || guardian.relationship || null,
          email: user?.email || null,
          phone: user?.phone || null,
        })
      }
      grouped.set(studentId, entry)
    }

    return {
      success: true,
      data: Array.from(grouped.values()),
      error: null,
    }
  } catch (error) {
    console.error('[getGuardiansForStudents] Exception:', error)
    return {
      success: false,
      data: null as
        | null
        | Array<{
            studentId: string
            studentName: string
            guardians: Array<{
              id: string
              name: string
              relationship: string | null
              email: string | null
              phone: string | null
            }>
          }>,
      error: getErrorMessage(error),
    }
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
        notification_type: msgType,
        status: 'sent',
        message: data.message,
        sent_at: new Date().toISOString(),
        recipient_phone: data.phone,
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
      // 템플릿 본문을 변수와 치환하여 실제 발송 내용을 저장
      const { renderKakaoTemplatePreview } = await import('@/lib/kakao/kakao-variables')
      const { data: kakaoTemplate } = await supabase
        .from('kakao_alimtalk_templates')
        .select('content')
        .eq('id', data.templateId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle()
      const renderedMessage = kakaoTemplate?.content
        ? renderKakaoTemplatePreview(kakaoTemplate.content, data.variables)
        : ''

      const { error: logError } = await supabase.from('notification_logs').insert({
        tenant_id: tenantId,
        student_id: data.studentId,
        session_id: data.sessionId,
        notification_type: 'kakao',
        status: 'sent',
        message: renderedMessage,
        sent_at: new Date().toISOString(),
        kakao_template_id: data.templateId,
        recipient_phone: data.phone,
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

      // 새 연결 생성 (소유 검증된 학생만 — 타 테넌트 학생 참조 삽입 차단)
      const ownedStudentIds = await filterOwnedStudentIds(
        supabase,
        tenantId,
        validatedData.student_ids
      )
      if (ownedStudentIds.length > 0) {
        const records = ownedStudentIds.map((studentId) => ({
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
    revalidateTag(`guardians:${tenantId}`)

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
    revalidateTag(`guardians:${tenantId}`)

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
 * 보호자를 여러 학생에게 일괄 연결
 * @param guardianId - 보호자 ID
 * @param studentIds - 학생 ID 배열
 * @param relation - 관계
 * @returns 성공 여부 및 연결/건너뛴 수
 */
export async function bulkLinkGuardianToStudents(
  guardianId: string,
  studentIds: string[],
  relation: string
) {
  try {
    if (!studentIds.length) {
      return { success: false, error: '연결할 학생을 선택해주세요' }
    }

    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // guardian_id 소유 검증 — 타 테넌트 보호자로의 연결 차단
    const { data: ownedGuardian, error: guardianOwnershipError } = await supabase
      .from('guardians')
      .select('id')
      .eq('id', guardianId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle()

    if (guardianOwnershipError) throw guardianOwnershipError
    if (!ownedGuardian) {
      return { success: false, error: '보호자를 찾을 수 없습니다' }
    }

    // student_id 소유 검증 — 타 테넌트 학생 참조 삽입 차단
    const ownedStudentIds = await filterOwnedStudentIds(supabase, tenantId, studentIds)
    if (!ownedStudentIds.length) {
      return { success: false, error: '연결할 학생을 찾을 수 없습니다' }
    }

    // 이미 연결된 쌍 확인
    const { data: existingLinks } = await supabase
      .from('student_guardians')
      .select('student_id')
      .eq('guardian_id', guardianId)
      .eq('tenant_id', tenantId)
      .in('student_id', ownedStudentIds)

    const alreadyLinked = new Set((existingLinks || []).map(l => l.student_id))
    const toLink = ownedStudentIds.filter(id => !alreadyLinked.has(id))

    if (!toLink.length) {
      return { success: true, data: { linkedCount: 0, skippedCount: alreadyLinked.size } }
    }

    const records = toLink.map(studentId => ({
      tenant_id: tenantId,
      student_id: studentId,
      guardian_id: guardianId,
      relation,
      is_primary: false,
      is_primary_contact: false,
      can_view_reports: true,
      receives_notifications: true,
      receives_billing: false,
      can_pickup: true,
    }))

    const { error } = await supabase.from('student_guardians').insert(records)
    if (error) throw error

    revalidatePath('/students')
    revalidateTag(`guardians:${tenantId}`)

    return {
      success: true,
      data: { linkedCount: toLink.length, skippedCount: alreadyLinked.size },
    }
  } catch (error) {
    console.error('[bulkLinkGuardianToStudents] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * emergency_contact 전화번호로 기존 보호자 자동 매칭 제안
 * @param studentIds - 학생 ID 배열
 * @returns 매칭 제안 목록 ({studentId, studentName, guardianId, guardianName, phone})
 */
export async function getAutoMatchSuggestions(studentIds: string[]) {
  try {
    if (!studentIds.length) return { success: true, data: [] }

    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 1. 학생의 emergency_contact 조회
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, emergency_contact, users (name)')
      .in('id', studentIds)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (studentsError) throw studentsError

    const studentsWithContact = (students || []).filter(s => s.emergency_contact)
    if (!studentsWithContact.length) return { success: true, data: [] }

    // 2. 모든 보호자의 전화번호 조회
    const { data: guardians, error: guardiansError } = await supabase
      .from('guardians')
      .select('id, users (name, phone)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (guardiansError) throw guardiansError

    // 3. 이미 연결된 쌍 조회 (중복 제외)
    const { data: existingLinks } = await supabase
      .from('student_guardians')
      .select('student_id, guardian_id')
      .in('student_id', studentIds)
      .eq('tenant_id', tenantId)

    const linkedSet = new Set(
      (existingLinks || []).map(l => `${l.student_id}:${l.guardian_id}`)
    )

    // 4. 전화번호 정규화 (숫자만 추출, 마지막 11자리)
    function normalizePhone(phone: string): string {
      return phone.replace(/\D/g, '').slice(-11)
    }

    // 5. 보호자 전화번호 맵 생성
    interface GuardianRow {
      id: string
      users: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null
    }
    const guardianPhoneMap = new Map<string, { id: string; name: string }>()
    for (const g of (guardians || []) as GuardianRow[]) {
      const usersData = Array.isArray(g.users) ? g.users[0] : g.users
      if (usersData?.phone) {
        const normalized = normalizePhone(usersData.phone)
        if (normalized) {
          guardianPhoneMap.set(normalized, { id: g.id, name: usersData.name || '' })
        }
      }
    }

    // 6. 매칭
    interface StudentRow {
      id: string
      emergency_contact: string | null
      users: { name: string | null } | { name: string | null }[] | null
    }
    const suggestions: Array<{
      studentId: string
      studentName: string
      guardianId: string
      guardianName: string
      phone: string
    }> = []

    for (const student of studentsWithContact as StudentRow[]) {
      if (!student.emergency_contact) continue
      const normalized = normalizePhone(student.emergency_contact)
      const match = guardianPhoneMap.get(normalized)
      if (!match) continue
      if (linkedSet.has(`${student.id}:${match.id}`)) continue

      const usersData = Array.isArray(student.users) ? student.users[0] : student.users
      suggestions.push({
        studentId: student.id,
        studentName: usersData?.name || '',
        guardianId: match.id,
        guardianName: match.name,
        phone: student.emergency_contact,
      })
    }

    return { success: true, data: suggestions }
  } catch (error) {
    console.error('[getAutoMatchSuggestions] Error:', error)
    return { success: false, data: [], error: getErrorMessage(error) }
  }
}

/**
 * 주 보호자 토글
 * @param guardianId - 보호자 ID
 * @param studentId - 학생 ID
 * @param isPrimary - 주 보호자 여부
 * @returns 성공 여부
 */
/**
 * student_guardians의 권한/옵션 flag 단건 업데이트
 *
 * 학생-보호자 카드에서 알림/리포트/픽업/결제 알림을 빠르게 토글하기 위한 액션.
 * is_primary / is_primary_contact는 학생당 1명만 허용되는 제약이 있으므로 별도 처리.
 */
export async function updateStudentGuardianFlag(
  guardianId: string,
  studentId: string,
  field:
    | 'receives_notifications'
    | 'receives_billing'
    | 'can_pickup'
    | 'can_view_reports'
    | 'is_primary'
    | 'is_primary_contact',
  value: boolean
) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // is_primary 계열은 학생당 1명만 허용 — 다른 보호자 false로 reset
    if ((field === 'is_primary' || field === 'is_primary_contact') && value) {
      const { error: resetError } = await supabase
        .from('student_guardians')
        .update({ [field]: false })
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)
      if (resetError) throw new Error(resetError.message)
    }

    const { error } = await supabase
      .from('student_guardians')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('guardian_id', guardianId)
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)

    if (error) throw new Error(error.message)

    revalidatePath(`/guardians/${guardianId}`)
    revalidatePath(`/students/${studentId}`)

    return { success: true }
  } catch (error) {
    console.error('[updateStudentGuardianFlag] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

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
