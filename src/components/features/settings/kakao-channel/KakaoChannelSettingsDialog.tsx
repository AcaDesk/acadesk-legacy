'use client'

import { useEffect, useState } from 'react'
import { Button } from '@ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Switch } from '@ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  updateKakaoFallbackSettings,
  type KakaoChannelConfig,
} from '@/app/actions/messaging/kakao-channel'
import { translateSolapiError } from '@/lib/solapi-error-translator'

interface KakaoChannelSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: Pick<KakaoChannelConfig, 'smsFallbackEnabled' | 'manualFallbackEnabled'>
}

export function KakaoChannelSettingsDialog({
  open,
  onOpenChange,
  config,
}: KakaoChannelSettingsDialogProps) {
  const { toast } = useToast()
  const [smsFallback, setSmsFallback] = useState(config.smsFallbackEnabled)
  const [manualFallback, setManualFallback] = useState(config.manualFallbackEnabled)
  const [saving, setSaving] = useState(false)

  // 다이얼로그가 열릴 때마다 외부 상태에서 동기화 (다른 곳에서 변경된 값 반영)
  useEffect(() => {
    if (open) {
      setSmsFallback(config.smsFallbackEnabled)
      setManualFallback(config.manualFallbackEnabled)
    }
  }, [open, config.smsFallbackEnabled, config.manualFallbackEnabled])

  async function handleSave() {
    setSaving(true)
    try {
      const result = await updateKakaoFallbackSettings({
        smsFallbackEnabled: smsFallback,
        manualFallbackEnabled: manualFallback,
      })
      if (!result.success) {
        throw new Error(result.error || '설정 저장에 실패했습니다.')
      }
      toast({ title: '설정 저장됨' })
      onOpenChange(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '저장 실패',
        description: translateSolapiError(error),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>채널 설정 변경</DialogTitle>
            <DialogDescription>
              알림톡 발송 실패 시 SMS 대체 발송 정책을 조정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <SettingRow
              label="자동 SMS 대체"
              hint="알림톡 발송 실패 시 자동으로 SMS 로 전환합니다."
              checked={smsFallback}
              onCheckedChange={setSmsFallback}
              disabled={saving}
            />
            <SettingRow
              label="수동 SMS 옵션"
              hint="발송 시 SMS 로 직접 전환하는 옵션을 노출합니다."
              checked={manualFallback}
              onCheckedChange={setManualFallback}
              disabled={saving}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

function SettingRow({
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
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="text-sm">{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 shrink-0 cursor-help text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] text-xs">
            {hint}
          </TooltipContent>
        </Tooltip>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
