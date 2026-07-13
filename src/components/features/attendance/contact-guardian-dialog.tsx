'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Button } from '@ui/button'
import { Textarea } from '@ui/textarea'
import { Badge } from '@ui/badge'
import { Checkbox } from '@ui/checkbox'
import { Alert, AlertDescription, AlertTitle } from '@ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Phone,
  User,
  Copy,
  Check,
  Send,
  MessageSquare,
  AlertTriangle,
  Settings,
} from 'lucide-react'
import { getErrorMessage } from '@/lib/error-handlers'
import { useKakaoMessaging } from '@/hooks/use-kakao-messaging'
import {
  getGuardiansForContact,
  logGuardianContact,
  sendGuardianSMS,
  sendGuardianAlimtalk,
} from '@/app/actions/guardians'
import { type MessagingCapability } from '@/app/actions/messaging/config'
import { useMessagingCapabilityQuery } from '@/hooks/queries/use-messaging-query'
import { queryKeys } from '@/lib/query-keys'
import {
  extractKakaoVariableNames,
  renderKakaoTemplatePreview,
} from '@/lib/kakao/kakao-variables'

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

type TabKey = 'sms' | 'alimtalk' | 'phone'

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

function describeSmsUnavailable(reason: MessagingCapability['smsUnavailableReason']): string {
  switch (reason) {
    case 'no_config':
      return '메시징 서비스가 아직 설정되지 않았습니다.'
    case 'not_active':
      return '메시징 서비스가 비활성화되어 있습니다.'
    case 'not_verified':
      return '메시징 서비스 인증이 완료되지 않았습니다. 설정 페이지에서 테스트 메시지를 발송해 인증을 완료해주세요.'
    case 'missing_credentials':
      return '메시징 서비스 인증 정보가 누락되어 있습니다. 설정 페이지에서 API 키와 발신번호를 확인해주세요.'
    default:
      return '문자 발송이 불가능합니다.'
  }
}

