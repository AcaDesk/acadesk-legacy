'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Button } from '@ui/button'
import { Textarea } from '@ui/textarea'
import { Badge } from '@ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Phone, Mail, User, Copy, Check, Send, MessageSquare } from 'lucide-react'
import { getErrorMessage } from '@/lib/error-handlers'
import { useKakaoMessaging } from '@/hooks/use-kakao-messaging'
import {
  getGuardiansForContact,
  logGuardianContact,
  sendGuardianSMS,
  sendGuardianAlimtalk,
} from '@/app/actions/guardians'

// ============================================================================
// Types
// ============================================================================

interface Guardian {
  id: string
  name: string
  relationship: string | null
  email: string | null
  phone: string | null
}

export type AttendanceContext = 'absent' | 'self_study' | 'makeup' | 'late' | 'early_leave' | null

interface ContactGuardianDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  studentName: string
  /** null이면 세션이 아직 생성 중 (백그라운드로 업데이트됨) */
  sessionId: string | null
  attendanceContext?: AttendanceContext
  onContactLogged?: () => void
}

// ============================================================================
// Helpers
// ============================================================================

function getDefaultMessage(studentName: string, context: AttendanceContext): string {
  switch (context) {
    case 'absent':
      return `안녕하세요.\n오늘 ${studentName} 학생이 수업에 결석하였습니다.\n확인 부탁드립니다.`
    case 'late':
      return `안녕하세요.\n오늘 ${studentName} 학생이 수업에 지각하였습니다.\n확인 부탁드립니다.`
    case 'early_leave':
      return `안녕하세요.\n오늘 ${studentName} 학생이 수업 도중 조기 퇴원하였습니다.\n확인 부탁드립니다.`
    case 'self_study':
      return `안녕하세요.\n오늘 ${studentName} 학생이 자습실을 이용하고 있습니다.\n참고 부탁드립니다.`
    case 'makeup':
      return `안녕하세요.\n오늘 ${studentName} 학생의 보강 수업이 진행됩니다.\n참고 부탁드립니다.`
    default:
      return `안녕하세요.\n${studentName} 학생 관련하여 연락드립니다.`
  }
}

// ============================================================================
// Component
// ============================================================================

