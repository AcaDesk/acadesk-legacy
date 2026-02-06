'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { Switch } from '@ui/switch'
import { ConfirmationDialog } from '@ui/confirmation-dialog'
import { MessageCircle, Trash2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import {
  removeKakaoChannel,
  updateKakaoFallbackSettings,
  type KakaoChannelConfig,
} from '@/app/actions/kakao-channel'
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
        // 부분 삭제인 경우 (로컬은 삭제됐지만 원격 삭제 실패)
        if (isPartialDeletionError(error)) {
          setPartialDeletionWarning(true)
          toast({
            title: '부분 삭제 완료',
            description: '로컬 설정은 삭제되었으나 Solapi 원격 채널 삭제에 실패했습니다. Solapi 대시보드에서 직접 확인해주세요.',
          })
          router.refresh()
          return
        }
        throw error
      }

      toast({
        title: '채널 연동 해제 완료',
        description: '카카오 채널 연동이 해제되었습니다.',
      })

      router.refresh()
      onChannelRemoved?.()
    } catch (error) {
      // 부분 삭제 에러 체크
      if (isPartialDeletionError(error)) {
        setPartialDeletionWarning(true)
        toast({
          title: '부분 삭제 완료',
          description: '로컬 설정은 삭제되었으나 원격 채널 정리가 필요합니다.',
        })
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

    // Optimistic update
    if (type === 'sms') setSmsFallback(checked)
    else setManualFallback(checked)

    setUpdatingFallback(true)
    try {
      const result = await updateKakaoFallbackSettings({
        smsFallbackEnabled: newSmsFallback,
        manualFallbackEnabled: newManualFallback,
      })

      if (!result.success) {
        // Revert on error
        if (type === 'sms') setSmsFallback(!checked)
        else setManualFallback(!checked)
        throw new Error(result.error || '설정 저장 실패')
      }

      toast({
        title: '설정 저장',
        description: 'SMS 대체 발송 설정이 저장되었습니다.',
      })
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">카카오 알림톡</CardTitle>
                <CardDescription>카카오 비즈니스 채널 연동 상태</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {partialDeletionWarning && (
                <Badge variant="warning" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  원격 정리 필요
                </Badge>
              )}
              <Badge variant={status.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Channel Info */}
          <div className="rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">채널 검색 ID</p>
                <p className="font-medium">{config.searchId || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">채널 이름</p>
                <p className="font-medium">{config.channelName || config.searchId || '-'}</p>
              </div>
              {config.verifiedAt && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">연동 일시</p>
                  <p className="font-medium">
                    {new Date(config.verifiedAt).toLocaleString('ko-KR')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SMS Fallback Settings */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">SMS 대체 발송 설정</h4>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">자동 SMS 대체 발송</p>
                <p className="text-xs text-muted-foreground">
                  알림톡 발송 실패 시 자동으로 SMS로 전환
                </p>
              </div>
              <Switch
                checked={smsFallback}
                onCheckedChange={(checked) => handleFallbackChange('sms', checked)}
                disabled={updatingFallback}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">수동 SMS 발송 옵션</p>
                <p className="text-xs text-muted-foreground">
                  발송 시 SMS로 직접 전환하는 옵션 표시
                </p>
              </div>
              <Switch
                checked={manualFallback}
                onCheckedChange={(checked) => handleFallbackChange('manual', checked)}
                disabled={updatingFallback}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRemoveDialogOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              채널 연동 해제
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={removeDialogOpen}
        onOpenChange={setRemoveDialogOpen}
        title="카카오 채널 연동을 해제하시겠습니까?"
        description="연동 해제 시 등록된 모든 알림톡 템플릿도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmText="연동 해제"
        variant="destructive"
        isLoading={isRemoving}
        onConfirm={handleRemoveChannel}
      />
    </>
  )
}
