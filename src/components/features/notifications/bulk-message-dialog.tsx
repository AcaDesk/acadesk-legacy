'use client'

import { useMemo, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { getStudentsForBulkMessaging } from '@/app/actions/students/queries'
import { Button } from '@ui/button'
import { Label } from '@ui/label'
import { Textarea } from '@ui/textarea'
import { Checkbox } from '@ui/checkbox'
import { Input } from '@ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Alert, AlertDescription } from '@ui/alert'
import { useToast } from '@/hooks/use-toast'
import { sendMessages, getMessageTemplates } from '@/app/actions/messaging/messages'
import {
  useKakaoMessaging,
  getKakaoUnavailableLabel,
} from '@/hooks/use-kakao-messaging'
import { getErrorMessage } from '@/lib/error-handlers'
import { renderKakaoTemplatePreview } from '@/lib/kakao/kakao-variables'
import { Loader2, AlertCircle, Send, Info, Search, X } from 'lucide-react'
import { Badge } from '@ui/badge'

const messageSchema = z.object({
  message: z.string(),
  type: z.enum(['sms', 'lms', 'kakao']),
  kakaoTemplateId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'kakao') {
    if (!data.kakaoTemplateId) {
      ctx.addIssue({
        code: 'custom',
        message: '알림톡 템플릿을 선택해주세요',
        path: ['kakaoTemplateId'],
      })
    }
    return
  }

  if (!data.message.trim()) {
    ctx.addIssue({
      code: 'custom',
      message: '메시지 내용은 필수입니다',
      path: ['message'],
    })
  }
})

type MessageFormValues = z.infer<typeof messageSchema>

interface Student {
  id: string
  student_code: string
  name: string
  phone: string | null
  grade: string | null
  classes: Array<{ id: string | null; name: string | null }>
  guardians: Array<{ name: string | null; phone: string | null }>
  selected: boolean
}

const ALL_FILTER_VALUE = '__all__'

interface MessageTemplate {
  id: string
  name: string
  content: string
  type: 'sms'
  category: string
}

interface BulkMessageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onMessageSent?: () => void
  /** @deprecated tenantId는 더 이상 props로 받지 않습니다 (Server Action 내부에서 verifyStaff로 검증). */
  tenantId?: string
}

type MessageType = 'sms' | 'lms' | 'kakao'

const MESSAGE_TYPE_INFO = {
  sms: {
    label: 'SMS (단문)',
    description: '90바이트(한글 45자) 이내의 짧은 문자',
    maxLength: 90,
    maxLengthKor: 45,
    estimatedCost: '약 8-10원/건',
    icon: '📱',
  },
  lms: {
    label: 'LMS (장문)',
    description: '2,000자 이내의 긴 문자 메시지',
    maxLength: 2000,
    maxLengthKor: 1000,
    estimatedCost: '약 24-30원/건',
    icon: '📄',
  },
  kakao: {
    label: '카카오 알림톡',
    description: '승인된 알림톡 템플릿 기반 메시지',
    maxLength: 1000,
    maxLengthKor: 1000,
    estimatedCost: '약 8-10원/건',
    icon: '톡',
  },
}