export function ContactGuardianDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  sessionId,
  attendanceContext = null,
  onContactLogged,
}: ContactGuardianDialogProps) {
  const [guardians, setGuardians] = useState<Guardian[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [sending, setSending] = useState<string | null>(null)
  const [logging, setLogging] = useState<string | null>(null)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const { toast } = useToast()

  // 카카오 알림톡 연동 상태
  const {
    hasKakaoChannel,
    isChannelChecked,
    templates: kakaoTemplates,
    checkChannel,
    loadTemplates,
  } = useKakaoMessaging({ approvedOnly: true })

  const loadGuardians = useCallback(async () => {
    try {
      setLoading(true)
      const guardianList = await getGuardiansForContact(studentId)
      setGuardians(guardianList)
    } catch (error) {
      toast({
        title: '데이터 로드 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [studentId, toast])

  useEffect(() => {
    if (!open) return
    setMessage(getDefaultMessage(studentName, attendanceContext))
    setSelectedTemplateId('')
    loadGuardians()
    if (!isChannelChecked) {
      checkChannel().then((hasChannel) => {
        if (hasChannel) loadTemplates()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId])

  // 알림톡 채널 연결 확인 후 템플릿 자동 로드
  useEffect(() => {
    if (isChannelChecked && hasKakaoChannel && kakaoTemplates.length === 0) {
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChannelChecked, hasKakaoChannel])

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      setCopiedPhone(phone)
      setTimeout(() => setCopiedPhone(null), 2000)
    } catch {
      toast({ title: '복사 실패', variant: 'destructive' })
    }
  }

  const handleSendSMS = async (guardian: Guardian) => {
    if (!guardian.phone) return
    setSending(`sms-${guardian.id}`)
    try {
      const result = await sendGuardianSMS({
        studentId,
        guardianId: guardian.id,
        sessionId,
        phone: guardian.phone,
        message,
      })
      if (!result.success) throw new Error(result.error || 'SMS 발송에 실패했습니다.')
      toast({ title: 'SMS 발송 완료', description: `${guardian.name}님에게 문자를 보냈습니다.` })
      onContactLogged?.()
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'SMS 발송 실패', description: getErrorMessage(error), variant: 'destructive' })
    } finally {
      setSending(null)
    }
  }

  const handleSendAlimtalk = async (guardian: Guardian) => {
    if (!guardian.phone || !selectedTemplateId) return
    setSending(`alimtalk-${guardian.id}`)
    try {
      const result = await sendGuardianAlimtalk({
        studentId,
        guardianId: guardian.id,
        sessionId,
        phone: guardian.phone,
        templateId: selectedTemplateId,
        variables: { studentName },
      })
      if (!result.success) throw new Error(result.error || '알림톡 발송에 실패했습니다.')
      toast({ title: '알림톡 발송 완료', description: `${guardian.name}님에게 카카오 알림톡을 보냈습니다.` })
      onContactLogged?.()
      onOpenChange(false)
    } catch (error) {
      toast({ title: '알림톡 발송 실패', description: getErrorMessage(error), variant: 'destructive' })
    } finally {
      setSending(null)
    }
  }

  const handleLogPhoneContact = async (guardian: Guardian) => {
    if (!sessionId) {
      toast({
        title: '연락 기록 불가',
        description: '출석 기록이 없어 연락 이력을 저장할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }
    setLogging(guardian.id)
    try {
      const result = await logGuardianContact({
        studentId,
        guardianId: guardian.id,
        sessionId,
        notificationType: 'phone',
        message: `${studentName} 학생 관련 전화 연락`,
      })
      if (!result.success || result.error) throw new Error(result.error || '연락 기록 저장에 실패했습니다.')
      toast({ title: '전화 연락 기록 저장', description: `${guardian.name}님에게 전화한 기록이 저장되었습니다.` })
      onContactLogged?.()
      onOpenChange(false)
    } catch (error) {
      toast({ title: '기록 저장 실패', description: getErrorMessage(error), variant: 'destructive' })
    } finally {
      setLogging(null)
    }
  }

  const isBusy = (guardianId: string) =>
    !!(sending?.endsWith(guardianId)) || logging === guardianId

  const msgCharCount = message.length
  const msgType = msgCharCount > 90 ? 'LMS' : 'SMS'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>보호자 연락</DialogTitle>
          <DialogDescription>
            {studentName} 학생의 보호자에게 연락합니다.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : guardians.length > 0 ? (
          <div className="space-y-4">
            {/* ── SMS 메시지 작성 ── */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">문자 메시지</label>
              <Textarea
                placeholder="보낼 메시지를 입력하세요..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px] text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {msgCharCount}자 ({msgType})
              </p>
            </div>

            {/* ── 알림톡 템플릿 선택 (연동된 경우만) ── */}
            {hasKakaoChannel && kakaoTemplates.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-[#FAE100]">
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="#3A1D1D">
                      <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.553 1.525 4.81 3.875 6.225L4.5 21l4.688-2.344A11.34 11.34 0 0 0 12 19c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
                    </svg>
                  </span>
                  카카오 알림톡 템플릿
                </label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="템플릿 선택 (선택하지 않으면 문자 발송)" />
                  </SelectTrigger>
                  <SelectContent>
                    {kakaoTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-sm">
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplateId && (
                  <p className="text-xs text-muted-foreground">
                    알림톡 선택 시 위 문자 내용 대신 승인된 템플릿으로 발송됩니다.
                  </p>
                )}
              </div>
            )}

            {/* ── 보호자 목록 ── */}
            {guardians.map((guardian) => (
              <div key={guardian.id} className="border rounded-lg p-3 space-y-3">
                {/* 보호자 기본 정보 */}
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{guardian.name}</div>
                    {guardian.relationship && (
                      <Badge variant="outline" className="text-xs mt-0.5 py-0">
                        {guardian.relationship}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 연락처 */}
                <div className="space-y-1">
                  {guardian.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a
                        href={`tel:${guardian.phone}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {guardian.phone}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(guardian.phone!)}
                        className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-0.5"
                        title="전화번호 복사"
                      >
                        {copiedPhone === guardian.phone ? (
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                  {guardian.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{guardian.email}</span>
                    </div>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="flex flex-wrap gap-2">
                  {guardian.phone ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLogPhoneContact(guardian)}
                        disabled={isBusy(guardian.id)}
                        className="gap-1.5 text-xs"
                      >
                        {logging === guardian.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Phone className="h-3.5 w-3.5" />
                        )}
                        전화 기록
                      </Button>

                      {/* 알림톡 미선택 시 문자 발송 */}
                      {!selectedTemplateId && (
                        <Button
                          size="sm"
                          onClick={() => handleSendSMS(guardian)}
                          disabled={isBusy(guardian.id) || !message.trim()}
                          className="gap-1.5 text-xs"
                        >
                          {sending === `sms-${guardian.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                          문자 발송
                        </Button>
                      )}

                      {/* 알림톡 선택 시 알림톡 발송 */}
                      {hasKakaoChannel && selectedTemplateId && (
                        <Button
                          size="sm"
                          onClick={() => handleSendAlimtalk(guardian)}
                          disabled={isBusy(guardian.id)}
                          className="gap-1.5 text-xs bg-[#FAE100] text-[#3A1D1D] hover:bg-[#F0D800] border-0"
                        >
                          {sending === `alimtalk-${guardian.id}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <MessageSquare className="h-3.5 w-3.5" />
                          )}
                          알림톡 발송
                        </Button>
                      )}
                    </>
                  ) : guardian.email ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLogPhoneContact(guardian)}
                      disabled={isBusy(guardian.id)}
                      className="gap-1.5 text-xs"
                    >
                      {logging === guardian.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Mail className="h-3.5 w-3.5" />
                      )}
                      이메일 연락 기록
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">등록된 연락처가 없습니다.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">등록된 보호자가 없습니다.</p>
            <p className="text-xs text-muted-foreground mt-1">
              학생 정보 페이지에서 보호자를 추가해주세요.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
