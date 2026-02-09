'use client'

import { Alert, AlertDescription } from '@ui/alert'
import { CheckCircle2, Circle, AlertCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KakaoPrerequisitesChecklistProps {
  isSolapiSelected: boolean
  isSolapiVerified: boolean
}

interface ChecklistItemProps {
  checked: boolean
  label: string
  description?: string
}

function ChecklistItem({ checked, label, description }: ChecklistItemProps) {
  return (
    <div className="flex items-start gap-2">
      {checked ? (
        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">
        <p
          className={cn(
            'text-sm',
            checked ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {label}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

export function KakaoPrerequisitesChecklist({
  isSolapiSelected,
  isSolapiVerified,
}: KakaoPrerequisitesChecklistProps) {
  const allPrerequisitesMet = isSolapiSelected && isSolapiVerified

  return (
    <Alert
      className={cn(
        allPrerequisitesMet
          ? 'border-success/20 bg-success/5'
          : 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20'
      )}
    >
      <AlertCircle
        className={cn(
          'h-4 w-4',
          allPrerequisitesMet ? 'text-success' : 'text-amber-600'
        )}
      />
      <AlertDescription className="text-xs">
        <p className="font-medium mb-2">카카오 알림톡 사용을 위한 준비 사항</p>
        <div className="space-y-1.5">
          <ChecklistItem
            checked={isSolapiSelected}
            label="솔라피(Solapi) 서비스 선택"
            description="알림톡은 솔라피만 지원합니다"
          />
          <ChecklistItem
            checked={isSolapiVerified}
            label="API 인증 완료 (테스트 메시지 발송)"
            description="API 설정 후 테스트 메시지를 발송해주세요"
          />
          <ChecklistItem
            checked={false}
            label="채널 관리자 번호 준비"
            description="카카오 비즈니스 채널의 관리자로 등록된 번호"
          />
          <ChecklistItem
            checked={false}
            label="카카오 채널 검색 ID 준비 (@xxx)"
            description="카카오톡 채널 관리자 센터에서 확인 가능"
          />
        </div>
        {!allPrerequisitesMet && (
          <p className="mt-2 text-amber-700 dark:text-amber-400">
            API 설정 탭에서 솔라피를 선택하고 인증을 완료해주세요.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="https://center-pf.kakao.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] hover:bg-background/60"
          >
            카카오 채널 관리자센터
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://docs.solapi.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] hover:bg-background/60"
          >
            Solapi 문서
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://docs.solapi.com/references/kakao"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] hover:bg-background/60"
          >
            Solapi 카카오 가이드
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </AlertDescription>
    </Alert>
  )
}
