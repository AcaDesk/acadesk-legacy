'use client'

import { useState } from 'react'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { Checkbox } from '@ui/checkbox'
import { Switch } from '@ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import {
  ChevronDown,
  Eye,
  MessageSquareText,
  MoreHorizontal,
  RotateCcw,
  Send,
  Upload,
} from 'lucide-react'
import { KakaoTalkPreview } from '@/components/features/messaging/KakaoTalkPreview'
import { cn } from '@/lib/utils'
import type { EventSubscription } from '@/app/actions/messaging/event-subscriptions'
import { PROVISIONING_STATUS_CONFIG, resolveEventDisplay } from './event-display'

const DEFAULT_VISIBLE = 8

interface EventSubscriptionTableProps {
  subscriptions: EventSubscription[]
  selected: Set<string>
  onSelectionChange: (next: Set<string>) => void
  togglingEventType: string | null
  onToggle: (eventType: string, enabled: boolean) => void
  provisioningEventType: string | null
  onProvision: (eventType: string) => void
  onRetry: (eventType: string) => void
  onTestSend: (eventType: string) => void
}

export function EventSubscriptionTable({
  subscriptions,
  selected,
  onSelectionChange,
  togglingEventType,
  onToggle,
  provisioningEventType,
  onProvision,
  onRetry,
  onTestSend,
}: EventSubscriptionTableProps) {
  const [expanded, setExpanded] = useState(false)
  const [previewEvent, setPreviewEvent] = useState<EventSubscription | null>(null)

  const visible = expanded ? subscriptions : subscriptions.slice(0, DEFAULT_VISIBLE)
  const hiddenCount = subscriptions.length - DEFAULT_VISIBLE
  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.eventType))

  function toggleSelected(eventType: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(eventType)
    else next.delete(eventType)
    onSelectionChange(next)
  }

  function toggleAllVisible(checked: boolean) {
    const next = new Set(selected)
    for (const sub of visible) {
      if (checked) next.add(sub.eventType)
      else next.delete(sub.eventType)
    }
    onSelectionChange(next)
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) => toggleAllVisible(checked === true)}
                  aria-label="모두 선택"
                />
              </TableHead>
              <TableHead>이벤트 명</TableHead>
              <TableHead className="hidden lg:table-cell">설명</TableHead>
              <TableHead className="hidden md:table-cell">수신 대상</TableHead>
              <TableHead className="w-24">알림 사용</TableHead>
              <TableHead className="hidden sm:table-cell">발송 채널</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((sub) => {
              const display = resolveEventDisplay(sub.eventType, sub.sharedTemplate)
              const statusCfg = PROVISIONING_STATUS_CONFIG[sub.provisioningStatus]
              const StatusIcon = statusCfg.icon
              const isApproved = sub.provisioningStatus === 'approved'
              const isToggling = togglingEventType === sub.eventType
              const isProvisioning = provisioningEventType === sub.eventType
              const canProvision = sub.provisioningStatus === 'not_started'
              const canRetry =
                sub.provisioningStatus === 'rejected' || sub.provisioningStatus === 'failed'
              const isChecked = selected.has(sub.eventType)

              return (
                <TableRow
                  key={sub.eventType}
                  data-state={isChecked ? 'selected' : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        toggleSelected(sub.eventType, checked === true)
                      }
                      aria-label={`${display.name} 선택`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">{display.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{display.name}</p>
                        {!isApproved && (
                          <Badge
                            variant={statusCfg.variant}
                            className="mt-1 h-5 gap-1 px-1.5 text-[10px]"
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusCfg.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <p className="line-clamp-2 max-w-sm text-xs text-muted-foreground">
                      {display.description}
                    </p>
                    {sub.rejectionReason && (canRetry) && (
                      <p className="mt-1 line-clamp-1 max-w-sm text-[11px] text-destructive">
                        {sub.rejectionReason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {sub.sharedTemplate.recipients.map((label) => (
                        <span
                          key={label}
                          className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={sub.isEnabled}
                      onCheckedChange={(checked) => onToggle(sub.eventType, checked)}
                      disabled={!isApproved || isToggling}
                      aria-label={`${display.name} 알림 사용`}
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md border bg-amber-50 px-2 py-1 text-xs text-amber-900',
                        'dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
                      )}
                    >
                      <MessageSquareText className="h-3.5 w-3.5" />
                      카카오 알림톡
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="이벤트 작업"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setPreviewEvent(sub)}>
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          미리보기
                        </DropdownMenuItem>
                        {isApproved && (
                          <DropdownMenuItem onClick={() => onTestSend(sub.eventType)}>
                            <Send className="mr-2 h-3.5 w-3.5" />
                            테스트 발송
                          </DropdownMenuItem>
                        )}
                        {(canProvision || canRetry) && <DropdownMenuSeparator />}
                        {canProvision && (
                          <DropdownMenuItem
                            onClick={() => onProvision(sub.eventType)}
                            disabled={isProvisioning}
                          >
                            <Upload className="mr-2 h-3.5 w-3.5" />
                            {isProvisioning ? '등록중...' : '템플릿 등록'}
                          </DropdownMenuItem>
                        )}
                        {canRetry && (
                          <DropdownMenuItem
                            onClick={() => onRetry(sub.eventType)}
                            disabled={isProvisioning}
                          >
                            <RotateCcw className="mr-2 h-3.5 w-3.5" />
                            {isProvisioning ? '재등록중...' : '재등록'}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {!expanded && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex w-full items-center justify-center gap-1 border-t bg-muted/30 py-3 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            더보기 ({hiddenCount}개)
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Dialog open={previewEvent !== null} onOpenChange={(open) => !open && setPreviewEvent(null)}>
        <DialogContent className="max-w-md">
          {previewEvent && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {resolveEventDisplay(previewEvent.eventType, previewEvent.sharedTemplate).name}
                </DialogTitle>
                <DialogDescription>
                  실제 발송 시 보호자가 받는 알림톡 화면입니다.
                </DialogDescription>
              </DialogHeader>
              <KakaoTalkPreview
                content={previewEvent.sharedTemplate.content}
                variables={previewEvent.sharedTemplate.variables}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
