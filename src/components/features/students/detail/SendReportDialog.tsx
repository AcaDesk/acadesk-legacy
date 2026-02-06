'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Button } from '@ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Input } from '@ui/input'
import { Textarea } from '@ui/textarea'
import { Calendar } from '@ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ui/popover'
import { Alert, AlertDescription } from '@ui/alert'
import { useToast } from '@/hooks/use-toast'
import { useKakaoMessaging } from '@/hooks/use-kakao-messaging'
import { CalendarIcon, Loader2, Send, Eye, Info, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateAndSendReport } from '@/app/actions/reports'
import { getErrorMessage } from '@/lib/error-handlers'
import { KAKAO_REPORT_VARIABLES } from '@/lib/kakao/kakao-constants'
import type { StudentDetail } from '@/core/types/studentDetail.types'

const reportSchema = z.object({
  startDate: z.date({
    message: '시작일을 선택해주세요.',
  }),
  endDate: z.date({
    message: '종료일을 선택해주세요.',
  }),
  type: z.enum(['student_monthly', 'student_exam']),
  comment: z.string().optional(),
  channel: z.enum(['sms', 'lms', 'kakao', 'email']),
  recipientName: z.string().min(1, '수신자 이름을 입력해주세요.'),
  recipientContact: z.string().min(1, '수신자 연락처를 입력해주세요.'),
  academyName: z.string().min(1, '학원 이름을 입력해주세요.'),
  academyPhone: z.string().min(1, '학원 연락처를 입력해주세요.'),
  /** 카카오 알림톡 템플릿 ID (channel이 'kakao'일 때 필수) */
  kakaoTemplateId: z.string().optional(),
}).refine((data) => {
  // kakao 채널 선택 시 템플릿 ID 필수
  if (data.channel === 'kakao' && !data.kakaoTemplateId) {
    return false
  }
  return true
}, {
  message: '알림톡 발송에는 템플릿을 선택해야 합니다.',
  path: ['kakaoTemplateId'],
})

type ReportFormData = z.infer<typeof reportSchema>

interface SendReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: StudentDetail
}

