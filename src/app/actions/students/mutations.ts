'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import { getTodayKST } from '@/lib/utils'
import { hashKioskPin } from '../kiosk'
import { createStudentCompleteSchema, studentSchema } from './schemas'
import { detachStudentActiveRelations } from './relations'
import { createNotification } from '@/lib/notification-helpers'

/**
 * Create a student with optional guardian (pure service_role implementation)
 *
 * This action:
 * 1. Verifies user authentication and tenant
 * 2. Creates student record with service_role (bypasses RLS)
 * 3. Handles three guardian modes:
 *    - 'new': Creates new guardian + user + links to student
 *    - 'existing': Links existing guardian to student
 *    - 'skip': Creates student only
 * 4. Returns student_id and guardian_id
 *
 * ✅ Fully server-side + service_role based (no RPC)
 *
 * @param input - Student and guardian data
 * @returns Created student/guardian IDs or error
 */
export async function createStudentComplete(
  input: z.infer<typeof createStudentCompleteSchema>
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId, userId } = await verifyStaff()

    // 2. Validate input
    const validated = createStudentCompleteSchema.parse(input)

    // 3. Create service_role client
    const serviceClient = createServiceRoleClient()

    let guardianId: string | null = null
    let studentId: string | null = null
    let autoMatchedGuardian: { id: string; name: string; siblingStudents: string[] } | null = null
    let newGuardianPayload: Record<string, string | null> | null = null

    // 4. Handle guardian creation/linking based on mode
    if (validated.guardianMode === 'new' && validated.guardian && 'name' in validated.guardian) {
      // Mode: Create new guardian
      const guardianData = validated.guardian

      // 4-1. Create user record for guardian
      const guardianEmail = guardianData.email || null
      const guardianPhone = guardianData.phone || null
      const normalizedPhone = guardianPhone ? guardianPhone.replace(/\D/g, '') : ''

      // 4-0. 동일 (tenant, 정규화 전화번호, 이름) 보호자 자동 매칭
      // 같은 부모가 자녀 등록 시 검색 누락으로 중복 생성되는 문제 방지
      if (normalizedPhone.length >= 9 && guardianData.name) {
        const { data: matched } = await serviceClient
          .from('guardians')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .eq('normalized_phone', normalizedPhone)
          .ilike('name', guardianData.name)
          .is('deleted_at', null)
          .maybeSingle()

        if (matched) {
          // 기존 보호자 발견 → 학생 등록 후 형제로 자동 연결
          guardianId = matched.id

          // 토스트 안내용 — 기존 자녀 이름들
          const { data: sgRows } = await serviceClient
            .from('student_guardians')
            .select('students(name)')
            .eq('guardian_id', matched.id)
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)

          const siblingStudents = (sgRows || [])
            .map((sg: { students: { name: string } | { name: string }[] | null }) => {
              const s = Array.isArray(sg.students) ? sg.students[0] : sg.students
              return s?.name || ''
            })
            .filter(Boolean)

          autoMatchedGuardian = {
            id: matched.id,
            name: matched.name,
            siblingStudents,
          }
        }
      }

      // 신규 보호자 생성 준비 (자동 매칭 실패 시) — 실제 INSERT는 아래 원자화 RPC에서 수행
      if (!guardianId) {
        // 이메일이 있는 경우, 중복 체크 (사용자 친화 메시지를 위한 사전 검증)
        if (guardianEmail) {
          const { data: existingUser } = await serviceClient
            .from('users')
            .select('id, name')
            .eq('email', guardianEmail)
            .eq('tenant_id', tenantId)
            .is('deleted_at', null)
            .maybeSingle()

          if (existingUser) {
            throw new Error(`이메일 '${guardianEmail}'은(는) 이미 등록되어 있습니다. 학부모 검색에서 '${existingUser.name}'을(를) 선택하거나 다른 이메일을 사용해주세요.`)
          }
        }

        newGuardianPayload = {
          name: guardianData.name,
          phone: guardianPhone,
          email: guardianEmail,
          relationship: guardianData.relationship || null,
          occupation: guardianData.occupation || null,
          address: guardianData.address || null,
        }
      }
    } else if (validated.guardianMode === 'existing' && validated.guardian && 'id' in validated.guardian) {
      // Mode: Use existing guardian
      guardianId = validated.guardian.id

      // Verify guardian belongs to tenant
      const { data: existingGuardian, error: guardianCheckError } = await serviceClient
        .from('guardians')
        .select('id, tenant_id')
        .eq('id', guardianId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (guardianCheckError || !existingGuardian) {
        throw new Error('보호자를 찾을 수 없습니다')
      }
    }
    // Mode: 'skip' - guardianId remains null

    // 5. Generate unique student_code
    const studentCodePrefix = `STU${new Date().getFullYear().toString().slice(-2)}`
    const randomBytes = new Uint32Array(1)
    crypto.getRandomValues(randomBytes)
    const randomSuffix = (randomBytes[0] % 100000).toString().padStart(5, '0')
    const studentCode = `${studentCodePrefix}-${randomSuffix}`

    // 6. Hash kiosk_pin if provided
    const studentEmail = validated.student.email || null
    const studentPhone = validated.student.student_phone || null

    let hashedKioskPin: string | null = null
    if (validated.student.kiosk_pin) {
      hashedKioskPin = await hashKioskPin(validated.student.kiosk_pin)
    }

    // 7. 보호자-학생 연결 옵션 (new/existing 모두 동일 필드 구조)
    const guardianOptions = validated.guardian as
      | {
          is_primary_contact?: boolean
          receives_notifications?: boolean
          receives_billing?: boolean
          can_pickup?: boolean
        }
      | undefined
    const linkPayload =
      (guardianId || newGuardianPayload) && guardianOptions
        ? {
            is_primary: guardianOptions.is_primary_contact ?? true,
            is_primary_contact: guardianOptions.is_primary_contact ?? true,
            receives_notifications: guardianOptions.receives_notifications ?? true,
            receives_billing: guardianOptions.receives_billing ?? false,
            can_pickup: guardianOptions.can_pickup ?? true,
          }
        : null

    // 8. 원자화 RPC — 보호자 user·guardian·학생 user·student·연결을 단일 트랜잭션으로.
    // 중간 실패 시 전체 롤백되어 고아 레코드가 남지 않는다 (migration 20260717000006)
    const { data: rpcData, error: rpcError } = await serviceClient.rpc('create_student_complete', {
      p_tenant_id: tenantId,
      p_student: {
        name: validated.student.name,
        student_code: studentCode,
        grade: validated.student.grade,
        school: validated.student.school || null,
        birth_date: validated.student.birth_date || null,
        gender: validated.student.gender || null,
        student_phone: studentPhone,
        email: studentEmail,
        profile_image_url: validated.student.profile_image_url || null,
        enrollment_date: validated.student.enrollment_date || getTodayKST(),
        notes: validated.student.notes || null,
        commute_method: validated.student.commute_method || null,
        marketing_source: validated.student.marketing_source || null,
        kiosk_pin_hash: hashedKioskPin,
      },
      p_new_guardian: newGuardianPayload,
      p_existing_guardian_id: guardianId,
      p_link: linkPayload,
    })

    if (rpcError || !rpcData) {
      const message = rpcError?.message || ''
      if (rpcError?.code === '23505' && message.includes('uq_users_email_active')) {
        throw new Error('이메일이 이미 사용 중입니다. 학부모 검색에서 기존 보호자를 선택하거나 다른 이메일을 사용해주세요.')
      }
      if (rpcError?.code === '23505' && message.includes('guardians')) {
        throw new Error('같은 전화번호와 이름의 보호자가 이미 있습니다. 학부모 검색에서 선택해주세요.')
      }
      console.error('[createStudentComplete] RPC error:', message)
      throw new Error('학생 등록에 실패했습니다')
    }

    const rpcResult = rpcData as { student_id: string; guardian_id: string | null }
    studentId = rpcResult.student_id
    guardianId = rpcResult.guardian_id ?? guardianId

    // 10. Revalidate pages
    revalidatePath('/students')
    revalidatePath('/dashboard')
    revalidateTag(`students-master:${tenantId}`)

    // 입학 환영 알림톡 (fire-and-forget) — 보호자가 연결된 경우에만 발송.
    if (studentId && guardianId) {
      const startDateStr = new Date().toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
      const sid = studentId
      void import('@/lib/messaging/event-alimtalk').then(({ fireEventAlimtalk }) =>
        fireEventAlimtalk(tenantId, 'enrollment_welcome', sid, {
          시작일: startDateStr,
          담당자명: '',
        }),
      )
    }

    // 스태프 in-app 알림 (fire-and-forget) — 신규 등록을 다른 스태프에게 통지.
    if (studentId) {
      void createNotification({
        supabase: serviceClient,
        tenantId,
        actorUserId: userId,
        type: 'student_enrolled',
        title: '신규 학생 등록',
        message: `${validated.student.name} 학생이 ${validated.student.grade}로 등록되었습니다.`,
        referenceType: 'student',
        referenceId: studentId,
        actionUrl: `/students/${studentId}`,
      })
    }

    return {
      success: true,
      data: {
        studentId: studentId!,
        guardianId: guardianId,
        autoMatchedGuardian,
      },
      error: null,
    }
  } catch (error) {
    console.error('[createStudentComplete] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update student basic information
 *
 * @param studentId - Student ID
 * @param updates - Fields to update
 * @returns Success or error
 */
export async function updateStudent(
  studentId: string,
  updates: Partial<z.infer<typeof studentSchema>> & {
    name?: string
    email?: string | null
    phone?: string | null
    emergency_contact?: string | null
    kiosk_pin?: string | null
    profile_image_url?: string | null
  }
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Verify student belongs to tenant and get user_id
    const { data: existingStudent, error: fetchError } = await serviceClient
      .from('students')
      .select('id, tenant_id, user_id')
      .eq('id', studentId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError || !existingStudent) {
      return {
        success: false,
        error: '학생을 찾을 수 없습니다',
      }
    }

    if (existingStudent.tenant_id !== tenantId) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    // 4. Separate user updates from student updates
    const userUpdates: Record<string, unknown> = {}
    const studentUpdates: Record<string, unknown> = {}

    // User table fields
    if (updates.name !== undefined) userUpdates.name = updates.name
    if (updates.email !== undefined) userUpdates.email = updates.email
    if (updates.phone !== undefined) userUpdates.phone = updates.phone

    // Student table fields
    if (updates.grade !== undefined) studentUpdates.grade = updates.grade
    if (updates.school !== undefined) studentUpdates.school = updates.school
    if (updates.birth_date !== undefined) studentUpdates.birth_date = updates.birth_date
    if (updates.gender !== undefined) studentUpdates.gender = updates.gender
    if (updates.student_phone !== undefined) studentUpdates.student_phone = updates.student_phone
    if (updates.notes !== undefined) studentUpdates.notes = updates.notes
    if (updates.commute_method !== undefined) studentUpdates.commute_method = updates.commute_method
    if (updates.marketing_source !== undefined) studentUpdates.marketing_source = updates.marketing_source
    if (updates.emergency_contact !== undefined) studentUpdates.emergency_contact = updates.emergency_contact
    if (updates.profile_image_url !== undefined) studentUpdates.profile_image_url = updates.profile_image_url

    // Hash kiosk_pin before storing
    if (updates.kiosk_pin !== undefined) {
      if (updates.kiosk_pin === null || updates.kiosk_pin === '') {
        studentUpdates.kiosk_pin = null
      } else {
        studentUpdates.kiosk_pin = await hashKioskPin(updates.kiosk_pin)
      }
    }

    // 5. Update users table if needed
    if (Object.keys(userUpdates).length > 0 && existingStudent.user_id) {
      const { error: userUpdateError } = await serviceClient
        .from('users')
        .update({
          ...userUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingStudent.user_id)

      if (userUpdateError) {
        throw userUpdateError
      }
    }

    // 6. Update students table if needed
    if (Object.keys(studentUpdates).length > 0) {
      const { error: studentUpdateError } = await serviceClient
        .from('students')
        .update({
          ...studentUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)

      if (studentUpdateError) {
        throw studentUpdateError
      }
    }

    // 7. Revalidate pages
    revalidatePath('/students')
    revalidatePath(`/students/${studentId}`)
    revalidatePath('/dashboard')
    revalidateTag(`students-master:${tenantId}`)

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[updateStudent] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Soft delete a student (sets deleted_at timestamp)
 *
 * @param studentId - Student ID
 * @returns Success or error
 */
export async function deleteStudent(studentId: string) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Verify student belongs to tenant
    const { data: existingStudent, error: fetchError } = await serviceClient
      .from('students')
      .select('id, tenant_id, user_id')
      .eq('id', studentId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError || !existingStudent) {
      return {
        success: false,
        error: '학생을 찾을 수 없거나 이미 삭제되었습니다',
      }
    }

    if (existingStudent.tenant_id !== tenantId) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    // 4. 관계 해제 + 소프트삭제를 단일 트랜잭션 RPC로 수행 (부분 실패 시 전체 롤백)
    const { classIds } = await detachStudentActiveRelations(serviceClient, {
      tenantId,
      studentIds: [studentId],
      reason: '학생 삭제로 인한 자동 해제',
      unlinkGuardians: true,
      closeOpenTodos: true,
      softDeleteStudents: true,
    })

    // 5. Revalidate pages
    revalidatePath('/students')
    revalidatePath('/classes')
    classIds.forEach((classId) => revalidatePath(`/classes/${classId}`))
    revalidatePath('/dashboard')
    revalidatePath('/todos')
    revalidatePath('/todos/planner')
    revalidatePath('/todos/verify')
    revalidateTag(`attendance-roster:${tenantId}`)
    revalidateTag(`students-master:${tenantId}`)

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[deleteStudent] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Withdraw a student (sets withdrawal_date)
 *
 * @param studentId - Student ID
 * @param withdrawalDate - Withdrawal date (ISO string)
 * @param reason - Withdrawal reason
 * @returns Success or error
 */
export async function withdrawStudent(
  studentId: string,
  withdrawalDate: string,
  reason?: string
) {
  try {
    // 1. Verify authentication and get tenant
    const { tenantId, userId } = await verifyStaff()

    // 2. Create service_role client
    const serviceClient = createServiceRoleClient()

    // 3. Verify student belongs to tenant
    const { data: existingStudent, error: fetchError } = await serviceClient
      .from('students')
      .select('id, tenant_id, meta, name')
      .eq('id', studentId)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError || !existingStudent) {
      return {
        success: false,
        error: '학생을 찾을 수 없거나 이미 삭제되었습니다',
      }
    }

    if (existingStudent.tenant_id !== tenantId) {
      return {
        success: false,
        error: '권한이 없습니다',
      }
    }

    const endDate = withdrawalDate.split('T')[0]

    // 4. 관계 해제 + 퇴원 처리(withdrawal_date/meta 병합)를 단일 트랜잭션 RPC로 수행
    const { classIds } = await detachStudentActiveRelations(serviceClient, {
      tenantId,
      studentIds: [studentId],
      endDate,
      reason: reason || '학생 퇴원으로 인한 자동 해제',
      closeOpenTodos: true,
      withdrawalDate,
    })

    // 5. Revalidate pages
    revalidatePath('/students')
    revalidatePath(`/students/${studentId}`)
    revalidatePath('/classes')
    classIds.forEach((classId) => revalidatePath(`/classes/${classId}`))
    revalidatePath('/dashboard')
    revalidatePath('/todos')
    revalidatePath('/todos/planner')
    revalidatePath('/todos/verify')
    revalidateTag(`attendance-roster:${tenantId}`)
    revalidateTag(`students-master:${tenantId}`)

    // 보호자에게 퇴원 안내 알림톡 (fire-and-forget).
    const withdrawalDateStr = new Date(withdrawalDate).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    void import('@/lib/messaging/event-alimtalk').then(({ fireEventAlimtalk }) =>
      fireEventAlimtalk(tenantId, 'enrollment_terminated', studentId, {
        퇴원일: withdrawalDateStr,
      }),
    )

    // 스태프 in-app 알림 (fire-and-forget) — 퇴원을 다른 스태프에게 통지.
    void createNotification({
      supabase: serviceClient,
      tenantId,
      actorUserId: userId,
      type: 'student_withdrawn',
      title: '학생 퇴원',
      message: `${existingStudent.name || '학생'}이(가) ${withdrawalDateStr}자로 퇴원 처리되었습니다.`,
      referenceType: 'student',
      referenceId: studentId,
      actionUrl: `/students/${studentId}`,
    })

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[withdrawStudent] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

const enrollmentStatusSchema = z.object({
  status: z.enum(['active', 'completed', 'on_hold', 'withdrawn', 'transferred', 'pending']),
  end_date: z.string().nullable(),
  notes: z.string().nullable(),
  withdrawal_reason: z.string().nullable().optional(),
})

/**
 * 수강 상태 변경 (학생 상세 페이지의 ClassEnrollmentsList 다이얼로그용)
 *
 * RLS 활성화 이후 client UPDATE 가 차단되던 버그를 해결합니다.
 */
export async function updateEnrollmentStatus(
  enrollmentId: string,
  input: z.infer<typeof enrollmentStatusSchema>
) {
  try {
    const { tenantId } = await verifyStaff()
    const validated = enrollmentStatusSchema.parse(input)
    const supabase = createServiceRoleClient()

    // 테넌트 소속 확인
    const { data: existing, error: fetchError } = await supabase
      .from('class_enrollments')
      .select('id, tenant_id, student_id')
      .eq('id', enrollmentId)
      .maybeSingle()

    if (fetchError || !existing) {
      return { success: false, error: '수강 정보를 찾을 수 없습니다' }
    }
    if (existing.tenant_id !== tenantId) {
      return { success: false, error: '권한이 없습니다' }
    }

    const updateData: Record<string, unknown> = {
      status: validated.status,
      end_date: validated.end_date,
      notes: validated.notes,
      updated_at: new Date().toISOString(),
    }
    if (validated.status === 'withdrawn') {
      updateData.withdrawal_reason = validated.withdrawal_reason ?? null
    }

    const { error: updateError } = await supabase
      .from('class_enrollments')
      .update(updateData)
      .eq('id', enrollmentId)
      .eq('tenant_id', tenantId)

    if (updateError) throw updateError

    revalidatePath(`/students/${existing.student_id}`)
    revalidateTag(`classes:${tenantId}`)
    revalidateTag(`students:${tenantId}`)

    return { success: true, error: null }
  } catch (error) {
    console.error('[updateEnrollmentStatus] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}
