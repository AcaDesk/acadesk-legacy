/**
 * Notification Server Actions
 *
 * 모든 알림 작업은 이 Server Action을 통해 실행됩니다.
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getErrorMessage } from '@/lib/error-handlers'
import { NotificationRepository } from '@infra/db/repositories/notification.repository'

export interface InAppNotification {
  id: string
  tenant_id: string
  user_id: string
  type: string
  title: string
  message: string
  reference_type: string | null
  reference_id: string | null
  action_url: string | null
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}

/**
 * 현재 사용자의 알림 목록 조회
 * @param limit - 조회할 알림 개수 (기본: 20)
 * @returns 알림 목록
 */
export async function getNotifications(limit: number = 20) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('인증되지 않은 사용자입니다')
    }

    const repository = new NotificationRepository(supabase)
    const notifications = await repository.findAll({ userId: user.id }, limit)

    return {
      success: true,
      data: notifications,
      error: null,
    }
  } catch (error) {
    console.error('[getNotifications] Error:', error)
    return {
      success: false,
      data: [],
      error: getErrorMessage(error),
    }
  }
}

/**
 * 읽지 않은 알림 개수 조회
 * @returns 읽지 않은 알림 개수
 */
export async function getUnreadNotificationCount() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('인증되지 않은 사용자입니다')
    }

    const repository = new NotificationRepository(supabase)
    const count = await repository.countUnread(user.id)

    return {
      success: true,
      data: count,
      error: null,
    }
  } catch (error) {
    console.error('[getUnreadNotificationCount] Error:', error)
    return {
      success: false,
      data: 0,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 알림을 읽음 처리
 * @param notificationId - 알림 ID
 * @returns 성공 여부
 */
export async function markNotificationAsRead(notificationId: string) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('인증되지 않은 사용자입니다')
    }

    const repository = new NotificationRepository(supabase)
    await repository.markAsRead(notificationId)

    revalidatePath('/notifications')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[markNotificationAsRead] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}

/**
 * 모든 알림을 읽음 처리
 * @returns 성공 여부
 */
export async function markAllNotificationsAsRead() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('인증되지 않은 사용자입니다')
    }

    const repository = new NotificationRepository(supabase)
    await repository.markAllAsRead(user.id)

    revalidatePath('/notifications')

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    console.error('[markAllNotificationsAsRead] Error:', error)
    return {
      success: false,
      error: getErrorMessage(error),
    }
  }
}