export function SendReportDialog({
  open,
  onOpenChange,
  student,
}: SendReportDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [previewContent, setPreviewContent] = useState<string | null>(null)

  // 카카오 알림톡 관련 상태 (커스텀 훅 사용)
  const {
    hasKakaoChannel,
    isChannelChecked: kakaoChannelChecked,
    templates: kakaoTemplates,
    isLoadingTemplates: loadingTemplates,
    checkChannel: checkKakaoChannel,
    loadTemplates: loadKakaoTemplates,
  } = useKakaoMessaging({ approvedOnly: true })

  // 기본값: 지난달 1일 ~ 말일
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1))
  const lastMonthEnd = endOfMonth(subMonths(new Date(), 1))

  // 보호자 정보 가져오기
  const guardian = student.student_guardians?.[0]?.guardians
  const guardianName = guardian?.users?.name || ''
  const guardianPhone = guardian?.users?.phone || ''

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      startDate: lastMonthStart,
      endDate: lastMonthEnd,
      type: 'student_monthly',
      comment: '',
      channel: 'lms',
      recipientName: guardianName,
      recipientContact: guardianPhone,
      academyName: '',
      academyPhone: '',
      kakaoTemplateId: undefined,
    },
  })

  const selectedChannel = form.watch('channel')

  // 카카오 채널 연동 확인 (다이얼로그 열릴 때)
  useEffect(() => {
    if (open && !kakaoChannelChecked) {
      checkKakaoChannel()
    }
  }, [open, kakaoChannelChecked, checkKakaoChannel])

  // 카카오 채널 선택 시 템플릿 로드
  useEffect(() => {
    if (selectedChannel === 'kakao' && hasKakaoChannel && kakaoTemplates.length === 0) {
      loadKakaoTemplates()
    }
  }, [selectedChannel, hasKakaoChannel, kakaoTemplates.length, loadKakaoTemplates])

  const handlePreview = () => {
    const values = form.getValues()

    // 간단한 미리보기 텍스트 생성
    const preview = `[${student.users?.name || '학생'} 학습 리포트]

📅 기간: ${format(values.startDate, 'yyyy-MM-dd', { locale: ko })} ~ ${format(values.endDate, 'yyyy-MM-dd', { locale: ko })}
🎓 학년: ${student.grade || '-'}

📊 성적, 📅 출석률, ✏️ 숙제 완료율 등의 정보가 포함됩니다.

${values.comment ? `\n💬 종합평가\n${values.comment}\n` : ''}
문의: ${values.academyName || '[학원명]'} ${values.academyPhone || '[연락처]'}`

    setPreviewContent(preview)
  }

  const onSubmit = async (data: ReportFormData) => {
    setIsLoading(true)
    try {
      const result = await generateAndSendReport({
        studentId: student.id,
        startDate: format(data.startDate, 'yyyy-MM-dd'),
        endDate: format(data.endDate, 'yyyy-MM-dd'),
        type: data.type,
        comment: data.comment,
        channel: data.channel,
        recipientName: data.recipientName,
        recipientContact: data.recipientContact,
        academyName: data.academyName,
        academyPhone: data.academyPhone,
        // 카카오 알림톡 관련 파라미터
        ...(data.channel === 'kakao' && data.kakaoTemplateId && {
          kakaoTemplateId: data.kakaoTemplateId,
        }),
      })

      if (!result.success) {
        throw new Error(result.error || '리포트 발송에 실패했습니다.')
      }

      // 채널에 따른 메시지 다르게 표시
      const channelLabel = data.channel === 'kakao' ? '알림톡' : data.channel.toUpperCase()

      toast({
        title: '리포트 발송 완료',
        description: `${data.recipientName}님께 ${channelLabel} 메시지가 발송되었습니다.`,
      })

      onOpenChange(false)
      form.reset()
      setPreviewContent(null)
    } catch (error) {
      toast({
        title: '발송 실패',
        description: getErrorMessage(error),
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>리포트 발송</DialogTitle>
          <DialogDescription>
            {student.users?.name} 학생의 학습 리포트를 생성하고 발송합니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 기간 선택 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>시작일</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ko })
                            ) : (
                              <span>날짜 선택</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>종료일</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ko })
                            ) : (
                              <span>날짜 선택</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 리포트 타입 */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>리포트 타입</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="리포트 타입 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="student_monthly">월간 리포트</SelectItem>
                      <SelectItem value="student_exam">시험 리포트</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 종합 평가 */}
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>종합 평가 (선택)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="학생에 대한 종합 평가를 입력하세요..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    리포트 하단에 표시될 선생님의 평가 의견입니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 발송 채널 */}
            <FormField
              control={form.control}
              name="channel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>발송 채널</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      // 카카오 외 채널 선택 시 템플릿 ID 초기화
                      if (value !== 'kakao') {
                        form.setValue('kakaoTemplateId', undefined)
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="발송 채널 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sms">SMS (90자 이내)</SelectItem>
                      <SelectItem value="lms">LMS (2000자 이내)</SelectItem>
                      <SelectItem value="kakao" disabled={!hasKakaoChannel}>
                        <span className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          카카오 알림톡
                          {!hasKakaoChannel && ' (채널 연동 필요)'}
                        </span>
                      </SelectItem>
                      <SelectItem value="email" disabled>
                        이메일 (준비중)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {selectedChannel === 'kakao'
                      ? '승인된 템플릿을 선택하면 알림톡이 발송됩니다.'
                      : 'SMS는 90자, LMS는 2000자까지 전송 가능합니다.'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 카카오 알림톡 템플릿 선택 (kakao 채널 선택 시) */}
            {selectedChannel === 'kakao' && (
              <FormField
                control={form.control}
                name="kakaoTemplateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>알림톡 템플릿 *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="템플릿 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loadingTemplates ? (
                          <SelectItem value="loading" disabled>
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              로딩 중...
                            </span>
                          </SelectItem>
                        ) : kakaoTemplates.length === 0 ? (
                          <SelectItem value="none" disabled>
                            승인된 템플릿이 없습니다
                          </SelectItem>
                        ) : (
                          kakaoTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      카카오 검수를 통과한 템플릿만 발송할 수 있습니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* 선택된 템플릿 미리보기 */}
            {selectedChannel === 'kakao' && form.watch('kakaoTemplateId') && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {(() => {
                    const selectedTemplate = kakaoTemplates.find(
                      (t) => t.id === form.watch('kakaoTemplateId')
                    )
                    if (!selectedTemplate) return null
                    return (
                      <div className="space-y-2">
                        <p className="font-medium text-sm">{selectedTemplate.name}</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {selectedTemplate.content.substring(0, 200)}
                          {selectedTemplate.content.length > 200 && '...'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          자동 치환 변수: {KAKAO_REPORT_VARIABLES.map((v) => `#{${v.key}}`).join(', ')}
                        </p>
                      </div>
                    )
                  })()}
                </AlertDescription>
              </Alert>
            )}

            {/* 수신자 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="recipientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>수신자 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="홍길동" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recipientContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>수신자 연락처</FormLabel>
                    <FormControl>
                      <Input placeholder="01012345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 학원 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="academyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>학원 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="우리 학원" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="academyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>학원 연락처</FormLabel>
                    <FormControl>
                      <Input placeholder="02-1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 미리보기 영역 */}
            {previewContent && (
              <div className="rounded-lg border bg-muted p-4">
                <div className="text-sm font-medium mb-2">메시지 미리보기</div>
                <div className="text-sm whitespace-pre-wrap">{previewContent}</div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreview}
                disabled={isLoading}
              >
                <Eye className="h-4 w-4 mr-2" />
                미리보기
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    발송 중...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    발송
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