function describeAlimtalkUnavailable(reason: MessagingCapability['alimtalkUnavailableReason']): string {
  switch (reason) {
    case 'no_config':
      return '메시징 서비스가 아직 설정되지 않았습니다.'
    case 'not_active':
      return '메시징 서비스가 비활성화되어 있습니다.'
    case 'provider_not_solapi':
      return '카카오 알림톡은 Solapi 연동 시에만 사용할 수 있습니다. 설정 페이지에서 Solapi로 전환해주세요.'
    case 'provider_not_verified':
      return 'Solapi 인증이 완료되지 않았습니다.'
    case 'channel_not_registered':
      return '카카오 채널이 연동되지 않았습니다. 설정 페이지에서 카카오 채널을 연동해주세요.'
    default:
      return '알림톡 발송이 불가능합니다.'
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
  const [activeTab, setActiveTab] = useState<TabKey>('sms')
  const [selectedGuardianIds, setSelectedGuardianIds] = useState<string[]>([])
  const [selectionSeeded, setSelectionSeeded] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null)
  const { toast } = useToast()

  const {
    hasKakaoChannel,
    isChannelChecked,
    templates: kakaoTemplates,
    checkChannel,
    loadTemplates,
  } = useKakaoMessaging({ approvedOnly: true })

  const guardiansQuery = useQuery({
    queryKey: queryKeys.guardians.forContact(studentId),
    queryFn: async (): Promise<Guardian[]> => getGuardiansForContact(studentId),
    enabled: open && !!studentId,
  })
  const guardians = useMemo(() => guardiansQuery.data ?? [], [guardiansQuery.data])

  const capabilityQuery = useMessagingCapabilityQuery(open)
  const capability: MessagingCapability | null = capabilityQuery.data ?? null
  const loading = open && (guardiansQuery.isPending || capabilityQuery.isPending)

  useEffect(() => {
    if (!open) {
      setSelectedGuardianIds([])
      setSelectionSeeded(false)
      return
    }
    setMessage(getDefaultMessage(studentName, attendanceContext))
    setSelectedTemplateId('')
    setActiveTab('sms')
    // 다른 학생으로 다시 열리는 경우에도 선택을 재시드
    setSelectedGuardianIds([])
    setSelectionSeeded(false)
    if (!isChannelChecked) {
      checkChannel().then((hasChannel) => {
        if (hasChannel) loadTemplates()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId])

  // 전화번호 보유 보호자를 기본 선택 — 오픈당 1회만 시드해 재조회가 선택을 덮어쓰지 않도록 보호
  useEffect(() => {
    if (open && !selectionSeeded && guardiansQuery.data) {
      setSelectedGuardianIds(
        guardiansQuery.data.filter((g) => g.phone).map((g) => g.id)
      )
      setSelectionSeeded(true)
    }
  }, [open, selectionSeeded, guardiansQuery.data])

  useEffect(() => {
    if (isChannelChecked && hasKakaoChannel && kakaoTemplates.length === 0) {
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChannelChecked, hasKakaoChannel])

  // 알림톡 가용 여부에 따라 탭 강제 전환
  useEffect(() => {
    if (activeTab === 'alimtalk' && capability && !capability.alimtalkAvailable) {
      setActiveTab('sms')
    }
  }, [activeTab, capability])

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone)
      setCopiedPhone(phone)
      setTimeout(() => setCopiedPhone(null), 2000)
    } catch {
      toast({ title: '복사 실패', variant: 'destructive' })
    }
  }

  const toggleGuardian = (guardianId: string) => {
    setSelectedGuardianIds((prev) =>
      prev.includes(guardianId) ? prev.filter((id) => id !== guardianId) : [...prev, guardianId]
    )
  }

  const guardiansWithPhone = useMemo(
    () => guardians.filter((g) => !!g.phone),
    [guardians]
  )

  const selectedPhoneGuardians = useMemo(
    () => guardiansWithPhone.filter((g) => selectedGuardianIds.includes(g.id)),
    [guardiansWithPhone, selectedGuardianIds]
  )

  const allSelected =
    guardiansWithPhone.length > 0 &&
    selectedPhoneGuardians.length === guardiansWithPhone.length

  const toggleAll = () => {
    if (allSelected) {
      setSelectedGuardianIds([])
    } else {
      setSelectedGuardianIds(guardiansWithPhone.map((g) => g.id))
    }
  }

  // ── SMS 일괄 발송 ────────────────────────────────────────────────
  const handleSendSMS = async () => {
    if (selectedPhoneGuardians.length === 0) {
      toast({
        title: '보호자 선택 필요',
        description: '메시지를 보낼 보호자를 한 명 이상 선택해주세요.',
        variant: 'destructive',
      })
      return
    }
    if (!message.trim()) {
      toast({ title: '메시지 입력 필요', variant: 'destructive' })
      return
    }

    setSending(true)
    try {
      const results = await Promise.all(
        selectedPhoneGuardians.map((g) =>
          sendGuardianSMS({
            studentId,
            guardianId: g.id,
            sessionId,
            phone: g.phone!,
            message,
          })
        )
      )
      const successCount = results.filter((r) => r.success).length
      const failures = results
        .map((r, i) => ({ r, g: selectedPhoneGuardians[i] }))
        .filter(({ r }) => !r.success)

      if (failures.length === 0) {
        toast({
          title: '문자 발송 완료',
          description: `${successCount}명에게 문자를 보냈습니다.`,
        })
        onContactLogged?.()
        onOpenChange(false)
      } else {
        toast({
          title: failures.length === results.length ? '문자 발송 실패' : '일부 발송 실패',
          description: `성공 ${successCount}명 · 실패 ${failures.length}명 (${failures[0].r.error || '오류'})`,
          variant: 'destructive',
        })
        if (successCount > 0) onContactLogged?.()
      }
    } catch (error) {
      toast({
        title: '문자 발송 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  // ── 알림톡 일괄 발송 ─────────────────────────────────────────────
  const handleSendAlimtalk = async () => {
    if (!selectedTemplateId) {
      toast({
        title: '템플릿 선택 필요',
        description: '발송할 알림톡 템플릿을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }
    if (selectedPhoneGuardians.length === 0) {
      toast({
        title: '보호자 선택 필요',
        description: '알림톡을 보낼 보호자를 한 명 이상 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    setSending(true)
    try {
      const results = await Promise.all(
        selectedPhoneGuardians.map((g) =>
          sendGuardianAlimtalk({
            studentId,
            guardianId: g.id,
            sessionId,
            phone: g.phone!,
            templateId: selectedTemplateId,
            variables: {
              학생명: studentName,
              보호자명: g.name,
            },
          })
        )
      )
      const successCount = results.filter((r) => r.success).length
      const failures = results
        .map((r, i) => ({ r, g: selectedPhoneGuardians[i] }))
        .filter(({ r }) => !r.success)

      if (failures.length === 0) {
        toast({
          title: '알림톡 발송 완료',
          description: `${successCount}명에게 카카오 알림톡을 보냈습니다.`,
        })
        onContactLogged?.()
        onOpenChange(false)
      } else {
        toast({
          title: failures.length === results.length ? '알림톡 발송 실패' : '일부 발송 실패',
          description: `성공 ${successCount}명 · 실패 ${failures.length}명 (${failures[0].r.error || '오류'})`,
          variant: 'destructive',
        })
        if (successCount > 0) onContactLogged?.()
      }
    } catch (error) {
      toast({
        title: '알림톡 발송 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  // ── 전화 기록 저장 ──────────────────────────────────────────────
  const logContactMutation = useMutation({
    mutationFn: async (guardian: Guardian) => {
      const result = await logGuardianContact({
        studentId,
        guardianId: guardian.id,
        sessionId: sessionId!,
        notificationType: 'phone',
        message: `${studentName} 학생 관련 전화 연락`,
      })
      if (!result.success || result.error) {
        throw new Error(result.error || '연락 기록 저장에 실패했습니다.')
      }
      return guardian
    },
    onSuccess: (guardian) => {
      toast({
        title: '전화 연락 기록 저장',
        description: `${guardian.name}님에게 전화한 기록이 저장되었습니다.`,
      })
      onContactLogged?.()
    },
    onError: (error: Error) => {
      toast({ title: '기록 저장 실패', description: getErrorMessage(error), variant: 'destructive' })
    },
  })
  const logging = logContactMutation.isPending ? logContactMutation.variables?.id : null

  const handleLogPhoneContact = (guardian: Guardian) => {
    if (!sessionId) {
      toast({
        title: '연락 기록 불가',
        description: '출석 기록이 없어 연락 이력을 저장할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }
    logContactMutation.mutate(guardian)
  }

  // ── 미리보기 (알림톡) ───────────────────────────────────────────
  const selectedTemplate = useMemo(
    () => kakaoTemplates.find((t) => t.id === selectedTemplateId),
    [kakaoTemplates, selectedTemplateId]
  )
  const previewGuardian = selectedPhoneGuardians[0] || guardiansWithPhone[0]
  const alimtalkPreview = useMemo(() => {
    if (!selectedTemplate?.content) return ''
    return renderKakaoTemplatePreview(selectedTemplate.content, {
      학생명: studentName,
      보호자명: previewGuardian?.name || '보호자',
    })
  }, [selectedTemplate, studentName, previewGuardian])

  const templateVariables = useMemo(
    () => (selectedTemplate ? extractKakaoVariableNames(selectedTemplate.content) : []),
    [selectedTemplate]
  )

  const msgCharCount = message.length
  const msgType = msgCharCount > 90 ? 'LMS' : 'SMS'

  const noGuardians = !loading && guardians.length === 0
  const noPhoneGuardians = !loading && guardians.length > 0 && guardiansWithPhone.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            보호자 연락
            <Badge variant="outline" className="font-normal">
              {studentName}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            보호자를 선택하고 문자 또는 카카오 알림톡을 보낼 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : noGuardians ? (
          <div className="text-center py-10">
            <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">등록된 보호자가 없습니다.</p>
            <p className="text-xs text-muted-foreground mt-1">
              학생 정보 페이지에서 보호자를 추가해주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── 보호자 선택 ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">받는 사람</label>
                {guardiansWithPhone.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs text-primary hover:underline"
                  >
                    {allSelected ? '전체 해제' : '전체 선택'}
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {guardians.map((guardian) => {
                  const checked = selectedGuardianIds.includes(guardian.id)
                  const hasPhone = !!guardian.phone
                  return (
                    <div
                      key={guardian.id}
                      className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
                        hasPhone ? '' : 'opacity-60 bg-muted/30'
                      }`}
                    >
                      <Checkbox
                        id={`g-${guardian.id}`}
                        checked={checked}
                        disabled={!hasPhone || sending}
                        onCheckedChange={() => toggleGuardian(guardian.id)}
                      />
                      <label
                        htmlFor={`g-${guardian.id}`}
                        className="flex-1 flex items-center gap-2 cursor-pointer min-w-0"
                      >
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{guardian.name}</span>
                        {guardian.relationship && (
                          <Badge variant="outline" className="text-xs py-0 h-5 shrink-0">
                            {guardian.relationship}
                          </Badge>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground truncate">
                          {guardian.phone || (
                            <span className="italic">연락처 없음</span>
                          )}
                        </span>
                      </label>
                      {guardian.phone && (
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(guardian.phone!)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                          title="전화번호 복사"
                        >
                          {copiedPhone === guardian.phone ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              {noPhoneGuardians && (
                <Alert variant="default" className="bg-muted/40">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    등록된 보호자에게 전화번호가 없어 문자/알림톡을 보낼 수 없습니다.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* ── 탭 ── */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="sms" disabled={noPhoneGuardians}>
                  문자
                </TabsTrigger>
                <TabsTrigger
                  value="alimtalk"
                  disabled={noPhoneGuardians || !capability?.alimtalkAvailable}
                  title={
                    capability && !capability.alimtalkAvailable
                      ? describeAlimtalkUnavailable(capability.alimtalkUnavailableReason)
                      : undefined
                  }
                >
                  카카오 알림톡
                </TabsTrigger>
                <TabsTrigger value="phone">전화 기록</TabsTrigger>
              </TabsList>

              {/* ── 문자 탭 ── */}
              <TabsContent value="sms" className="space-y-3 mt-3">
                {capability && !capability.smsAvailable && (
                  <Alert variant="default" className="border-warning/40 bg-warning/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-sm">문자 발송 불가</AlertTitle>
                    <AlertDescription className="text-xs space-y-2">
                      <p>{describeSmsUnavailable(capability.smsUnavailableReason)}</p>
                      <Link
                        href="/settings/messaging-integration"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Settings className="h-3 w-3" />
                        메시징 설정 페이지로 이동
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">메시지 내용</label>
                  <Textarea
                    placeholder="보낼 메시지를 입력하세요..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[120px] text-sm resize-none"
                    disabled={sending}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {msgCharCount}자 ({msgType})
                  </p>
                </div>
              </TabsContent>

              {/* ── 알림톡 탭 ── */}
              <TabsContent value="alimtalk" className="space-y-3 mt-3">
                {capability && !capability.alimtalkAvailable ? (
                  <Alert variant="default" className="border-warning/40 bg-warning/5">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-sm">알림톡 발송 불가</AlertTitle>
                    <AlertDescription className="text-xs space-y-2">
                      <p>{describeAlimtalkUnavailable(capability.alimtalkUnavailableReason)}</p>
                      <Link
                        href="/settings/messaging-integration"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Settings className="h-3 w-3" />
                        메시징 설정 페이지로 이동
                      </Link>
                    </AlertDescription>
                  </Alert>
                ) : kakaoTemplates.length === 0 ? (
                  <Alert variant="default" className="bg-muted/40">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      승인된 알림톡 템플릿이 없습니다.{' '}
                      <Link
                        href="/settings/kakao-templates"
                        className="text-primary hover:underline"
                      >
                        템플릿 관리
                      </Link>
                      에서 등록해주세요.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">템플릿 선택</label>
                      <Select
                        value={selectedTemplateId}
                        onValueChange={setSelectedTemplateId}
                        disabled={sending}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="승인된 템플릿을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {kakaoTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-sm">
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {templateVariables.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          템플릿 변수: {templateVariables.join(', ')}
                        </p>
                      )}
                    </div>

                    {alimtalkPreview && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          미리보기 ({previewGuardian?.name || '보호자'} 기준)
                        </label>
                        <div className="rounded-md border bg-[#FEF6CB]/50 p-3 text-sm whitespace-pre-wrap text-foreground">
                          {alimtalkPreview}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* ── 전화 기록 탭 ── */}
              <TabsContent value="phone" className="space-y-2 mt-3">
                <p className="text-xs text-muted-foreground">
                  전화로 연락한 후 기록을 남깁니다. 보호자를 클릭하면 전화 다이얼러가 열립니다.
                </p>
                {guardiansWithPhone.length === 0 ? (
                  <Alert variant="default" className="bg-muted/40">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      전화번호가 등록된 보호자가 없습니다.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-1.5">
                    {guardiansWithPhone.map((guardian) => (
                      <div
                        key={guardian.id}
                        className="flex items-center gap-2 rounded-md border px-3 py-2"
                      >
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <a
                            href={`tel:${guardian.phone}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {guardian.name} · {guardian.phone}
                          </a>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLogPhoneContact(guardian)}
                          disabled={logging === guardian.id || !sessionId}
                          className="gap-1.5 text-xs"
                        >
                          {logging === guardian.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Phone className="h-3.5 w-3.5" />
                          )}
                          기록 저장
                        </Button>
                      </div>
                    ))}
                    {!sessionId && (
                      <p className="text-xs text-muted-foreground italic">
                        출석 기록이 준비되는 중입니다. 잠시 후 다시 시도해주세요.
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {!loading && !noGuardians && (
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              닫기
            </Button>
            {activeTab === 'sms' && (
              <Button
                size="sm"
                onClick={handleSendSMS}
                disabled={
                  sending ||
                  !message.trim() ||
                  selectedPhoneGuardians.length === 0 ||
                  !capability?.smsAvailable
                }
                className="gap-1.5"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                선택 보호자에 문자 전송 ({selectedPhoneGuardians.length})
              </Button>
            )}
            {activeTab === 'alimtalk' && (
              <Button
                size="sm"
                onClick={handleSendAlimtalk}
                disabled={
                  sending ||
                  !selectedTemplateId ||
                  selectedPhoneGuardians.length === 0 ||
                  !capability?.alimtalkAvailable
                }
                className="gap-1.5 bg-[#FAE100] text-[#3A1D1D] hover:bg-[#F0D800] border-0"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}
                선택 보호자에 알림톡 전송 ({selectedPhoneGuardians.length})
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
