import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { ProvisioningStatus } from '@/app/actions/messaging/event-subscriptions'

export interface EventDisplay {
  name: string
  description: string
  icon: string
}

/**
 * 이벤트 타입별 표시명·설명·이모지. shared_alimtalk_templates 에 동일 이름·설명이
 * 시드되어 있어 fallback 으로 사용 가능하지만, 운영팀이 통제하는 표시 라벨이라
 * 이쪽이 우선이다.
 */
export const EVENT_DISPLAY: Record<string, EventDisplay> = {
  check_in: { name: '등원 알림', description: '키오스크 체크인 시 알림 발송', icon: '🏫' },
  check_out: { name: '하원 알림', description: '키오스크 체크아웃 시 알림 발송', icon: '👋' },
  attendance_confirmed: { name: '출석 알림', description: '출석 처리 완료 시 알림 발송', icon: '✅' },
  absence_detected: { name: '결석 알림', description: '결석 또는 지각이 발생했을 때 알림', icon: '⚠️' },
  homework_assigned: { name: '숙제 등록 안내', description: '새 숙제가 배정되었을 때 알림', icon: '📝' },
  homework_deadline: { name: '숙제 마감 안내', description: '마감일 전날 리마인더 발송', icon: '⏰' },
  monthly_report_ready: { name: '월말 리포트 안내', description: '월간 학습 리포트 준비 완료 시 알림', icon: '📊' },
  weekly_report_ready: { name: '주간 리포트 안내', description: '주간 리포트 준비 완료 시 알림', icon: '📈' },
  consultation_scheduled: { name: '상담 일정 안내', description: '상담 일정 확정 시 알림', icon: '💬' },
  consultation_summary: { name: '상담 결과 안내', description: '상담 완료 후 요약을 전달', icon: '🗒️' },
  payment_confirmed: { name: '결제 완료 안내', description: '수강료 결제 완료 시 알림', icon: '💰' },
  payment_overdue: { name: '미납 안내', description: '수강료 미납 시 알림', icon: '💸' },
  exam_scheduled: { name: '시험 일정 안내', description: '시험 일정 등록 시 알림', icon: '📅' },
  exam_grade_ready: { name: '시험 성적 등록', description: '시험 성적이 등록되었을 때 알림', icon: '🎯' },
  retest_required: { name: '재시험 안내', description: '재시험 대상 등록 시 알림', icon: '🔁' },
  makeup_class_scheduled: { name: '보강 안내', description: '보강 일정이 잡혔을 때 알림', icon: '🧑‍🏫' },
  class_schedule_changed: { name: '수업 일정 변경', description: '수업 일정이 변경되었을 때 알림', icon: '📆' },
  academy_closure_notice: { name: '공지사항', description: '학원 휴원·중요 공지사항 발송', icon: 'ℹ️' },
  enrollment_welcome: { name: '입학 환영 안내', description: '학생 등록 완료 시 알림', icon: '🎉' },
  enrollment_terminated: { name: '퇴원 안내', description: '학생 퇴원 처리 시 알림', icon: '👋' },
  book_lending_reminder: { name: '도서 반납 안내', description: '대여 도서 반납 예정일 전날 알림', icon: '📚' },
}

export function resolveEventDisplay(
  eventType: string,
  fallback: { name: string; description: string | null },
): EventDisplay {
  return (
    EVENT_DISPLAY[eventType] || {
      name: fallback.name,
      description: fallback.description || '',
      icon: '📨',
    }
  )
}

export interface StatusConfig {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: LucideIcon
}

export const PROVISIONING_STATUS_CONFIG: Record<ProvisioningStatus, StatusConfig> = {
  not_started: { label: '미등록', variant: 'outline', icon: Circle },
  provisioning: { label: '등록중', variant: 'secondary', icon: Clock },
  inspecting: { label: '검수중', variant: 'secondary', icon: Clock },
  approved: { label: '승인됨', variant: 'default', icon: CheckCircle2 },
  rejected: { label: '반려', variant: 'destructive', icon: XCircle },
  failed: { label: '실패', variant: 'destructive', icon: AlertTriangle },
}
