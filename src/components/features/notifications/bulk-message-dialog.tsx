'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@ui/button'
import { Label } from '@ui/label'
import { Textarea } from '@ui/textarea'
import { Checkbox } from '@ui/checkbox'
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
import { sendMessages, getMessageTemplates } from '@/app/actions/messages'
import { getErrorMessage } from '@/lib/error-handlers'
import { Loader2, AlertCircle, Send, Info } from 'lucide-react'
import { Badge } from '@ui/badge'

const messageSchema = z.object({
  message: z.string().min(1, '메시지 내용은 필수입니다'),
  type: z.enum(['sms', 'lms', 'mms']),
})

type MessageFormValues = z.infer<typeof messageSchema>

interface Student {
  id: string
  student_code: string
  name: string
  phone: string | null
  grade: string | null
  selected: boolean
}

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
}

type MessageType = 'sms' | 'lms' | 'mms'

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
  mms: {
    label: 'MMS (포토)',
    description: '2,000자 + 이미지 첨부 가능 (이미지 업로드는 추후 지원)',
    maxLength: 2000,
    maxLengthKor: 1000,
    estimatedCost: '약 40-50원/건',
    icon: '🖼️',
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

  const { toast } = useToast()
  const supabase = createClient()

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
    },
  })

  const message = watch('message')
  const messageType = watch('type')
  const typeInfo = MESSAGE_TYPE_INFO[messageType]

  useEffect(() => {
    if (open) {
      loadStudents()
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function loadStudents() {
    setLoadingStudents(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          student_code,
          grade,
          users!inner(
            name
          ),
          student_guardians(
            guardians(
              users(
                phone
              )
            )
          )
        `)
        .is('deleted_at', null)
        .order('student_code')

      if (error) throw error

      const studentList = (data || []).map((s: any) => {
        // Get primary guardian's phone (first guardian if available)
        const guardians = s.student_guardians || []
        const guardianPhone = guardians[0]?.guardians?.users?.phone || null

        return {
          id: s.id,
          student_code: s.student_code,
          name: s.users?.name || '-',
          phone: guardianPhone,
          grade: s.grade || null,
          selected: true, // 기본적으로 모두 선택
        }
      })

      setStudents(studentList)
    } catch (error) {
      console.error('Error loading students:', error)
      toast({
        title: '학생 로드 오류',
        description: '학생 목록을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoadingStudents(false)
    }
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

  function toggleAll() {
    const allSelected = students.every(s => s.selected && s.phone)
    setStudents(students.map(s => ({
      ...s,
      selected: s.phone ? !allSelected : false
    })))
  }

  function useTemplate(template: MessageTemplate) {
    setValue('message', template.content)
  }

  function getPreviewMessage(student: Student) {
    return message
      .replace(/\{학생명\}/g, student.name)
      .replace(/\{학생코드\}/g, student.student_code)
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

    // 글자 수 제한 체크
    const charCount = data.message.length
    if (messageType === 'sms' && charCount > typeInfo.maxLengthKor) {
      toast({
        title: '글자 수 초과',
        description: `SMS는 최대 ${typeInfo.maxLengthKor}자까지 입력 가능합니다. LMS 또는 MMS를 선택해주세요.`,
        variant: 'destructive',
      })
      return
    }

    if ((messageType === 'lms' || messageType === 'mms') && charCount > typeInfo.maxLengthKor) {
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
            학생 보호자에게 SMS/LMS/MMS를 일괄 전송합니다
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Message Type */}
          <div className="space-y-2">
            <Label>메시지 타입 *</Label>
            <Select value={messageType} onValueChange={(value: MessageType) => setValue('type', value)}>
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
                <SelectItem value="mms">
                  <div className="flex items-center gap-2">
                    <span>{MESSAGE_TYPE_INFO.mms.icon}</span>
                    <div>
                      <p className="font-medium">{MESSAGE_TYPE_INFO.mms.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {MESSAGE_TYPE_INFO.mms.estimatedCost}
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
                  최대 {typeInfo.maxLengthKor}자 | 예상 비용: {typeInfo.estimatedCost}
                </p>
              </AlertDescription>
            </Alert>
          </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>템플릿 선택 (선택사항)</Label>
              <Select onValueChange={(templateId) => {
                const template = templates.find(t => t.id === templateId)
                if (template) useTemplate(template)
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
              <div className="border rounded-lg max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={students.filter(s => s.phone).every(s => s.selected)}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>학생</TableHead>
                      <TableHead>학년</TableHead>
                      <TableHead>학부모 전화번호</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
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
                        <TableCell>{student.grade || '-'}</TableCell>
                        <TableCell>
                          {student.phone ? (
                            <span className="text-sm">{student.phone}</span>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              미등록
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                    onClick={() => useTemplate(template)}
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
              placeholder={`${typeInfo.label} 메시지 내용을 입력하세요 (최대 ${typeInfo.maxLengthKor}자)`}
              maxLength={typeInfo.maxLengthKor}
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
                {message.length} / {typeInfo.maxLengthKor}자
              </p>
              {messageType === 'sms' && message.length > typeInfo.maxLengthKor && (
                <p className="text-xs text-red-600 font-medium">
                  SMS 글자 수 초과 - LMS 또는 MMS 선택 필요
                </p>
              )}
            </div>

            {/* 변수 사용 가이드 */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="text-xs font-medium mb-1">사용 가능한 변수</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                  <span>• {'{학생명}'}: 학생 이름</span>
                  <span>• {'{학생번호}'}: 학생 코드</span>
                  <span>• {'{학년}'}: 학년</span>
                  <span>• {'{학원명}'}: 학원 이름</span>
                  <span>• {'{보호자명}'}: 보호자 이름</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  예: "안녕하세요 {'{보호자명}'}님, {'{학생명}'} 학생의 이번 주 출석률은 100%입니다."
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
