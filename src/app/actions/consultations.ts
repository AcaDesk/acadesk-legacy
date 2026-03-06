/**
 * Consultation Management Server Actions
 *
 * 상담 관리의 모든 CUD 작업은 이 Server Action을 통해 service_role로 실행됩니다.
 * - 상담 기록 관리 (consultations)
 * - 상담 노트 관리 (consultation_notes)
 * - 참석자 관리 (consultation_participants)
 */

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getTodayKST, getDateKST } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-handlers'
import { createNotification } from '@/lib/notification-helpers'

// ============================================================================
// Validation Schemas
// ============================================================================

const createConsultationSchema = z.object({
  // 재원생 상담 또는 신규 입회 상담
  isLead: z.boolean().default(false),

  // 재원생 상담 (isLead = false)
  studentId: z.string().uuid().optional(),

  // 신규 입회 상담 (isLead = true)
  leadName: z.string().optional(),
  leadGuardianName: z.string().optional(),
  leadGuardianPhone: z.string().optional(),
  leadSchool: z.string().optional(),

  // 공통 필드
  consultationDate: z.string(), // ISO datetime string
  consultationType: z.enum(['parent_meeting', 'phone_call', 'video_call', 'in_person']),
  durationMinutes: z.preprocess(
    (val) => (val === '' || val === undefined || val === null || Number.isNaN(val) ? undefined : Number(val)),
    z.number().int().positive().optional(),
  ),
  title: z.string().min(1, '상담 제목은 필수입니다'),
  summary: z.string().optional(),
  outcome: z.string().optional(),
  nextConsultationDate: z.string().optional().nullable(), // ISO date string
  followUpRequired: z.boolean().optional(),
}).refine(
  (data) => {
    if (!data.isLead && !data.studentId) return false
    if (data.isLead && !data.leadName) return false
    return true
  },
  {
    message: '재원생 상담은 학생을, 신규 상담은 잠재 고객 이름을 입력해주세요',
  }
).refine(
  (data) => {
    if (data.followUpRequired && !data.nextConsultationDate) return false
    return true
  },
  {
    message: '후속 상담 필요 시 다음 상담 예정일을 입력해주세요',
    path: ['nextConsultationDate'],
  }
)

const updateConsultationSchema = z.object({
  id: z.string().uuid(),
  consultationDate: z.string().optional(),
  consultationType: z.enum(['parent_meeting', 'phone_call', 'video_call', 'in_person']).optional(),
  durationMinutes: z.number().int().positive().optional().nullable(),
  title: z.string().min(1, '상담 제목은 필수입니다').optional(),
  summary: z.string().optional().nullable(),
  outcome: z.string().optional().nullable(),
  nextConsultationDate: z.string().optional().nullable(),
  followUpRequired: z.boolean().optional(),
})

const createNoteSchema = z.object({
  consultationId: z.string().uuid(),
  noteOrder: z.number().int().positive().optional(),
  category: z.string().optional(),
  content: z.string().min(1, '노트 내용은 필수입니다'),
})

const updateNoteSchema = z.object({
  id: z.string().uuid(),
  noteOrder: z.number().int().positive().optional(),
  category: z.string().optional().nullable(),
  content: z.string().min(1, '노트 내용은 필수입니다').optional(),
})

const addParticipantSchema = z.object({
  consultationId: z.string().uuid(),
  participantType: z.enum(['instructor', 'guardian', 'student', 'other']),
  userId: z.string().uuid().optional(),
  guardianId: z.string().uuid().optional(),
  name: z.string().min(1, '참석자 이름은 필수입니다'),
  role: z.string().optional(),
})

// ============================================================================
// Consultation Management
// ============================================================================

/**
 * Get all consultations
 *
 * @param options - Filter options
 * @returns Consultation list or error
 */
