'use client'

import { useState } from 'react'
import { Card, CardContent } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { Switch } from '@ui/switch'
import { Separator } from '@ui/separator'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/tooltip'
import { MessageCircle, Trash2, AlertTriangle, MoreVertical, HelpCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import {
  removeKakaoChannel,
  updateKakaoFallbackSettings,
  type KakaoChannelConfig,
} from '@/app/actions/messaging/kakao-channel'
import { translateSolapiError, isPartialDeletionError } from '@/lib/solapi-error-translator'
import { kakaoChannelStatusConfig } from '@/lib/kakao/kakao-status-config'

interface KakaoChannelStatusProps {
  config: KakaoChannelConfig
  onChannelRemoved?: () => void
}

export function KakaoChannelStatus({ config, onChannelRemoved }: KakaoChannelStatusProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isRemoving, setIsRemoving] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [smsFallback, setSmsFallback] = useState(config.smsFallbackEnabled)
  const [manualFallback, setManualFallback] = useState(config.manualFallbackEnabled)
  const [updatingFallback, setUpdatingFallback] = useState(false)
  const [partialDeletionWarning, setPartialDeletionWarning] = useState(false)

  async function handleRemoveChannel() {
    setIsRemoving(true)
    try {
      const result = await removeKakaoChannel()
      if (!result.success) {
        const error = new Error(result.error || '채널 삭제 실패')
        if (isPartialDeletionError(error)) {
          setPartialDeletionWarning(true)
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
      if (isPartialDeletionError(error)) {
        setPartialDeletionWarning(true)
        toast({ title: '부분 삭제 완료', description: '원격 채널 정리가 필요합니다.' })
        router.refresh()
        return
      }
      toast({
        title: '삭제 실패',
        description: translateSolapiError(error),
        variant: 'destructive',
      })
    } finally {
      setIsRemoving(false)
      setRemoveDialogOpen(false)
    }
  }

  async function handleFallbackChange(type: 'sms' | 'manual', checked: boolean) {
    const newSmsFallback = type === 'sms' ? checked : smsFallback
    const newManualFallback = type === 'manual' ? checked : manualFallback
    if (type === 'sms') setSmsFallback(checked)
    else setManualFallback(checked)
    setUpdatingFallback(true)
    try {
      const result = await updateKakaoFallbackSettings({
        smsFallbackEnabled: newSmsFallback,
        manualFallbackEnabled: newManualFallback,
      })
      if (!result.success) {
        if (type === 'sms') setSmsFallback(!checked)
        else setManualFallback(!checked)
        throw new Error(result.error || '설정 저장 실패')
      }
      toast({ title: '설정 저장됨' })
    } catch (error) {
      toast({
        title: '저장 실패',
        description: translateSolapiError(error),
        variant: 'destructive',
      })
    } finally {
      setUpdatingFallback(false)
    }
  }

  const status = config.channelStatus
    ? kakaoChannelStatusConfig[config.channelStatus]
    : kakaoChannelStatusConfig.pending
  const StatusIcon = status.icon

  return (
    <TooltipProvider delayDuration={150}>
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* 헤더: 아이콘 + 채널명 + 상태 + 메뉴 */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {config.channelName || config.searchId || '카카오 알림톡'}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {config.searchId || '카카오 비즈니스 채널'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {partialDeletionWarning && (
                <Badge variant="warning" className="gap-1 text-[10px] h-5">
                  <AlertTriangle className="h-3 w-3" />
                  정리 필요
                </Badge>
              )}
              <Badge variant={status.variant} className="gap-1 text-[10px] h-5">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setRemoveDialogOpen(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    채널 연동 해제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Separator />

          {/* SMS 대체 발송 — 핵심 설정만 */}
          <div className="space-y-2">
            <FallbackRow
              label="자동 SMS 대체"
              hint="알림톡 발송 실패 시 자동으로 SMS 로 전환합니다."
              checked={smsFallback}
              onCheckedChange={(c) => handleFallbackChange('sms', c)}
              disabled={updatingFallback}
            />
            <FallbackRow
              label="수동 SMS 옵션"
              hint="발송 시 SMS 로 직접 전환하는 옵션을 노출합니다."
              checked={manualFallback}
              onCheckedChange={(c) => handleFallbackChange('manual', c)}
              disabled={updatingFallback}
            />
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="카카오 채널 연동을 해제하시겠습니까?"
        description="등록된 모든 알림톡 템플릿도 함께 삭제됩니다. 되돌릴 수 없습니다."
        confirmText="연동 해제"
        variant="destructive"
        isLoading={isRemoving}
        onConfirm={handleRemoveChannel}
      />
    </TooltipProvider>
  )
}

function FallbackRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (c: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[240px] text-xs">
            {hint}
          </TooltipContent>
        </Tooltip>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
