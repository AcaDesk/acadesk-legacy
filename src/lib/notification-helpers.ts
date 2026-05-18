/**
 * Notification Helpers
 *
 * Server-side utility for creating in-app notifications.
 * Import this from Server Actions only — not a Server Action itself.
 *
 * Design principles:
 * - Never throws: notification failures must not abort the calling action
 * - Batch INSERT: single query regardless of staff count (no N+1)
 * - Excludes the actor: only notifies other staff members
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type NotificationType =
  | 'attendance_alert'
  | 'consultation_scheduled'
  | 'consultation_summary_added'
  | 'todo_verified'
  | 'new_message'
  | 'kiosk_check_in'
  | 'kiosk_check_out'
  | 'homework_assigned'
  | 'retest_created'
  | 'exam_grading_completed'
  | 'student_enrolled'
  | 'student_withdrawn'

interface CreateNotificationParams {
  /** service-role Supabase client (caller provides it) */
  supabase: SupabaseClient
  tenantId: string
  /** The user performing the action — excluded from recipients */
  actorUserId: string
  type: NotificationType
  title: string
  message: string
  referenceType?: string | null
  referenceId?: string | null
  actionUrl?: string | null
}

interface CreateNotificationResult {
  notifiedCount: number
  error: string | null
}

/**
 * Create in-app notifications for all staff members in the tenant,
 * excluding the actor (the user who triggered the event).
 *
 * Safe to fire-and-forget with `void createNotification(...)`.
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<CreateNotificationResult> {
  try {
    const {
      supabase,
      tenantId,
      actorUserId,
      type,
      title,
      message,
      referenceType = null,
      referenceId = null,
      actionUrl = null,
    } = params

    // 1. Fetch all staff members (owner, instructor, assistant) except the actor
    const { data: staffUsers, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('role_code', ['owner', 'instructor', 'assistant'])
      .is('deleted_at', null)
      .neq('id', actorUserId)

    if (usersError) {
      console.error('[createNotification] Failed to fetch staff users:', usersError)
      return { notifiedCount: 0, error: usersError.message }
    }

    if (!staffUsers || staffUsers.length === 0) {
      return { notifiedCount: 0, error: null }
    }

    // 2. Batch INSERT — one query for all recipients
    const records = staffUsers.map((u) => ({
      tenant_id: tenantId,
      user_id: u.id,
      type,
      title,
      message,
      reference_type: referenceType,
      reference_id: referenceId,
      action_url: actionUrl,
      is_read: false,
    }))

    const { error: insertError } = await supabase
      .from('in_app_notifications')
      .insert(records)

    if (insertError) {
      console.error('[createNotification] Failed to insert notifications:', insertError)
      return { notifiedCount: 0, error: insertError.message }
    }

    return { notifiedCount: staffUsers.length, error: null }
  } catch (err) {
    // Swallow all errors — notification failure must never crash the caller
    const message = err instanceof Error ? err.message : String(err)
    console.error('[createNotification] Unexpected error:', message)
    return { notifiedCount: 0, error: message }
  }
}
