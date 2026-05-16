'use client'

/**
 * 수동 알림톡 발송 메뉴 (학생 단위).
 *
 * 학생 상세 헤더, 도메인 카드 등 어디서든 사용 가능한 드롭다운 메뉴.
 * 학원이 이벤트 알림 탭에서 ON 으로 켠 이벤트만 실제 발송됨 (자율성 보장).
 * 학원장이 명시적으로 클릭하므로 결과를 toast 로 즉시 피드백.
 */

import { useState } from 'react'
import { Button } from '@ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ui/dropdown-menu'
import { Send, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { sendEventAlimtalkAction } from '@/app/actions/messaging/send-event-alimtalk'

interface EventOption {
  eventType: string
  label: string
  /** 템플릿이 요구하는 변수 (학원명/학생명/보호자명/학원연락처 외 추가) */
  variables?: Record<string, string>
}

// 학생 컨텍스트만으로 의미가 명확한 이벤트만 노출.
// (시험명·상담일 등 추가 변수가 필요한 이벤트는 해당 도메인 카드에 별도 SendAlimtalkButton 으로 배치)
const STUDENT_LEVEL_EVENTS: EventOption[] = [
  { eventType: 'attendance_confirmed', label: '출석 확인 알림' },
  { eventType: 'absence_detected', label: '결석 알림' },
  { eventType: 'check_in', label: '등원 알림' },
  { eventType: 'check_out', label: '하원 알림' },
  { eventType: 'enrollment_welcome', label: '입학 환영 안내' },
  { eventType: 'enrollment_terminated', label: '퇴원 안내' },
]

interface SendAlimtalkMenuProps {
  studentId: string
  /** 메뉴에 추가로 노출할 이벤트 (도메인 컨텍스트가 있을 때) */
  extraEvents?: EventOption[]
  /** 트리거 버튼 variant — 기본 outline */
  buttonVariant?: 'default' | 'outline' | 'ghost'
  /** 트리거 버튼 라벨 — 기본 "알림 보내기" */
  buttonLabel?: string
}

export function SendAlimtalkMenu({
  studentId,
  extraEvents = [],
  buttonVariant = 'outline',
  buttonLabel = '알림 보내기',
}: SendAlimtalkMenuProps) {
  const { toast } = useToast()
  const [pendingEvent, setPendingEvent] = useState<string | null>(null)

  async function handleSend(option: EventOption) {
    setPendingEvent(option.eventType)
    try {
      const result = await sendEventAlimtalkAction(
        studentId,
        option.eventType,
        option.variables,
      )
      if (!result.success) {
        toast({
          title: `${option.label} 발송 실패`,
          description:
            result.error ||
            '알림 서비스 연동 > 이벤트 알림 탭에서 해당 이벤트가 켜져 있는지 확인해주세요.',
          variant: 'destructive',
        })
        return
      }
      toast({
        title: `${option.label} 발송 완료`,
        description:
          result.sent === result.total
            ? `${result.sent}명에게 발송했습니다.`
            : `${result.total}명 중 ${result.sent}명 발송 성공.`,
      })
    } finally {
      setPendingEvent(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={buttonVariant} className="gap-2" disabled={!!pendingEvent}>
          {pendingEvent ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {buttonLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {extraEvents.length > 0 && (
          <>
            <DropdownMenuLabel>현재 화면 컨텍스트</DropdownMenuLabel>
            {extraEvents.map((option) => (
              <DropdownMenuItem
                key={option.eventType}
                onClick={() => handleSend(option)}
                disabled={!!pendingEvent}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel>일반</DropdownMenuLabel>
        {STUDENT_LEVEL_EVENTS.map((option) => (
          <DropdownMenuItem
            key={option.eventType}
            onClick={() => handleSend(option)}
            disabled={!!pendingEvent}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