export async function getConsultations(options?: {
  studentId?: string
  conductedBy?: string
  followUpOnly?: boolean
  isLead?: boolean
  startDate?: string
  endDate?: string
  consultationType?: string
  searchTerm?: string
  page?: number
  pageSize?: number
  limit?: number
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const page = options?.page ?? 1
    const pageSize = options?.pageSize ?? 20
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('consultations')
      .select('*, students!student_id(id, name), users!consultations_conducted_by_fkey(id, name)', { count: 'planned' })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (options?.studentId) {
      query = query.eq('student_id', options.studentId)
    }
    if (options?.conductedBy) {
      query = query.eq('conducted_by', options.conductedBy)
    }
    if (options?.followUpOnly) {
      query = query.eq('follow_up_required', true)
    }
    if (options?.isLead !== undefined) {
      query = query.eq('is_lead', options.isLead)
    }
    if (options?.startDate) {
      query = query.gte('consultation_date', options.startDate)
    }
    if (options?.endDate) {
      query = query.lte('consultation_date', options.endDate)
    }
    if (options?.consultationType) {
      query = query.eq('consultation_type', options.consultationType)
    }

    // 검색어 필터: student name, lead_name, title, summary 매칭
    if (options?.searchTerm && options.searchTerm.trim()) {
      const term = options.searchTerm.trim().slice(0, 100)
      const safeTerm = term.replace(/[%_\\]/g, '\\$&')
      query = query.or([
        `title.ilike.%${safeTerm}%`,
        `summary.ilike.%${safeTerm}%`,
        `lead_name.ilike.%${safeTerm}%`,
        `students.name.ilike.%${safeTerm}%`,
      ].join(','))
    }

    query = query.order('consultation_date', { ascending: false })

    // limit 모드 (하위호환성) vs pagination 모드
    if (options?.limit && !options?.page) {
      query = query.limit(options.limit)
    } else {
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      totalCount: count ?? 0,
      error: null,
    }
  } catch (error) {
    console.error('[getConsultations] Error:', error)
    return {
      success: false,
      data: null,
      totalCount: 0,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get a single consultation by ID
 *
 * @param id - Consultation ID
 * @param includeDetails - Include notes and participants
 * @returns Consultation or error
 */
export async function getConsultationById(id: string, includeDetails = true) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('consultations')
      .select(
        includeDetails
          ? `
            *,
            students!student_id(id, name, grade),
            users!consultations_conducted_by_fkey(id, name),
            consultation_notes(*),
            consultation_participants(*)
          `
          : '*'
      )
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('상담 기록을 찾을 수 없습니다')
    }

    // TODO(types): Type will be available after migration is applied
    // Filter out deleted notes and participants
    if (includeDetails) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((data as any).consultation_notes) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(data as any).consultation_notes = (data as any).consultation_notes
          .filter((note: { deleted_at: string | null }) => !note.deleted_at)
          .sort((a: { note_order: number }, b: { note_order: number }) => a.note_order - b.note_order)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((data as any).consultation_participants) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(data as any).consultation_participants = (data as any).consultation_participants
          .filter((p: { deleted_at: string | null }) => !p.deleted_at)
      }
    }

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[getConsultationById] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get consultation statistics (total counts, independent of pagination)
 */