export function BulkMessageDialog({
  open,
  onOpenChange,
  onMessageSent,
}: BulkMessageDialogProps) {
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [sending, setSending] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>(ALL_FILTER_VALUE)
  const [classFilter, setClassFilter] = useState<string>(ALL_FILTER_VALUE)

  const { toast } = useToast()
  const {
    hasKakaoChannel,
    unavailableReason,
    isChannelChecked,
    isCheckingChannel,
    templates: kakaoTemplates,
    isLoadingTemplates,
    checkChannel,
    loadTemplates: loadKakaoTemplates,
  } = useKakaoMessaging({ approvedOnly: true })

  const kakaoUnavailableLabel = getKakaoUnavailableLabel(unavailableReason)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: '',
      type: 'sms',
      kakaoTemplateId: undefined,
    },
  })

  const message = watch('message')
  const messageType = watch('type')
  const kakaoTemplateId = watch('kakaoTemplateId')
  const typeInfo = MESSAGE_TYPE_INFO[messageType]

  useEffect(() => {
    if (open) {
      loadStudents()
      loadTemplates()
      if (!isChannelChecked) {
        checkChannel()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open && messageType === 'kakao' && hasKakaoChannel && kakaoTemplates.length === 0) {
      loadKakaoTemplates()
    }
  }, [open, messageType, hasKakaoChannel, kakaoTemplates.length, loadKakaoTemplates])

  async function loadStudents() {
    setLoadingStudents(true)
    try {
      const result = await getStudentsForBulkMessaging()
      if (!result.success) {
        throw new Error(result.error || '학생 목록을 불러오지 못했습니다.')
      }
      // 기본적으로 모두 선택된 상태로 시작
      setStudents(result.data.map((s) => ({ ...s, selected: true })))
    } catch (error) {
      console.error('Error loading students:', error)
      toast({
        title: '학생 로드 오류',
        description: error instanceof Error ? error.message : '학생 목록을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoadingStudents(false)
    }
  }

  // 학년/반 옵션 (학생 목록에서 동적으로 추출)
  const gradeOptions = useMemo(() => {
    const set = new Set<string>()
    students.forEach((s) => {
      if (s.grade) set.add(s.grade)
    })
    return Array.from(set).sort()
  }, [students])

  const classOptions = useMemo(() => {
    const map = new Map<string, string>()
    students.forEach((s) => {
      s.classes.forEach((c) => {
        if (c.id && c.name) map.set(c.id, c.name)
      })
    })
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [students])

  // 검색 + 필터 적용 결과 (선택 토글의 기준이 되는 가시 목록)
  const visibleStudents = useMemo(() => {
    const term = studentSearch.trim().toLowerCase()
    return students.filter((s) => {
      if (gradeFilter !== ALL_FILTER_VALUE && s.grade !== gradeFilter) return false
      if (
        classFilter !== ALL_FILTER_VALUE &&
        !s.classes.some((c) => c.id === classFilter)
      )
        return false
      if (!term) return true
      const haystack = [
        s.name,
        s.student_code,
        s.grade ?? '',
        ...s.classes.map((c) => c.name ?? ''),
        ...s.guardians.map((g) => g.name ?? ''),
        ...s.guardians.map((g) => g.phone ?? ''),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [students, studentSearch, gradeFilter, classFilter])

  const isFiltering =
    studentSearch.trim() !== '' ||
    gradeFilter !== ALL_FILTER_VALUE ||
    classFilter !== ALL_FILTER_VALUE

  function clearFilters() {
    setStudentSearch('')
    setGradeFilter(ALL_FILTER_VALUE)
    setClassFilter(ALL_FILTER_VALUE)
  }

  async function loadTemplates() {
    try {
      const result = await getMessageTemplates()
      if (result.success && result.data) {
        setTemplates(result.data.filter(t => t.type === 'sms'))
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  function toggleStudent(studentId: string) {
    setStudents(students.map(s =>
      s.id === studentId ? { ...s, selected: !s.selected } : s
    ))
  }

  /** 현재 필터/검색으로 보이는 학생만 일괄 토글 (전체 학생이 아님) */
  function toggleAllVisible() {
    const visibleIds = new Set(visibleStudents.filter((s) => s.phone).map((s) => s.id))
    if (visibleIds.size === 0) return
    const allVisibleSelected = visibleStudents
      .filter((s) => s.phone)
      .every((s) => s.selected)
    setStudents(
      students.map((s) =>
        visibleIds.has(s.id) ? { ...s, selected: !allVisibleSelected } : s
      )
    )
  }

  function applyTemplate(template: MessageTemplate) {
    setValue('message', template.content)
  }

  function getPreviewMessage(student: Student) {
    if (messageType === 'kakao') {
      return renderKakaoTemplatePreview(message, {
        학생명: student.name,
        학생번호: student.student_code,
        학년: student.grade || '-',
        학원명: '학원',
        보호자명: '보호자',
      })
    }

    return message
      .replace(/\{학생명\}/g, student.name)
      .replace(/\{학생번호\}/g, student.student_code)
      .replace(/\{학년\}/g, student.grade || '-')
  }

  const onSubmit = async (data: MessageFormValues) => {
    const selectedStudents = students.filter(s => s.selected && s.phone)

    if (selectedStudents.length === 0) {
      toast({
        title: '학생 선택 필요',
        description: '메시지를 보낼 학생을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (data.type === 'kakao' && !data.kakaoTemplateId) {
      toast({
        title: '템플릿 선택 필요',
        description: '알림톡은 승인된 템플릿을 선택해야 발송할 수 있습니다.',
        variant: 'destructive',
      })
      return
    }

    // 글자 수 제한 체크
    const charCount = data.message.length
    if (messageType === 'sms' && charCount > typeInfo.maxLengthKor) {
      toast({
        title: '글자 수 초과',
        description: `SMS는 최대 ${typeInfo.maxLengthKor}자까지 입력 가능합니다. LMS를 선택해주세요.`,
        variant: 'destructive',
      })
      return
    }

    if (messageType === 'lms' && charCount > typeInfo.maxLengthKor) {
      toast({
        title: '글자 수 초과',
        description: `최대 ${typeInfo.maxLengthKor}자까지 입력 가능합니다.`,
        variant: 'destructive',
      })
      return
    }

    setSending(true)

    try {
      const result = await sendMessages({
        studentIds: selectedStudents.map(s => s.id),
        message: data.message.trim(),
        type: messageType,
        ...(data.type === 'kakao' && data.kakaoTemplateId && {
          kakaoTemplateId: data.kakaoTemplateId,
        }),
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || '메시지 전송 실패')
      }

      toast({
        title: '메시지 전송 완료',
        description: `${result.data.successCount}건 성공, ${result.data.failCount}건 실패`,
      })

      reset()
      onMessageSent?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error sending messages:', error)
      toast({
        title: '전송 오류',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const selectedCount = students.filter(s => s.selected && s.phone).length
  const estimatedCost = Math.ceil(
    selectedCount * parseInt(typeInfo.estimatedCost.match(/\d+/)?.[0] || '10')
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>일괄 메시지 전송</DialogTitle>
          <DialogDescription>
            학생 보호자에게 SMS/LMS를 일괄 전송합니다
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Message Type */}
          <div className="space-y-2">
            <Label>메시지 타입 *</Label>
            <Select
              value={messageType}
              onValueChange={(value: MessageType) => {
                setValue('type', value)
                if (value !== 'kakao') {
                  setValue('kakaoTemplateId', undefined)
                } else if (hasKakaoChannel && kakaoTemplates.length === 0) {
                  loadKakaoTemplates()
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <span>{MESSAGE_TYPE_INFO.sms.icon}</span>
                    <div>
                      <p className="font-medium">{MESSAGE_TYPE_INFO.sms.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {MESSAGE_TYPE_INFO.sms.estimatedCost}
                      </p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="lms">
                  <div className="flex items-center gap-2">
                    <span>{MESSAGE_TYPE_INFO.lms.icon}</span>
                    <div>
                      <p className="font-medium">{MESSAGE_TYPE_INFO.lms.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {MESSAGE_TYPE_INFO.lms.estimatedCost}
                      </p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem
                  value="kakao"
                  disabled={!hasKakaoChannel && !isCheckingChannel}
                >
                  <div className="flex items-center gap-2">
                    <span>{MESSAGE_TYPE_INFO.kakao.icon}</span>
                    <div>
                      <p className="font-medium">
                        {MESSAGE_TYPE_INFO.kakao.label}
                        {!hasKakaoChannel &&
                          (isCheckingChannel
                            ? ' (확인 중...)'
                            : ` (${kakaoUnavailableLabel})`)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {MESSAGE_TYPE_INFO.kakao.estimatedCost}
                      </p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm font-medium">{typeInfo.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {messageType === 'kakao'
                    ? '설정에서 승인된 템플릿만 발송할 수 있습니다'
                    : `최대 ${typeInfo.maxLengthKor}자 | 예상 비용: ${typeInfo.estimatedCost}`}
                </p>
              </AlertDescription>
            </Alert>
          </div>

          {/* Template Selection */}
          {messageType !== 'kakao' && templates.length > 0 && (
            <div className="space-y-2">
              <Label>템플릿 선택 (선택사항)</Label>
              <Select onValueChange={(templateId) => {
                const template = templates.find(t => t.id === templateId)
                if (template) applyTemplate(template)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="템플릿을 선택하면 메시지 내용이 자동 입력됩니다" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {template.content.substring(0, 50)}...
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {messageType === 'kakao' && (
            <div className="space-y-2">
              <Label>알림톡 템플릿 *</Label>
              <Select
                value={kakaoTemplateId}
                onValueChange={(templateId) => {
                  setValue('kakaoTemplateId', templateId)
                  const template = kakaoTemplates.find((item) => item.id === templateId)
                  if (template) {
                    setValue('message', template.content)
                  }
                }}
                disabled={!hasKakaoChannel || isCheckingChannel || isLoadingTemplates}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isCheckingChannel || isLoadingTemplates
                        ? '알림톡 템플릿 확인 중...'
                        : hasKakaoChannel
                          ? '승인된 템플릿을 선택하세요'
                          : kakaoUnavailableLabel
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {kakaoTemplates.length === 0 ? (
                    <SelectItem value="none" disabled>
                      승인된 템플릿이 없습니다
                    </SelectItem>
                  ) : (
                    kakaoTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {template.content.substring(0, 50)}...
                          </p>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                알림톡은 검수 승인된 템플릿 본문 그대로 발송되며, 학생별 변수만 치환됩니다.
              </p>
            </div>
          )}

          {/* Student List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>발송 대상 선택 *</Label>
              <Badge variant="secondary">
                {selectedCount}명 선택 / 총 {students.length}명
              </Badge>
            </div>

            {loadingStudents ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                학생 목록을 불러오는 중...
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                학생이 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {/* 검색 + 학년/반 필터 */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="이름·학번·반·보호자명/번호로 검색"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="학년" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_FILTER_VALUE}>전체 학년</SelectItem>
                        {gradeOptions.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={classFilter} onValueChange={setClassFilter}>
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder="반" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_FILTER_VALUE}>전체 반</SelectItem>
                        {classOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isFiltering && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={clearFilters}
                        aria-label="필터 초기화"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* 필터 결과 요약 */}
                {isFiltering && (
                  <div className="text-xs text-muted-foreground">
                    {visibleStudents.length}명 표시 / 총 {students.length}명
                  </div>
                )}

                <div className="border rounded-lg max-h-72 overflow-y-auto">
                  {visibleStudents.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      검색/필터 조건에 맞는 학생이 없습니다
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                visibleStudents.filter((s) => s.phone).length > 0 &&
                                visibleStudents
                                  .filter((s) => s.phone)
                                  .every((s) => s.selected)
                              }
                              onCheckedChange={toggleAllVisible}
                              aria-label={
                                isFiltering ? '현재 표시된 학생 일괄 토글' : '전체 일괄 토글'
                              }
                            />
                          </TableHead>
                          <TableHead>학생</TableHead>
                          <TableHead>반</TableHead>
                          <TableHead>학년</TableHead>
                          <TableHead>학부모 전화번호</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              <Checkbox
                                checked={student.selected}
                                onCheckedChange={() => toggleStudent(student.id)}
                                disabled={!student.phone}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{student.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {student.student_code}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {student.classes.length === 0 ? (
                                <span className="text-xs text-muted-foreground">-</span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {student.classes.map((c, idx) => (
                                    <Badge
                                      key={c.id ?? idx}
                                      variant="outline"
                                      className="text-[11px]"
                                    >
                                      {c.name || '-'}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{student.grade || '-'}</TableCell>
                            <TableCell>
                              {student.phone ? (
                                <span className="text-sm">{student.phone}</span>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground"
                                >
                                  미등록
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Templates */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>템플릿 사용</Label>
              <div className="flex flex-wrap gap-2">
                {templates.slice(0, 5).map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(template)}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Message Content */}
          <div className="space-y-2">
            <Label htmlFor="message">메시지 내용 *</Label>
            <Textarea
              id="message"
              rows={messageType === 'sms' ? 4 : 8}
              {...register('message')}
              className="resize-none font-mono text-sm"
              placeholder={
                messageType === 'kakao'
                  ? '알림톡 템플릿을 선택하면 승인된 본문이 표시됩니다'
                  : `${typeInfo.label} 메시지 내용을 입력하세요 (최대 ${typeInfo.maxLengthKor}자)`
              }
              maxLength={messageType === 'kakao' ? undefined : typeInfo.maxLengthKor}
              readOnly={messageType === 'kakao'}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
            <div className="flex items-center justify-between">
              <p className={`text-xs ${
                message.length > typeInfo.maxLengthKor * 0.9
                  ? 'text-orange-600 font-medium'
                  : 'text-muted-foreground'
              }`}>
                {message.length}
                {messageType !== 'kakao' && ` / ${typeInfo.maxLengthKor}`}자
              </p>
              {messageType === 'sms' && message.length > typeInfo.maxLengthKor && (
                <p className="text-xs text-red-600 font-medium">
                  SMS 글자 수 초과 - LMS 선택 필요
                </p>
              )}
            </div>

            {/* 변수 사용 가이드 */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="text-xs font-medium mb-1">사용 가능한 변수</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  {messageType === 'kakao' ? (
                    <>
                      <span>• {'#{학생명}'}: 학생 이름</span>
                      <span>• {'#{학생번호}'}: 학생 코드</span>
                      <span>• {'#{학년}'}: 학년</span>
                      <span>• {'#{학원명}'}: 학원 이름</span>
                      <span>• {'#{보호자명}'}: 보호자 이름</span>
                    </>
                  ) : (
                    <>
                      <span>• {'{학생명}'}: 학생 이름</span>
                      <span>• {'{학생번호}'}: 학생 코드</span>
                      <span>• {'{학년}'}: 학년</span>
                      <span>• {'{학원명}'}: 학원 이름</span>
                      <span>• {'{보호자명}'}: 보호자 이름</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {messageType === 'kakao'
                    ? <>예: &ldquo;안녕하세요 {'#{보호자명}'}님, {'#{학생명}'} 학생의 리포트가 도착했습니다.&rdquo;</>
                    : <>예: &ldquo;안녕하세요 {'{보호자명}'}님, {'{학생명}'} 학생의 이번 주 출석률은 100%입니다.&rdquo;</>}
                </p>
              </AlertDescription>
            </Alert>
          </div>

          {/* Preview */}
          {selectedCount > 0 && message && (
            <div className="space-y-2">
              <Label>메시지 미리보기</Label>
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">
                  {students.find(s => s.selected && s.phone)?.name} 학부모님께
                </p>
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {getPreviewMessage(students.find(s => s.selected && s.phone)!)}
                </pre>
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedCount > 0 && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">선택된 학생:</span>
                <span className="font-medium">{selectedCount}명</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">예상 비용:</span>
                <span className="font-medium">약 {estimatedCost}원</span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
              disabled={sending}
            >
              취소
            </Button>
            <Button type="submit" disabled={sending || selectedCount === 0}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {selectedCount}명에게 전송
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
