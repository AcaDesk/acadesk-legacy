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
import { useToast } from '@/hooks/use-toast'
import { Loader2, Phone, Mail, User, Copy, Check, Send } from 'lucide-react'
import { getErrorMessage } from '@/lib/error-handlers'
import { getGuardiansForContact, logGuardianContact, sendGuardianSMS } from '@/app/actions/guardians'

interface Guardian {
  id: string
  name: string
  relationship: string | null
  email: string | null
  phone: string | null
}

type AttendanceContext = 'absent' | 'self_study' | 'makeup' | 'late' | 'early_leave' | null

interface ContactGuardianDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  studentName: string
  sessionId: string | null
  attendanceContext?: AttendanceContext
  onContactLogged?: () => void
}

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
  const [message, setMessage] = useState(() => getDefaultMessage(studentName, attendanceContext))
  const [sending, setSending] = useState<string | null>(null) // guardianId being sent
  const [logging, setLogging] = useState<string | null>(null) // guardianId being logged
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const { toast } = useToast()

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
    if (open) {
      loadGuardians()
      setMessage(getDefaultMessage(studentName, attendanceContext))
    }
  }, [open, studentId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    setSending(guardian.id)
    try {
      const result = await sendGuardianSMS({
        studentId,
        guardianId: guardian.id,
        sessionId,
        phone: guardian.phone,
        message,
      })

      if (!result.success) {
        throw new Error(result.error || 'SMS 발송에 실패했습니다.')
      }

      toast({ title: 'SMS 발송 완료', description: `${guardian.name}님에게 문자를 보냈습니다.` })
      onContactLogged?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'SMS 발송 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSending(null)
    }
  }

  const handleLogPhoneContact = async (guardian: Guardian) => {
    if (!sessionId) {
      toast({ title: '연락 기록 불가', description: '출석 기록이 없어 연락 이력을 저장할 수 없습니다.', variant: 'destructive' })
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

      if (!result.success || result.error) {
        throw new Error(result.error || '연락 기록 저장에 실패했습니다.')
      }

      toast({ title: '전화 연락 기록 저장', description: `${guardian.name}님에게 전화한 기록이 저장되었습니다.` })
      onContactLogged?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: '기록 저장 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setLogging(null)
    }
  }

  const isBusy = (guardianId: string) =>
    sending === guardianId || logging === guardianId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>보호자 연락</DialogTitle>
          <DialogDescription>
            {studentName} 학생의 보호자에게 연락합니다.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : guardians.length > 0 ? (
          <div className="space-y-4">
            {/* 메시지 작성 영역 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">문자 메시지</label>
              <Textarea
                placeholder="보낼 메시지를 입력하세요..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px] text-sm"
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}자 {message.length > 90 ? '(LMS)' : '(SMS)'}
              </p>
            </div>

            {/* 보호자 목록 */}
            {guardians.map((guardian) => (
              <div key={guardian.id} className="border rounded-lg p-3 space-y-3">
                {/* 보호자 기본 정보 */}
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{guardian.name}</div>
                    {guardian.relationship && (
                      <Badge variant="outline" className="text-xs mt-0.5">
                        {guardian.relationship}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 연락처 정보 */}
                <div className="space-y-1.5">
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
                        onClick={() => handleCopyPhone(guardian.phone!)}
                        className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
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
                      <span>{guardian.email}</span>
                    </div>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  {guardian.phone && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLogPhoneContact(guardian)}
                        disabled={isBusy(guardian.id)}
                        className="gap-1.5 text-xs flex-1"
                      >
                        {logging === guardian.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Phone className="h-3.5 w-3.5" />
                        )}
                        전화 연락 기록
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSendSMS(guardian)}
                        disabled={isBusy(guardian.id) || !message.trim()}
                        className="gap-1.5 text-xs flex-1"
                      >
                        {sending === guardian.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        문자 발송
                      </Button>
                    </>
                  )}
                  {guardian.email && !guardian.phone && (
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
                  )}
                  {!guardian.phone && !guardian.email && (
                    <p className="text-xs text-muted-foreground">등록된 연락처가 없습니다.</p>
                  )}
                </div>
              </div>
            ))}

          </div>
        ) : (
          <div className="text-center py-8">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">등록된 보호자가 없습니다.</p>
            <p className="text-sm text-muted-foreground mt-2">
              학생 정보 페이지에서 보호자를 추가해주세요.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
