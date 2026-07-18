'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { getTodayKST, getDateKST, getCurrentMonthKST } from '@/lib/utils'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
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
import { useStudentsEnrichedQuery } from '@/hooks/queries/use-students-query'
import { useCreateInvoicesMutation } from '@/hooks/mutations/use-payments-mutations'
import { FileText, AlertCircle, Loader2 } from 'lucide-react'
import { Badge } from '@ui/badge'
import { DatePicker } from '@ui/date-picker'

const createInvoicesSchema = z.object({
  billing_month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '올바른 월 형식이 아닙니다'),
  issue_date: z.string().min(1, '발행일을 선택해주세요'),
  due_date: z.string().min(1, '납부 기한을 선택해주세요'),
  default_tuition: z.string().min(1, '기본 수강료를 입력해주세요'),
})

type CreateInvoicesFormValues = z.infer<typeof createInvoicesSchema>

interface StudentForInvoice {
  id: string
  student_code: string
  student_name: string
  grade: string | null
  enrolled_classes: number
  tuition_amount: number
  selected: boolean
}

interface CreateInvoicesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateInvoicesDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInvoicesDialogProps) {
  const [students, setStudents] = useState<StudentForInvoice[]>([])
  const { toast } = useToast()
  const studentsQuery = useStudentsEnrichedQuery()
  const createInvoicesMutation = useCreateInvoicesMutation()
  const loadingStudents = studentsQuery.isPending
  const creating = createInvoicesMutation.isPending

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateInvoicesFormValues>({
    resolver: zodResolver(createInvoicesSchema),
    defaultValues: {
      billing_month: getCurrentMonthKST(),
      issue_date: getTodayKST(),
      due_date: getDateKST(5),
      default_tuition: '500000',
    },
  })

  const defaultTuition = watch('default_tuition')

  useEffect(() => {
    // Update all students' tuition when default changes
    if (!defaultTuition) return

    setStudents(prev => {
      if (prev.length === 0) return prev

      return prev.map(s => ({
        ...s,
        tuition_amount: s.selected ? parseInt(defaultTuition) * s.enrolled_classes : s.tuition_amount
      }))
    })
  }, [defaultTuition])

  // 다이얼로그 오픈 시 재원생 목록을 청구 대상으로 초기화
  // (기본 수강료 × 수강 반 수 — 이후 학생별 금액은 표에서 개별 수정 가능)
  useEffect(() => {
    if (!open || !studentsQuery.data) return
    const baseTuition = parseInt(defaultTuition) || 0
    setStudents(
      studentsQuery.data.map((s) => {
        const enrolledClasses = Math.max(s.classes.length, 1)
        return {
          id: s.id,
          student_code: s.student_code,
          student_name: s.name,
          grade: s.grade,
          enrolled_classes: enrolledClasses,
          tuition_amount: baseTuition * enrolledClasses,
          selected: true,
        }
      })
    )
    // defaultTuition 변경은 위의 별도 effect가 반영하므로 여기선 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentsQuery.data])

  function toggleStudent(studentId: string) {
    setStudents(students.map(s =>
      s.id === studentId ? { ...s, selected: !s.selected } : s
    ))
  }

  function toggleAll() {
    const allSelected = students.every(s => s.selected)
    setStudents(students.map(s => ({ ...s, selected: !allSelected })))
  }

  function updateTuition(studentId: string, amount: number) {
    setStudents(students.map(s =>
      s.id === studentId ? { ...s, tuition_amount: amount } : s
    ))
  }

  const onSubmit = async (data: CreateInvoicesFormValues) => {
    const selectedStudents = students.filter(s => s.selected && s.tuition_amount > 0)
    if (selectedStudents.length === 0) {
      toast({
        title: '학생 선택 필요',
        description: '청구서를 생성할 학생을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    createInvoicesMutation.mutate(
      {
        billingMonth: data.billing_month,
        issueDate: data.issue_date,
        dueDate: data.due_date,
        invoices: selectedStudents.map((s) => ({
          studentId: s.id,
          amount: s.tuition_amount,
        })),
      },
      {
        onSuccess: () => {
          reset()
          onOpenChange(false)
          onSuccess?.()
        },
      }
    )
  }

  const selectedCount = students.filter(s => s.selected).length
  const totalAmount = students
    .filter(s => s.selected)
    .reduce((sum, s) => sum + s.tuition_amount, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>월별 청구서 일괄 생성</DialogTitle>
          <DialogDescription>
            수강 중인 학생들에게 학원비를 일괄 청구합니다
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 기본 정보 */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="billing_month">청구 연월 *</Label>
              <Input
                id="billing_month"
                type="month"
                {...register('billing_month')}
              />
              {errors.billing_month && (
                <p className="text-sm text-destructive">{errors.billing_month.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="issue_date">발행일 *</Label>
              <DatePicker
                value={watch('issue_date') ? new Date(watch('issue_date')) : undefined}
                onChange={(date) => {
                  if (date) {
                    setValue('issue_date', date.toISOString().split('T')[0], {
                      shouldValidate: true,
                    });
                  }
                }}
                placeholder="발행일 선택"
              />
              {errors.issue_date && (
                <p className="text-sm text-destructive">{errors.issue_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">납부 기한 *</Label>
              <DatePicker
                value={watch('due_date') ? new Date(watch('due_date')) : undefined}
                onChange={(date) => {
                  if (date) {
                    setValue('due_date', date.toISOString().split('T')[0], {
                      shouldValidate: true,
                    });
                  }
                }}
                placeholder="납부 기한 선택"
              />
              {errors.due_date && (
                <p className="text-sm text-destructive">{errors.due_date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_tuition">기본 수강료 (수업당) *</Label>
            <div className="relative">
              <Input
                id="default_tuition"
                type="number"
                placeholder="500000"
                {...register('default_tuition')}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                원
              </span>
            </div>
            {errors.default_tuition && (
              <p className="text-sm text-destructive">{errors.default_tuition.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              수강 중인 수업 수에 따라 자동으로 계산됩니다
            </p>
          </div>

          {/* 학생 목록 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>청구 대상 학생 선택</Label>
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
                수강 중인 학생이 없습니다
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
                      <TableHead>학년</TableHead>
                      <TableHead className="text-center">수강 수업</TableHead>
                      <TableHead className="text-right">청구액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox
                            checked={student.selected}
                            onCheckedChange={() => toggleStudent(student.id)}
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
                        <TableCell>
                          {student.grade ? (
                            <Badge variant="outline">{student.grade}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{student.enrolled_classes}개</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            value={student.tuition_amount}
                            onChange={(e) => updateTuition(student.id, parseInt(e.target.value) || 0)}
                            className="w-32 text-right ml-auto"
                            disabled={!student.selected}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* 요약 */}
          {selectedCount > 0 && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">선택된 학생:</span>
                <span className="font-medium">{selectedCount}명</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground font-medium">총 청구액:</span>
                <span className="font-bold text-lg">{totalAmount.toLocaleString()}원</span>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
              disabled={creating}
            >
              취소
            </Button>
            <Button type="submit" disabled={creating || selectedCount === 0}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  청구서 생성 ({selectedCount}건)
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
