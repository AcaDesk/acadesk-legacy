'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { useToast } from '@/hooks/use-toast'
import { useCurrentUser } from '@/hooks/use-current-user'
import { MessageSquare, Mail, Loader2, AlertCircle } from 'lucide-react'
import { Badge } from '@ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@ui/tabs'

const reminderSchema = z.object({
  message: z.string().min(10, '메시지는 최소 10자 이상이어야 합니다'),
})

type ReminderFormValues = z.infer<typeof reminderSchema>

interface UnpaidStudent {
  id: string
  student_code: string
  student_name: string
  billing_month: string
  remaining_amount: number
  days_overdue: number
  guardian_phone: string | null
  guardian_email: string | null
  selected: boolean
}

interface PaymentReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month?: string
  onSuccess?: () => void
}

export function PaymentReminderDialog({
  open,
  onOpenChange,
  month,
  onSuccess,
}: PaymentReminderDialogProps) {
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [students, setStudents] = useState<UnpaidStudent[]>([])
  const [sending, setSending] = useState(false)
  const [sendMethod, setSendMethod] = useState<'sms' | 'email'>('sms')
  const { toast } = useToast()
  const { user: currentUser } = useCurrentUser()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      message: `[아카데스크 학원]
안녕하세요. {학생명} 학부모님,
{청구월} 학원비 {미납액}원이 미납되어 안내드립니다.
납부 기한이 지났으니 가급적 빠른 시일 내 납부 부탁드립니다.

문의사항이 있으시면 연락주세요.
감사합니다.`,
    },
  })

  const message = watch('message')

  const loadUnpaidStudents = useCallback(async () => {
    if (!currentUser) return

    try {
      setLoadingStudents(true)

      // TODO: Replace with actual query when database is ready
      // const { data, error } = await supabase
      //   .from('invoices')
      //   .select(`
      //     id,
      //     student_id,
      //     students!inner(
      //       student_code,
      //       users!inner(name),
      //       guardians(phone, email)
      //     ),
      //     billing_month,
      //     remaining_amount,
      //     due_date
      //   `)
      //   .eq('tenant_id', currentUser.tenantId)
      //   .gt('remaining_amount', 0)
      //   .order('due_date', { ascending: true })

      // Mock data
      const mockStudents: UnpaidStudent[] = [
        {
          id: '1',
          student_code: 'ST002',
          student_name: '이영희',
          billing_month: month || '2025-10',
          remaining_amount: 300000,
          days_overdue: 0,
          guardian_phone: '010-1234-5678',
          guardian_email: 'parent1@example.com',
          selected: true,
        },
        {
          id: '2',
          student_code: 'ST003',
          student_name: '박민수',
          billing_month: month || '2025-10',
          remaining_amount: 550000,
          days_overdue: 5,
          guardian_phone: '010-2345-6789',
          guardian_email: null,
          selected: true,
        },
        {
          id: '3',
          student_code: 'ST004',
          student_name: '최지영',
          billing_month: month || '2025-10',
          remaining_amount: 700000,
          days_overdue: 0,
          guardian_phone: null,
          guardian_email: 'parent3@example.com',
          selected: true,
        },
      ]

      setStudents(mockStudents)
    } catch (error) {
      console.error('Error loading unpaid students:', error)
      toast({
        title: '학생 로드 오류',
        description: '미납 학생 목록을 불러오는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoadingStudents(false)
    }
  }, [currentUser, month, toast])

  useEffect(() => {
    if (open) {
      loadUnpaidStudents()
    }
  }, [open, loadUnpaidStudents])

  function toggleStudent(studentId: string) {
    setStudents(students.map(s =>
      s.id === studentId ? { ...s, selected: !s.selected } : s
    ))
  }

  function toggleAll() {
    const allSelected = students.every(s => s.selected)
    setStudents(students.map(s => ({ ...s, selected: !allSelected })))
  }

  function getPreviewMessage(student: UnpaidStudent) {
    return message
      .replace('{학생명}', student.student_name)
      .replace('{청구월}', student.billing_month)
      .replace('{미납액}', student.remaining_amount.toLocaleString())
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onSubmit = async (_data: ReminderFormValues) => {
    if (!currentUser) {
      toast({
        title: '인증 오류',
        description: '로그인 정보를 확인할 수 없습니다.',
        variant: 'destructive',
      })
      return
    }

    const selectedStudents = students.filter(s => s.selected)
    if (selectedStudents.length === 0) {
      toast({
        title: '학생 선택 필요',
        description: '알림을 보낼 학생을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    // Validate contact info based on send method
    const missingContact = selectedStudents.filter(s =>
      sendMethod === 'sms' ? !s.guardian_phone : !s.guardian_email
    )

    if (missingContact.length > 0) {
      toast({
        title: '연락처 누락',
        description: `${missingContact.map(s => s.student_name).join(', ')} 학생의 ${sendMethod === 'sms' ? '전화번호' : '이메일'}가 등록되지 않았습니다.`,
        variant: 'destructive',
      })
      return
    }

    setSending(true)
    try {
      // TODO: Replace with actual notification sending when implemented
      // for (const student of selectedStudents) {
      //   const personalizedMessage = getPreviewMessage(student)
      //
      //   if (sendMethod === 'sms') {
      //     // Send SMS via SMS service
      //     await sendSMS(student.guardian_phone, personalizedMessage)
      //   } else {
      //     // Send Email
      //     await sendEmail(student.guardian_email, '학원비 납부 안내', personalizedMessage)
      //   }
      // }

      // Mock success
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast({
        title: `${sendMethod === 'sms' ? 'SMS' : '이메일'} 발송 완료`,
        description: `${selectedStudents.length}명의 학부모에게 납부 안내가 발송되었습니다.`,
      })

      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error: unknown) {
      console.error('알림 발송 오류:', error)
      toast({
        title: '알림 발송 실패',
        description: error instanceof Error ? error.message : '알림을 발송하는 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const selectedCount = students.filter(s => s.selected).length
  const totalAmount = students
    .filter(s => s.selected)
    .reduce((sum, s) => sum + s.remaining_amount, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>미납자 알림 발송</DialogTitle>
          <DialogDescription>
            미납 학생의 학부모에게 납부 안내 알림을 발송합니다
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Send Method */}
          <Tabs value={sendMethod} onValueChange={(v) => setSendMethod(v as 'sms' | 'email')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sms">
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS 발송
              </TabsTrigger>
              <TabsTrigger value="email">
                <Mail className="h-4 w-4 mr-2" />
                이메일 발송
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Student List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>발송 대상 선택</Label>
              <Badge variant="secondary">
                {selectedCount}명 선택 / 총 {students.length}명
              </Badge>
            </div>

            {loadingStudents ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                미납 학생 목록을 불러오는 중...
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                미납 학생이 없습니다
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={students.every(s => s.selected)}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>학생</TableHead>
                      <TableHead>청구월</TableHead>
                      <TableHead className="text-right">미납액</TableHead>
                      <TableHead className="text-center">연체일</TableHead>
                      <TableHead>{sendMethod === 'sms' ? '전화번호' : '이메일'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const hasContact = sendMethod === 'sms' ? student.guardian_phone : student.guardian_email
                      return (
                        <TableRow key={student.id}>
                          <TableCell>
                            <Checkbox
                              checked={student.selected}
                              onCheckedChange={() => toggleStudent(student.id)}
                              disabled={!hasContact}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{student.student_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {student.student_code}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{student.billing_month}</TableCell>
                          <TableCell className="text-right font-medium text-orange-600">
                            {student.remaining_amount.toLocaleString()}원
                          </TableCell>
                          <TableCell className="text-center">
                            {student.days_overdue > 0 ? (
                              <Badge variant="destructive">{student.days_overdue}일</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {hasContact ? (
                              <span className="text-sm">
                                {sendMethod === 'sms' ? student.guardian_phone : student.guardian_email}
                              </span>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                미등록
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Message Template */}
          <div className="space-y-2">
            <Label htmlFor="message">알림 메시지 *</Label>
            <Textarea
              id="message"
              rows={8}
              {...register('message')}
              className="resize-none font-mono text-sm"
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              💡 사용 가능한 변수: {'{학생명}'}, {'{청구월}'}, {'{미납액}'}
            </p>
          </div>

          {/* Preview */}
          {selectedCount > 0 && (
            <div className="space-y-2">
              <Label>메시지 미리보기</Label>
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">
                  {students.find(s => s.selected)?.student_name} 학부모님께
                </p>
                <pre className="text-sm whitespace-pre-wrap font-sans">
                  {getPreviewMessage(students.find(s => s.selected)!)}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  {sendMethod === 'sms'
                    ? `SMS 1건당 요금이 부과됩니다. (총 ${selectedCount}건 발송 예정)`
                    : `총 ${selectedCount}건의 이메일이 발송됩니다.`}
                </p>
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
                <span className="text-muted-foreground font-medium">총 미납액:</span>
                <span className="font-bold text-lg text-orange-600">
                  {totalAmount.toLocaleString()}원
                </span>
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
                  {sendMethod === 'sms' ? (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  {sendMethod === 'sms' ? 'SMS' : '이메일'} 발송 ({selectedCount}건)
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
