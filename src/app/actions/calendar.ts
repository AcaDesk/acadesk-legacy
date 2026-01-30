/**
 * Calendar Management Server Actions
 *
 * 캘린더 일정 관리를 위한 Server Actions
 */

'use server'

import { revalidatePath } from 'next/cache'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getErrorMessage } from '@/lib/error-handlers'
import type { CalendarEvent } from '@/core/types/calendar'

/**
 * Get all calendar events for the tenant
 *
 * @returns Calendar events or error
 */
export async function getCalendarEvents() {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('start_at', { ascending: true })

    if (error) {
      throw error
    }

    return {
      success: true,
      data: (data || []) as CalendarEvent[],
      error: null,
    }
  } catch (error) {
    console.error('[getCalendarEvents] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Create a new calendar event
 *
 * @param eventData - Event data
 * @returns Created event or error
 */
export async function createCalendarEvent(eventData: {
  title: string
  description?: string | null
  event_type: string
  start_at: string
  end_at: string
  all_day: boolean
  recurrence_rule?: string | null
  reminder_minutes?: number | null
  color?: string | null
}) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        tenant_id: tenantId,
        ...eventData,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/calendar')

    return {
      success: true,
      data: data as CalendarEvent,
      error: null,
    }
  } catch (error) {
    console.error('[createCalendarEvent] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Update a calendar event
 *
 * @param eventId - Event ID
 * @param eventData - Updated event data
 * @returns Updated event or error
 */
export async function updateCalendarEvent(
  eventId: string,
  eventData: Partial<{
    title: string
    description: string | null
    event_type: string
    start_at: string
    end_at: string
    all_day: boolean
    recurrence_rule: string | null
    reminder_minutes: number | null
    color: string | null
  }>
) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('calendar_events')
      .update(eventData)
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath('/calendar')

    return {
      success: true,
      data: data as CalendarEvent,
      error: null,
    }
  } catch (error) {
    console.error('[updateCalendarEvent] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}

/**
 * Delete a calendar event (soft delete)
 *
 * @param eventId - Event ID
 * @returns Success or error
 */
export async function deleteCalendarEvent(eventId: string) {
  try {
    const { tenantId } = await verifyStaff()
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('calendar_events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', eventId)
      .eq('tenant_id', tenantId)

    if (error) {
      throw error
    }

    revalidatePath('/calendar')

    return {
      success: true,
      data: null,
      error: null,
    }
  } catch (error) {
    console.error('[deleteCalendarEvent] Error:', error)
    return {
      success: false,
      data: null,
      error: getErrorMessage(error),
    }
  }
}
