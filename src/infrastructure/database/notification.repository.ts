/**
 * In-App Notification Repository
 *
 * 사용자 인앱 알림 데이터 접근 레이어 - 순수 CRUD 작업만 수행
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IDataSource } from '@/domain/data-sources/IDataSource'
import { DatabaseError } from '@/lib/error-types'
import { logError } from '@/lib/error-handlers'
import { SupabaseDataSource } from '../data-sources/SupabaseDataSource'

// ==================== Types ====================

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

export interface CreateNotificationInput {
  user_id: string
  type: string
  title: string
  message: string
  reference_type?: string | null
  reference_id?: string | null
  action_url?: string | null
}

export interface NotificationFilters {
  userId?: string
  isRead?: boolean
  type?: string
}

// ==================== Repository ====================

export class NotificationRepository {
  private dataSource: IDataSource

  constructor(client: IDataSource | SupabaseClient) {
    this.dataSource = this.isDataSource(client)
      ? client
      : new SupabaseDataSource(client)
  }

  private isDataSource(client: any): client is IDataSource {
    return typeof client.from === 'function' && typeof client.rpc === 'function'
  }

  /**
   * 사용자의 알림 목록 조회
   */
  async findAll(filters: NotificationFilters, limit: number = 50): Promise<InAppNotification[]> {
    try {
      let query = this.dataSource
        .from('in_app_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (filters.userId) {
        query = query.eq('user_id', filters.userId)
      }

      if (filters.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead)
      }

      if (filters.type) {
        query = query.eq('type', filters.type)
      }

      const { data, error } = await query

      if (error) {
        logError(error, {
          repository: 'NotificationRepository',
          method: 'findAll',
          filters
        })
        throw new DatabaseError('알림 목록을 조회할 수 없습니다', error)
      }

      return (data || []) as InAppNotification[]
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'NotificationRepository', method: 'findAll' })
      throw new DatabaseError('알림 목록을 조회할 수 없습니다')
    }
  }

  /**
   * 사용자의 안 읽은 알림 개수 조회
   */
  async countUnread(userId: string): Promise<number> {
    try {
      const { count, error } = await this.dataSource
        .from('in_app_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        logError(error, {
          repository: 'NotificationRepository',
          method: 'countUnread',
          userId
        })
        throw new DatabaseError('안 읽은 알림 개수를 조회할 수 없습니다', error)
      }

      return count || 0
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'NotificationRepository', method: 'countUnread' })
      throw new DatabaseError('안 읽은 알림 개수를 조회할 수 없습니다')
    }
  }

  /**
   * 알림 생성
   */
  async create(tenantId: string, input: CreateNotificationInput): Promise<InAppNotification> {
    try {
      const { data, error } = await this.dataSource
        .from('in_app_notifications')
        .insert({
          tenant_id: tenantId,
          user_id: input.user_id,
          type: input.type,
          title: input.title,
          message: input.message,
          reference_type: input.reference_type || null,
          reference_id: input.reference_id || null,
          action_url: input.action_url || null,
        })
        .select()
        .single()

      if (error) {
        logError(error, {
          repository: 'NotificationRepository',
          method: 'create',
          input
        })
        throw new DatabaseError('알림을 생성할 수 없습니다', error)
      }

      return data as InAppNotification
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'NotificationRepository', method: 'create' })
      throw new DatabaseError('알림을 생성할 수 없습니다')
    }
  }

  /**
   * 알림 읽음 처리
   */
  async markAsRead(notificationId: string): Promise<InAppNotification> {
    try {
      const { data, error } = await this.dataSource
        .from('in_app_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .select()
        .single()

      if (error) {
        logError(error, {
          repository: 'NotificationRepository',
          method: 'markAsRead',
          notificationId
        })
        throw new DatabaseError('알림을 읽음 처리할 수 없습니다', error)
      }

      return data as InAppNotification
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'NotificationRepository', method: 'markAsRead' })
      throw new DatabaseError('알림을 읽음 처리할 수 없습니다')
    }
  }

  /**
   * 여러 알림 읽음 처리
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    try {
      const { error } = await this.dataSource
        .from('in_app_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .in('id', notificationIds)

      if (error) {
        logError(error, {
          repository: 'NotificationRepository',
          method: 'markMultipleAsRead',
          notificationIds
        })
        throw new DatabaseError('알림들을 읽음 처리할 수 없습니다', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'NotificationRepository', method: 'markMultipleAsRead' })
      throw new DatabaseError('알림들을 읽음 처리할 수 없습니다')
    }
  }

  /**
   * 사용자의 모든 알림 읽음 처리
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await this.dataSource
        .from('in_app_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) {
        logError(error, {
          repository: 'NotificationRepository',
          method: 'markAllAsRead',
          userId
        })
        throw new DatabaseError('모든 알림을 읽음 처리할 수 없습니다', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'NotificationRepository', method: 'markAllAsRead' })
      throw new DatabaseError('모든 알림을 읽음 처리할 수 없습니다')
    }
  }

  /**
   * 알림 삭제
   */
  async delete(notificationId: string): Promise<void> {
    try {
      const { error } = await this.dataSource
        .from('in_app_notifications')
        .delete()
        .eq('id', notificationId)

      if (error) {
        logError(error, {
          repository: 'NotificationRepository',
          method: 'delete',
          notificationId
        })
        throw new DatabaseError('알림을 삭제할 수 없습니다', error)
      }
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'NotificationRepository', method: 'delete' })
      throw new DatabaseError('알림을 삭제할 수 없습니다')
    }
  }

  /**
   * 읽은 알림 일괄 삭제 (30일 이상 된 것)
   */
  async deleteOldReadNotifications(userId: string, daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { data, error } = await this.dataSource
        .from('in_app_notifications')
        .delete()
        .eq('user_id', userId)
        .eq('is_read', true)
        .lt('read_at', cutoffDate.toISOString())
        .select('id')

      if (error) {
        logError(error, {
          repository: 'NotificationRepository',
          method: 'deleteOldReadNotifications',
          userId,
          daysOld
        })
        throw new DatabaseError('오래된 알림을 삭제할 수 없습니다', error)
      }

      return (data as any[] || []).length
    } catch (error) {
      if (error instanceof DatabaseError) throw error
      logError(error, { repository: 'NotificationRepository', method: 'deleteOldReadNotifications' })
      throw new DatabaseError('오래된 알림을 삭제할 수 없습니다')
    }
  }
}

// ==================== Factory Functions ====================

/**
 * Client-side용 Repository 생성 (Supabase client 전달 필요)
 */
export function createClientNotificationRepository(supabase: SupabaseClient): NotificationRepository {
  return new NotificationRepository(supabase)
}
