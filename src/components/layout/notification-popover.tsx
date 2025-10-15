'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { NotificationRepository, type InAppNotification } from '@/services/data/notification.repository'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/error-handlers'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { isFeatureActive } from '@/lib/features.config'

export function NotificationPopover() {
  const [open, setOpen] = useState(false)
  const isNotificationActive = isFeatureActive('notificationSystem')
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()
  const notificationRepo = useMemo(() => new NotificationRepository(supabase), [supabase])
  const { user: currentUser } = useCurrentUser()
  const { toast } = useToast()

  // 알림 목록 로드
  const loadNotifications = useCallback(async () => {
    if (!currentUser) return

    try {
      setLoading(true)
      const data = await notificationRepo.findAll(
        { userId: currentUser.id },
        20 // 최근 20개
      )
      setNotifications(data)

      const count = await notificationRepo.countUnread(currentUser.id)
      setUnreadCount(count)
    } catch (error) {
      // 테이블이 아직 생성되지 않은 경우 무시 (마이그레이션 미적용 시)
      const errorMessage = getErrorMessage(error)
      if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
        // 테이블이 없는 경우 조용히 실패
        setNotifications([])
        setUnreadCount(0)
      } else {
        // 다른 에러는 토스트 표시
        toast({
          title: '알림 로드 실패',
          description: errorMessage,
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [currentUser, notificationRepo, toast])

  // 컴포넌트 마운트 시 알림 로드
  useEffect(() => {
    if (currentUser && isNotificationActive) {
      loadNotifications()
    }
  }, [currentUser, isNotificationActive, loadNotifications])

  // 알림 클릭 시 읽음 처리
  const handleNotificationClick = async (notification: InAppNotification) => {
    if (!notification.is_read) {
      try {
        await notificationRepo.markAsRead(notification.id)
        await loadNotifications() // 다시 로드하여 읽음 상태 반영
      } catch {
        // 에러는 무시 (사용자 경험을 방해하지 않음)
      }
    }

    // action_url이 있으면 해당 페이지로 이동
    if (notification.action_url) {
      setOpen(false)
      // Link 컴포넌트로 이동은 부모에서 처리
    }
  }

  // 모두 읽음 처리
  const handleMarkAllAsRead = async () => {
    if (!currentUser) return

    try {
      await notificationRepo.markAllAsRead(currentUser.id)
      await loadNotifications()
      toast({
        title: '모든 알림을 읽음 처리했습니다',
      })
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
        return 'bg-orange-100 text-orange-600'
      case 'new_message':
        return 'bg-blue-100 text-blue-600'
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
          className="absolute -top-1 -right-1 h-5 px-1.5 text-[10px] bg-amber-500 hover:bg-amber-500 pointer-events-none"
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
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
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
          <Link href="/notifications" onClick={() => setOpen(false)}>
            <Button variant="ghost" className="w-full text-sm" size="sm">
              모든 알림 보기
            </Button>
          </Link>
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
