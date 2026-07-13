'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  Send,
  MessageSquare,
  AlertTriangle,
  Settings,
  Users,
} from 'lucide-react'
import { getErrorMessage } from '@/lib/error-handlers'
import { useKakaoMessaging } from '@/hooks/use-kakao-messaging'
import {
  getGuardiansForStudents,
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

export interface AbsentStudentInput {
  studentId: string
  studentName: string
  sessionId: string | null
}

interface GuardianRow {
  id: string
  name: string
  relationship: string | null
  phone: string | null
}

interface StudentWithGuardians {
  studentId: string
  studentName: string
  sessionId: string | null
  guardians: GuardianRow[]
}

interface BulkAbsentContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  absentStudents: AbsentStudentInput[]
  onSent?: () => void
}

type TabKey = 'sms' | 'alimtalk'

const DEFAULT_MESSAGE =
  '안녕하세요.\n오늘 {학생명} 학생이 수업에 결석하였습니다.\n확인 부탁드립니다.'

function describeSmsUnavailable(reason: MessagingCapability['smsUnavailableReason']): string {
  switch (reason) {
    case 'no_config':
      return '메시징 서비스가 아직 설정되지 않았습니다.'
    case 'not_active':
      return '메시징 서비스가 비활성화되어 있습니다.'
    case 'not_verified':
      return '메시징 서비스 인증이 완료되지 않았습니다.'
    case 'missing_credentials':
      return 'API 키 또는 발신번호가 누락되어 있습니다.'
    default:
      return '문자 발송이 불가능합니다.'
  }
}

function describeAlimtalkUnavailable(reason: MessagingCapability['alimtalkUnavailableReason']): string {
  switch (reason) {
    case 'no_config':
    case 'not_active':
      return '메시징 서비스가 설정/활성화되지 않았습니다.'
    case 'provider_not_solapi':
      return '카카오 알림톡은 Solapi 연동 시에만 사용할 수 있습니다.'
    case 'provider_not_verified':
      return 'Solapi 인증이 완료되지 않았습니다.'
    case 'channel_not_registered':
      return '카카오 채널이 연동되지 않았습니다.'
    default:
      return '알림톡 발송이 불가능합니다.'
  }
}

// ============================================================================
// Component
// ============================================================================

