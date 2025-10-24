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
import { getErrorMessage } from '@/lib/error-handlers'

// ============================================================================
// Validation Schemas
// ============================================================================

const createConsultationSchema = z.object({
  studentId: z.string().uuid(),
  consultationDate: z.string(), // ISO datetime string
  consultationType: z.enum(['parent_meeting', 'phone_call', 'video_call', 'in_person']),
  durationMinutes: z.number().int().positive().optional(),
  title: z.string().min(1, '상담 제목은 필수입니다'),
  summary: z.string().optional(),
  outcome: z.string().optional(),
  nextConsultationDate: z.string().optional().nullable(), // ISO date string
  followUpRequired: z.boolean().optional(),
})

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
  name: z.string().optional(),
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
  startDate?: string
  endDate?: string
  limit?: number
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('consultations')
      .select('*, students(id, name), users!consultations_conducted_by_fkey(id, name)')
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
    if (options?.startDate) {
      query = query.gte('consultation_date', options.startDate)
    }
    if (options?.endDate) {
      query = query.lte('consultation_date', options.endDate)
    }

    query = query.order('consultation_date', { ascending: false })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return {
      success: true,
      data: data || [],
      error: null,
    }
  } catch (error) {
    console.error('[getConsultations] Error:', error)
    return {
      success: false,
      data: null,
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
            students(id, name, grade),
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
      if ((data as any).consultation_notes) {
        ;(data as any).consultation_notes = (data as any).consultation_notes
          .filter((note: any) => !note.deleted_at)
          .sort((a: any, b: any) => a.note_order - b.note_order)
      }
      if ((data as any).consultation_participants) {
        ;(data as any).consultation_participants = (data as any).consultation_participants
          .filter((p: any) => !p.deleted_at)
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
        student_id: validated.studentId,
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
    revalidatePath(`/students/${validated.studentId}`)

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
    revalidatePath(`/students/${data.student_id}`)

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

    const today = new Date().toISOString().split('T')[0]
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)
    const endDate = futureDate.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('consultations')
      .select('*, students(id, name), users!consultations_conducted_by_fkey(id, name)')
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
