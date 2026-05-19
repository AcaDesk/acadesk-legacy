'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { MessageCircle, Settings, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  removeKakaoChannel,
  type KakaoChannelConfig,
} from '@/app/actions/messaging/kakao-channel'
import { translateSolapiError, isPartialDeletionError } from '@/lib/solapi-error-translator'
import { cn } from '@/lib/utils'
import { KakaoChannelSettingsDialog } from './KakaoChannelSettingsDialog'

type ChannelStatusValue = NonNullable<KakaoChannelConfig['channelStatus']>

const CHANNEL_STATUS_DISPLAY: Record<
  ChannelStatusValue,
  { label: string; dotClass: string; textClass: string }
> = {
  active: {
    label: '정상',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
  },
  pending: {
    label: '대기',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
  },
  suspended: {
    label: '중지',
    dotClass: 'bg-rose-500',
    textClass: 'text-rose-600 dark:text-rose-400',
  },
}

interface KakaoChannelDetailCardProps {
  config: KakaoChannelConfig
  onChannelRemoved?: () => void
}

export function KakaoChannelDetailCard({ config, onChannelRemoved }: KakaoChannelDetailCardProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const statusDisplay = config.channelStatus
    ? CHANNEL_STATUS_DISPLAY[config.channelStatus]
    : CHANNEL_STATUS_DISPLAY.pending

  const verifiedLabel = config.verifiedAt
    ? new Date(config.verifiedAt).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-'

  async function handleRemove() {
    setRemoving(true)
    try {
      const result = await removeKakaoChannel()
      if (!result.success) {
        const error = new Error(result.error || '채널 삭제 실패')
        if (isPartialDeletionError(error)) {
          toast({
            title: '부분 삭제 완료',
            description: '로컬 설정은 삭제되었으나 Solapi 원격 채널 삭제에 실패했습니다.',
          })
          router.refresh()
          return
        }
        throw error
      }
      toast({ title: '채널 연동 해제 완료' })
      router.refresh()
      onChannelRemoved?.()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: translateSolapiError(error),
      })
    } finally {
      setRemoving(false)
      setRemoveDialogOpen(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>카카오 알림톡 채널 연동</CardTitle>
          <CardDescription>알림톡 발송에 사용할 카카오 채널을 연동합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-4 sm:flex-nowrap">
            {/* TALK avatar + 채널명/ID */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-300 text-yellow-900">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">연결된 채널</p>
                <p className="truncate text-base font-semibold">
                  {config.channelName || config.searchId || '카카오 알림톡'}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  채널 ID {config.channelId || '-'}
                </p>
              </div>
            </div>

            {/* 상태 */}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">연동 상태</p>
              <p
                className={cn(
                  'mt-1 flex items-center gap-1.5 text-sm font-medium',
                  statusDisplay.textClass,
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', statusDisplay.dotClass)} />
                {statusDisplay.label}
              </p>
            </div>

            {/* 연동 일시 */}
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">연동 일시</p>
              <p className="mt-1 truncate text-sm text-foreground">{verifiedLabel}</p>
            </div>

            {/* 액션 버튼 */}
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                설정 변경
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setRemoveDialogOpen(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                연동 해제
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <KakaoChannelSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
      />

      <ConfirmationDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="카카오 채널 연동을 해제하시겠습니까?"
        description="등록된 모든 알림톡 템플릿도 함께 삭제됩니다. 되돌릴 수 없습니다."
        confirmText="연동 해제"
        variant="destructive"
        isLoading={removing}
        onConfirm={handleRemove}
      />
    </>
  )
}
