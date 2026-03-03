'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ui/popover'
import { Button } from '@ui/button'
import { ScrollArea } from '@ui/scroll-area'
import { Badge } from '@ui/badge'
import { cn } from '@/lib/utils'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type InAppNotification
} from '@/app/actions/messaging/notifications'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-handlers'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { isFeatureActive } from '@/lib/features.config'
import { createClient } from '@/lib/supabase/client'

export function NotificationPopover() {
  const [open, setOpen] = useState(false)
  const isNotificationActive = isFeatureActive('notificationSystem')
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  // Realtime 채널 정리용 ref
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  const { user: currentUser } = useCurrentUser()
  const { toast } = useToast()

  // 알림 목록 로드
  const loadNotifications = useCallback(async () => {
    if (!currentUser || !currentUser.tenantId) return

    try {
      setLoading(true)

      const [notificationsResult, countResult] = await Promise.all([
        getNotifications(20),
        getUnreadNotificationCount(),
      ])

      if (notificationsResult.success && notificationsResult.data) {
        setNotifications(notificationsResult.data)
      }

      if (countResult.success && countResult.data !== undefined) {
        setUnreadCount(countResult.data)
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        setNotifications([])
        setUnreadCount(0)
      } else {
        toast({
          title: '알림 로드 실패',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [currentUser, toast])

  // 컴포넌트 마운트 시 최초 로드
  useEffect(() => {
    if (currentUser && isNotificationActive) {
      void loadNotifications()
    }
  }, [currentUser, isNotificationActive, loadNotifications])

  // Supabase Realtime 구독 — 새 알림 INSERT 즉시 반영
  useEffect(() => {
    if (!currentUser?.id || !isNotificationActive) return

    const supabase = createClient()

    const channel = supabase
      .channel(`notifications:${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          // 낙관적 상태 업데이트 — 서버 재요청 없음
          const newNotif = payload.new as InAppNotification
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20))
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [currentUser?.id, isNotificationActive])

  // 팝오버가 열릴 때마다 최신 상태 동기화 (다른 세션에서 읽음 처리 반영)
  useEffect(() => {
    if (!open || !currentUser || !isNotificationActive) return

    void loadNotifications()

    const intervalId = window.setInterval(() => {
      void loadNotifications()
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [open, currentUser, isNotificationActive, loadNotifications])

  // 알림 클릭 — 낙관적 읽음 처리 (서버 재로드 없음)
  const handleNotificationClick = (notification: InAppNotification) => {
    if (!notification.is_read) {
      // 낙관적 업데이트
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      // 서버 비동기 처리 (결과 무시)
      void markNotificationAsRead(notification.id)
    }

    if (notification.action_url) {
      setOpen(false)
    }
  }

  // 모두 읽음 처리
  const handleMarkAllAsRead = async () => {
    if (!currentUser) return

    try {
      const result = await markAllNotificationsAsRead()

      if (!result.success) {
        throw new Error(result.error || '읽음 처리 실패')
      }

      // 낙관적 업데이트
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)

      toast({ title: '모든 알림을 읽음 처리했습니다' })
    } catch (error) {
      toast({
        title: '읽음 처리 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    }
  }

  // 알림 타입별 아이콘 스타일
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'todo_verified':
        return 'bg-green-100 text-green-600'
      case 'attendance_alert':
        return 'bg-warning/10 text-warning'
      case 'new_message':
        return 'bg-info/10 text-info'
      case 'consultation_scheduled':
        return 'bg-purple-100 text-purple-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  // 준비 중 기능 클릭 처리
  const handleComingSoonClick = () => {
    toast({
      title: '준비 중입니다',
      description: '알림 기능은 현재 개발 중입니다. 곧 만나보실 수 있습니다!',
    })
  }

  // 기능이 비활성화되어 있으면 준비 중 버튼만 표시
  if (!isNotificationActive) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleComingSoonClick}
          aria-label="알림 (준비 중)"
        >
          <Bell className="h-5 w-5" />
        </Button>
        <Badge
          className="absolute -top-1 -right-1 h-5 px-1.5 text-[10px] bg-warning hover:bg-warning pointer-events-none"
        >
          준비중
        </Badge>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="알림"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '읽지 않은 알림 없음'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">알림</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unreadCount}개의 새 알림
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              모두 읽음
            </Button>
          )}
        </div>

        {/* 알림 목록 */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">로딩 중...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground text-center">
                새로운 알림이 없습니다
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  getStyle={getNotificationStyle}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* 푸터 */}
        <div className="border-t p-2">
          <Button asChild variant="ghost" className="w-full text-sm" size="sm">
            <Link href="/notifications" onClick={() => setOpen(false)}>
              모든 알림 보기
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// 개별 알림 아이템 컴포넌트
function NotificationItem({
  notification,
  onClick,
  getStyle,
}: {
  notification: InAppNotification
  onClick: () => void
  getStyle: (type: string) => string
}) {
  const content = (
    <div
      className={cn(
        'flex gap-3 p-4 hover:bg-muted cursor-pointer transition-colors',
        !notification.is_read && 'bg-blue-50/50'
      )}
      onClick={onClick}
    >
      {/* 아이콘 */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          getStyle(notification.type)
        )}
      >
        <Bell className="h-5 w-5" />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-medium text-sm">{notification.title}</p>
          {!notification.is_read && (
            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: ko,
          })}
        </p>
      </div>
    </div>
  )

  // action_url이 있으면 Link로 감싸기
  if (notification.action_url) {
    return <Link href={notification.action_url}>{content}</Link>
  }

  return content
}
