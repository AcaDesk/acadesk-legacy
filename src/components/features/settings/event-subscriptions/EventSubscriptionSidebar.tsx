'use client'

import Link from 'next/link'
import { Button } from '@ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { BookOpen, Check, CircleSlash, Pause, Play } from 'lucide-react'

interface EventSubscriptionSidebarProps {
  selectedCount: number
  busy: boolean
  onEnableAll: () => void
  onPauseAll: () => void
  onEnableSelected: () => void
  onPauseSelected: () => void
}

export function EventSubscriptionSidebar({
  selectedCount,
  busy,
  onEnableAll,
  onPauseAll,
  onEnableSelected,
  onPauseSelected,
}: EventSubscriptionSidebarProps) {
  const hasSelection = selectedCount > 0

  return (
    <div className="space-y-4">
      {/* 안내 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">안내</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-1.5">
              <span className="select-none text-foreground">•</span>
              <span>설정한 이벤트가 발생하면 카카오 알림톡으로 자동 발송됩니다.</span>
            </li>
            <li className="flex gap-1.5">
              <span className="select-none text-foreground">•</span>
              <span>이벤트별 수신 대상과 알림 내용을 메시지 템플릿에서 관리할 수 있습니다.</span>
            </li>
            <li className="flex gap-1.5">
              <span className="select-none text-foreground">•</span>
              <span>알림 사용을 끄면 이벤트가 발생해도 발송되지 않습니다.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* 빠른 설정 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">빠른 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onEnableAll}
            disabled={busy}
          >
            <Check className="h-3.5 w-3.5" />
            <span>모든 알림 사용</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onPauseAll}
            disabled={busy}
          >
            <CircleSlash className="h-3.5 w-3.5" />
            <span>모든 알림 일시 중지</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onEnableSelected}
            disabled={busy || !hasSelection}
          >
            <Play className="h-3.5 w-3.5" />
            <span>선택한 알림 사용 {hasSelection ? `(${selectedCount})` : ''}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onPauseSelected}
            disabled={busy || !hasSelection}
          >
            <Pause className="h-3.5 w-3.5" />
            <span>선택한 알림 중지 {hasSelection ? `(${selectedCount})` : ''}</span>
          </Button>
        </CardContent>
      </Card>

      {/* 도움말 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">도움말</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            이벤트 알림 설정 방법이 궁금하신가요?
          </p>
          <Button variant="outline" size="sm" className="w-full justify-center gap-2" asChild>
            <Link
              href="https://docs.acadesk.com/event-notifications"
              target="_blank"
              rel="noopener noreferrer"
            >
              <BookOpen className="h-3.5 w-3.5" />
              가이드 보기
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