export async function getConsultationStats() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 4개 count 쿼리를 병렬 실행
    const [totalResult, leadResult, studentResult, convertedResult] = await Promise.all([
      supabase
        .from('consultations')
        .select('*', { count: 'planned', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
      supabase
        .from('consultations')
        .select('*', { count: 'planned', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_lead', true)
        .is('converted_to_student_id', null)
        .is('deleted_at', null),
      supabase
        .from('consultations')
        .select('*', { count: 'planned', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_lead', false)
        .is('deleted_at', null),
      supabase
        .from('consultations')
        .select('*', { count: 'planned', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_lead', true)
        .not('converted_to_student_id', 'is', null)
        .is('deleted_at', null),
    ])

    return {
      success: true,
      data: {
        total: totalResult.count ?? 0,
        lead: leadResult.count ?? 0,
        student: studentResult.count ?? 0,
        converted: convertedResult.count ?? 0,
      },
      error: null,
    }
  } catch (error) {
    console.error('[getConsultationStats] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get filter options for consultation list (conductor list)
 */
export async function getConsultationFilterOptions() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data: consultationRows, error: consultationError } = await supabase
      .from('consultations')
      .select('conducted_by')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (consultationError) {
      throw consultationError
    }

    const conductorIds = Array.from(
      new Set(
        (consultationRows || [])
          .map((row) => row.conducted_by)
          .filter((value): value is string => Boolean(value))
      )
    )

    if (conductorIds.length === 0) {
      return {
        success: true,
        data: {
          conductors: [],
        },
        error: null,
      }
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .in('id', conductorIds)
      .order('name', { ascending: true })

    if (usersError) {
      throw usersError
    }

    return {
      success: true,
      data: {
        conductors: (users || []).map((user) => ({
          id: user.id,
          name: user.name || 'Unknown',
        })),
      },
      error: null,
    }
  } catch (error) {
    console.error('[getConsultationFilterOptions] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create a new consultation
 *
 * @param input - Consultation data
 * @returns Created consultation or error
 */
export async function createConsultation(
  input: z.infer<typeof createConsultationSchema>
) {
  try {
    const validated = createConsultationSchema.parse(input)
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('consultations')
      .insert({
        tenant_id: tenantId,
        is_lead: validated.isLead,
        student_id: validated.isLead ? null : validated.studentId,
        lead_name: validated.isLead ? validated.leadName : null,
        lead_guardian_name: validated.isLead ? validated.leadGuardianName : null,
        lead_guardian_phone: validated.isLead ? validated.leadGuardianPhone : null,
        lead_school: validated.isLead ? validated.leadSchool : null,
        consultation_date: validated.consultationDate,
        consultation_type: validated.consultationType,
        duration_minutes: validated.durationMinutes ?? null,
        title: validated.title,
        summary: validated.summary || null,
        outcome: validated.outcome || null,
        next_consultation_date: validated.nextConsultationDate || null,
        follow_up_required: validated.followUpRequired ?? false,
        conducted_by: userId,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/consultations')
    if (validated.studentId) {
      revalidatePath(`/students/${validated.studentId}`)
    }

    // 상담 등록 알림 발송 (fire-and-forget)
    const subjectName = validated.isLead
      ? (validated.leadName ?? '잠재고객')
      : '학생'

    void createNotification({
      supabase,
      tenantId,
      actorUserId: userId,
      type: 'consultation_scheduled',
      title: '상담 등록',
      message: `${subjectName} 상담이 등록되었습니다: ${validated.title}`,
      referenceType: 'consultation',
      referenceId: data?.id ?? null,
      actionUrl: '/consultations',
    })

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createConsultation] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update a consultation
 *
 * @param input - Consultation data with ID
 * @returns Updated consultation or error
 */
export async function updateConsultation(
  input: z.infer<typeof updateConsultationSchema>
) {
  try {
    const validated = updateConsultationSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validated.consultationDate !== undefined) {
      updateData.consultation_date = validated.consultationDate
    }
    if (validated.consultationType !== undefined) {
      updateData.consultation_type = validated.consultationType
    }
    if (validated.durationMinutes !== undefined) {
      updateData.duration_minutes = validated.durationMinutes
    }
    if (validated.title !== undefined) {
      updateData.title = validated.title
    }
    if (validated.summary !== undefined) {
      updateData.summary = validated.summary
    }
    if (validated.outcome !== undefined) {
      updateData.outcome = validated.outcome
    }
    if (validated.nextConsultationDate !== undefined) {
      updateData.next_consultation_date = validated.nextConsultationDate
    }
    if (validated.followUpRequired !== undefined) {
      updateData.follow_up_required = validated.followUpRequired
    }

    const { data, error } = await supabase
      .from('consultations')
      .update(updateData)
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('상담 기록을 찾을 수 없습니다')
    }

    revalidatePath('/consultations')
    revalidatePath(`/consultations/${validated.id}`)
    if (data.student_id) {
      revalidatePath(`/students/${data.student_id}`)
    }

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateConsultation] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete a consultation (soft delete)
 *
 * @param id - Consultation ID
 * @returns Success or error
 */
export async function deleteConsultation(id: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get student_id for revalidation
    const { data: consultation } = await supabase
      .from('consultations')
      .select('student_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    const { error } = await supabase
      .from('consultations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    revalidatePath('/consultations')
    if (consultation?.student_id) {
      revalidatePath(`/students/${consultation.student_id}`)
    }

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[deleteConsultation] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Consultation Notes Management
// ============================================================================

/**
 * Create a consultation note
 *
 * @param input - Note data
 * @returns Created note or error
 */
export async function createConsultationNote(
  input: z.infer<typeof createNoteSchema>
) {
  try {
    const validated = createNoteSchema.parse(input)
    const { tenantId, userId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('consultation_notes')
      .insert({
        tenant_id: tenantId,
        consultation_id: validated.consultationId,
        note_order: validated.noteOrder ?? 1,
        category: validated.category || null,
        content: validated.content,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath(`/consultations/${validated.consultationId}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[createConsultationNote] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update a consultation note
 *
 * @param input - Note data with ID
 * @returns Updated note or error
 */
export async function updateConsultationNote(
  input: z.infer<typeof updateNoteSchema>
) {
  try {
    const validated = updateNoteSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (validated.noteOrder !== undefined) {
      updateData.note_order = validated.noteOrder
    }
    if (validated.category !== undefined) {
      updateData.category = validated.category
    }
    if (validated.content !== undefined) {
      updateData.content = validated.content
    }

    const { data, error } = await supabase
      .from('consultation_notes')
      .update(updateData)
      .eq('id', validated.id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('노트를 찾을 수 없습니다')
    }

    revalidatePath(`/consultations/${data.consultation_id}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[updateConsultationNote] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete a consultation note (soft delete)
 *
 * @param id - Note ID
 * @returns Success or error
 */
export async function deleteConsultationNote(id: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get consultation_id for revalidation
    const { data: note } = await supabase
      .from('consultation_notes')
      .select('consultation_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    const { error } = await supabase
      .from('consultation_notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    if (note?.consultation_id) {
      revalidatePath(`/consultations/${note.consultation_id}`)
    }

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[deleteConsultationNote] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Consultation Participants Management
// ============================================================================

/**
 * Add a participant to consultation
 *
 * @param input - Participant data
 * @returns Created participant or error
 */
export async function addConsultationParticipant(
  input: z.infer<typeof addParticipantSchema>
) {
  try {
    const validated = addParticipantSchema.parse(input)
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('consultation_participants')
      .insert({
        tenant_id: tenantId,
        consultation_id: validated.consultationId,
        participant_type: validated.participantType,
        user_id: validated.userId || null,
        guardian_id: validated.guardianId || null,
        name: validated.name || null,
        role: validated.role || null,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath(`/consultations/${validated.consultationId}`)

    return {
      success: true,
      data,
      error: null,
    }
  } catch (error) {
    console.error('[addConsultationParticipant] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Remove a participant from consultation (soft delete)
 *
 * @param id - Participant ID
 * @returns Success or error
 */
export async function removeConsultationParticipant(id: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // Get consultation_id for revalidation
    const { data: participant } = await supabase
      .from('consultation_participants')
      .select('consultation_id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    const { error } = await supabase
      .from('consultation_participants')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    if (participant?.consultation_id) {
      revalidatePath(`/consultations/${participant.consultation_id}`)
    }

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[removeConsultationParticipant] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Get upcoming follow-up consultations
 *
 * @param daysAhead - Number of days to look ahead (default: 7)
 * @returns Upcoming consultations or error
 */
export async function getUpcomingFollowUps(daysAhead = 7) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const today = getTodayKST()
    const endDate = getDateKST(daysAhead)

    const { data, error } = await supabase
      .from('consultations')
      .select('*, students!student_id(id, name), users!consultations_conducted_by_fkey(id, name)')
      .eq('tenant_id', tenantId)
      .eq('follow_up_required', true)
      .gte('next_consultation_date', today)
      .lte('next_consultation_date', endDate)
      .is('deleted_at', null)
      .order('next_consultation_date', { ascending: true })

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getUpcomingFollowUps] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Bulk delete consultations (soft delete)
 *
 * @param ids - Consultation IDs to delete
 * @returns Success or error
 */
export async function bulkDeleteConsultations(ids: string[]) {
  try {
    if (!ids.length) throw new Error('삭제할 상담이 없습니다')

    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('consultations')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) throw error

    revalidatePath('/consultations')

    return { success: true, error: null }
  } catch (error) {
    console.error('[bulkDeleteConsultations] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

/**
 * Bulk update conductor for consultations
 *
 * @param ids - Consultation IDs to update
 * @param conductorId - New conductor user ID
 * @returns Success or error
 */
export async function bulkUpdateConductor(ids: string[], conductorId: string) {
  try {
    if (!ids.length) throw new Error('변경할 상담이 없습니다')

    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('consultations')
      .update({ conducted_by: conductorId, updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) throw error

    revalidatePath('/consultations')

    return { success: true, error: null }
  } catch (error) {
    console.error('[bulkUpdateConductor] Error:', error)
    return { success: false, error: getErrorMessage(error) }
  }
}

// ============================================================================
// Lead Consultation (입회 상담) Management
// ============================================================================

/**
 * Mark lead consultation as converted to student
 * 신규 입회 상담을 학생 등록 완료로 표시
 *
 * @param consultationId - Consultation ID
 * @param studentId - Created student ID
 * @returns Success or error
 */
export async function convertLeadToStudent(consultationId: string, studentId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    // 1. Verify consultation is a lead
    const { data: consultation, error: fetchError } = await supabase
      .from('consultations')
      .select('is_lead')
      .eq('id', consultationId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!consultation?.is_lead) {
      throw new Error('해당 상담은 신규 입회 상담이 아닙니다')
    }

    // 2. Mark as converted
    const { error } = await supabase
      .from('consultations')
      .update({
        converted_to_student_id: studentId,
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultationId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)

    if (error) {
      throw error
    }

    revalidatePath('/consultations')
    revalidatePath(`/consultations/${consultationId}`)
    revalidatePath(`/students/${studentId}`)

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[convertLeadToStudent] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