export function BulkAbsentContactDialog({
  open,
  onOpenChange,
  absentStudents,
  onSent,
}: BulkAbsentContactDialogProps) {
  const { toast } = useToast()
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [selectionSeeded, setSelectionSeeded] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('sms')
  const [message, setMessage] = useState(DEFAULT_MESSAGE)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [sending, setSending] = useState(false)

  const {
    isChannelChecked,
    hasKakaoChannel,
    templates: kakaoTemplates,
    checkChannel,
    loadTemplates,
  } = useKakaoMessaging({ approvedOnly: true })

  // ── 초기 로드 ────────────────────────────────────────────────
  const studentIds = useMemo(() => absentStudents.map((s) => s.studentId), [absentStudents])

  const guardiansQuery = useQuery({
    queryKey: queryKeys.guardians.forStudents(studentIds),
    queryFn: async () => {
      const result = await getGuardiansForStudents(studentIds)
      if (!result.success || !result.data) {
        throw new Error(result.error || '보호자 정보를 불러오지 못했습니다.')
      }
      return result.data
    },
    enabled: open,
  })

  const capabilityQuery = useMessagingCapabilityQuery(open)
  const capability: MessagingCapability | null = capabilityQuery.data ?? null
  const loading = open && (guardiansQuery.isPending || capabilityQuery.isPending)

  const studentRows: StudentWithGuardians[] = useMemo(() => {
    const guardiansByStudent = new Map<string, GuardianRow[]>()
    for (const row of guardiansQuery.data ?? []) {
      guardiansByStudent.set(
        row.studentId,
        row.guardians.map((g) => ({
          id: g.id,
          name: g.name,
          relationship: g.relationship,
          phone: g.phone,
        }))
      )
    }
    return absentStudents.map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      sessionId: s.sessionId,
      guardians: guardiansByStudent.get(s.studentId) || [],
    }))
  }, [absentStudents, guardiansQuery.data])

  useEffect(() => {
    if (!open) {
      setSelectedStudentIds(new Set())
      setSelectionSeeded(false)
      return
    }
    setActiveTab('sms')
    setMessage(DEFAULT_MESSAGE)
    setSelectedTemplateId('')
    if (!isChannelChecked) {
      checkChannel().then((hasChannel) => {
        if (hasChannel) loadTemplates()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // 보호자 전화번호가 있는 학생만 기본 선택 — 오픈당 1회만 시드해 재조회가 선택을 덮어쓰지 않도록 보호
  useEffect(() => {
    if (open && !selectionSeeded && guardiansQuery.data) {
      setSelectedStudentIds(
        new Set(
          studentRows.filter((r) => r.guardians.some((g) => g.phone)).map((r) => r.studentId)
        )
      )
      setSelectionSeeded(true)
    }
  }, [open, selectionSeeded, guardiansQuery.data, studentRows])

  useEffect(() => {
    if (isChannelChecked && hasKakaoChannel && kakaoTemplates.length === 0) {
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChannelChecked, hasKakaoChannel])

  useEffect(() => {
    if (activeTab === 'alimtalk' && capability && !capability.alimtalkAvailable) {
      setActiveTab('sms')
    }
  }, [activeTab, capability])

  // ── 선택 토글 ───────────────────────────────────────────────
  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const eligibleStudents = useMemo(
    () => studentRows.filter((r) => r.guardians.some((g) => g.phone)),
    [studentRows]
  )
  const allSelected =
    eligibleStudents.length > 0 &&
    eligibleStudents.every((r) => selectedStudentIds.has(r.studentId))

  const toggleAll = () => {
    if (allSelected) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(eligibleStudents.map((r) => r.studentId)))
    }
  }

  // ── 발송 대상 (학생 × 보호자 × 전화번호) ─────────────────────
  const dispatchList = useMemo(() => {
    const list: Array<{
      studentId: string
      studentName: string
      sessionId: string | null
      guardian: GuardianRow
    }> = []
    for (const row of studentRows) {
      if (!selectedStudentIds.has(row.studentId)) continue
      for (const g of row.guardians) {
        if (g.phone) {
          list.push({
            studentId: row.studentId,
            studentName: row.studentName,
            sessionId: row.sessionId,
            guardian: g,
          })
        }
      }
    }
    return list
  }, [studentRows, selectedStudentIds])

  const studentsWithoutGuardian = useMemo(
    () => studentRows.filter((r) => !r.guardians.some((g) => g.phone)),
    [studentRows]
  )

  // ── 알림톡 미리보기 ─────────────────────────────────────────
  const selectedTemplate = useMemo(
    () => kakaoTemplates.find((t) => t.id === selectedTemplateId),
    [kakaoTemplates, selectedTemplateId]
  )
  const previewTarget = dispatchList[0]
  const alimtalkPreview = useMemo(() => {
    if (!selectedTemplate?.content) return ''
    return renderKakaoTemplatePreview(selectedTemplate.content, {
      학생명: previewTarget?.studentName || '학생',
      보호자명: previewTarget?.guardian.name || '보호자',
    })
  }, [selectedTemplate, previewTarget])

  const templateVariables = useMemo(
    () => (selectedTemplate ? extractKakaoVariableNames(selectedTemplate.content) : []),
    [selectedTemplate]
  )

  // ── 발송 실행 ───────────────────────────────────────────────
  const handleSend = async () => {
    if (dispatchList.length === 0) {
      toast({
        title: '발송 대상 없음',
        description: '선택된 학생 중 발송 가능한 보호자가 없습니다.',
        variant: 'destructive',
      })
      return
    }

    if (activeTab === 'sms') {
      if (!capability?.smsAvailable) {
        toast({ title: '문자 발송 불가', variant: 'destructive' })
        return
      }
      if (!message.trim()) {
        toast({ title: '메시지를 입력해주세요.', variant: 'destructive' })
        return
      }
    } else {
      if (!capability?.alimtalkAvailable) {
        toast({ title: '알림톡 발송 불가', variant: 'destructive' })
        return
      }
      if (!selectedTemplateId) {
        toast({ title: '템플릿을 선택해주세요.', variant: 'destructive' })
        return
      }
    }

    setSending(true)
    try {
      const results = await Promise.all(
        dispatchList.map((d) => {
          if (activeTab === 'sms') {
            const rendered = message.replace(/\{학생명\}/g, d.studentName).replace(
              /\{보호자명\}/g,
              d.guardian.name
            )
            return sendGuardianSMS({
              studentId: d.studentId,
              guardianId: d.guardian.id,
              sessionId: d.sessionId,
              phone: d.guardian.phone!,
              message: rendered,
            })
          } else {
            return sendGuardianAlimtalk({
              studentId: d.studentId,
              guardianId: d.guardian.id,
              sessionId: d.sessionId,
              phone: d.guardian.phone!,
              templateId: selectedTemplateId,
              variables: {
                학생명: d.studentName,
                보호자명: d.guardian.name,
              },
            })
          }
        })
      )

      const successCount = results.filter((r) => r.success).length
      const failures = results
        .map((r, i) => ({ r, d: dispatchList[i] }))
        .filter(({ r }) => !r.success)

      if (failures.length === 0) {
        toast({
          title: activeTab === 'sms' ? '문자 발송 완료' : '알림톡 발송 완료',
          description: `${successCount}건 발송 완료`,
        })
        onSent?.()
        onOpenChange(false)
      } else {
        toast({
          title: failures.length === results.length ? '발송 실패' : '일부 발송 실패',
          description: `성공 ${successCount}건 · 실패 ${failures.length}건 (${failures[0].r.error || '오류'})`,
          variant: 'destructive',
        })
        if (successCount > 0) onSent?.()
      }
    } catch (error) {
      toast({
        title: '발송 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const msgCharCount = message.length
  const msgType = msgCharCount > 90 ? 'LMS' : 'SMS'
  const selectedStudentCount = selectedStudentIds.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            결석·지각 보호자 일괄 연락
          </DialogTitle>
          <DialogDescription>
            결석·지각·조퇴 학생의 보호자에게 문자나 알림톡을 한 번에 전송합니다.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : studentRows.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">대상 학생이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── 대상 학생 ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  대상 학생 ({selectedStudentCount}/{studentRows.length}명)
                </label>
                {eligibleStudents.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-xs text-primary hover:underline"
                  >
                    {allSelected ? '전체 해제' : '전체 선택'}
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 border rounded-md p-2">
                {studentRows.map((row) => {
                  const phoneGuardians = row.guardians.filter((g) => g.phone)
                  const hasPhone = phoneGuardians.length > 0
                  const checked = selectedStudentIds.has(row.studentId)
                  return (
                    <div
                      key={row.studentId}
                      className={`flex items-start gap-3 rounded-md px-2 py-1.5 ${
                        hasPhone ? 'hover:bg-muted/40' : 'opacity-50'
                      }`}
                    >
                      <Checkbox
                        id={`s-${row.studentId}`}
                        checked={checked}
                        disabled={!hasPhone || sending}
                        onCheckedChange={() => toggleStudent(row.studentId)}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={`s-${row.studentId}`}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="text-sm font-medium">{row.studentName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {phoneGuardians.length > 0
                            ? phoneGuardians
                                .map((g) =>
                                  g.relationship ? `${g.name}(${g.relationship})` : g.name
                                )
                                .join(', ')
                            : '연락 가능한 보호자 없음'}
                        </div>
                      </label>
                      {hasPhone && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {phoneGuardians.length}명
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>

              {studentsWithoutGuardian.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ 보호자가 없는 학생 {studentsWithoutGuardian.length}명은 발송에서
                  제외됩니다.
                </p>
              )}
            </div>

            {/* ── 탭 ── */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="sms">문자</TabsTrigger>
                <TabsTrigger
                  value="alimtalk"
                  disabled={!capability?.alimtalkAvailable}
                  title={
                    capability && !capability.alimtalkAvailable
                      ? describeAlimtalkUnavailable(capability.alimtalkUnavailableReason)
                      : undefined
                  }
                >
                  카카오 알림톡
                </TabsTrigger>
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
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[120px] text-sm resize-none"
                    placeholder="보낼 메시지를 입력하세요"
                    disabled={sending}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{'{학생명}'}, {'{보호자명}'} 자동 치환</span>
                    <span>
                      {msgCharCount}자 ({msgType})
                    </span>
                  </div>
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

                    {alimtalkPreview && previewTarget && (
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">
                          미리보기 ({previewTarget.studentName} → {previewTarget.guardian.name}{' '}
                          기준)
                        </label>
                        <div className="rounded-md border bg-[#FEF6CB]/50 p-3 text-sm whitespace-pre-wrap text-foreground">
                          {alimtalkPreview}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* ── 발송 요약 ── */}
            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              총{' '}
              <span className="font-semibold text-foreground">{dispatchList.length}건</span>{' '}
              발송 예정 (학생 {selectedStudentCount}명 × 보호자 합계)
            </div>
          </div>
        )}

        {!loading && studentRows.length > 0 && (
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              닫기
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={
                sending ||
                dispatchList.length === 0 ||
                (activeTab === 'sms'
                  ? !capability?.smsAvailable || !message.trim()
                  : !capability?.alimtalkAvailable || !selectedTemplateId)
              }
              className={
                activeTab === 'alimtalk'
                  ? 'gap-1.5 bg-[#FAE100] text-[#3A1D1D] hover:bg-[#F0D800] border-0'
                  : 'gap-1.5'
              }
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : activeTab === 'alimtalk' ? (
                <MessageSquare className="h-3.5 w-3.5" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {activeTab === 'alimtalk' ? '알림톡' : '문자'} 일괄 전송 ({dispatchList.length}건)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
