'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { getTodayKST } from '@/lib/utils'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
import { Label } from '@ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/select'
import { Textarea } from '@ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useInvoiceDetailQuery } from '@/hooks/queries/use-payments-query'
import { useRecordPaymentMutation } from '@/hooks/mutations/use-payments-mutations'
import type { PaymentMethod } from '@/core/types/payment'
import { CreditCard, Building2, Banknote } from 'lucide-react'
import { DatePicker } from '@ui/date-picker'

const paymentSchema = z.object({
  paid_amount: z.string().min(1, '입금액을 입력해주세요'),
  payment_date: z.string().min(1, '입금일을 선택해주세요'),
  payment_method: z.enum(['card', 'transfer', 'cash'], {
    message: '결제 방법을 선택해주세요',
  }),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
})

type PaymentFormValues = z.infer<typeof paymentSchema>

interface ProcessPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  onSuccess?: () => void
}

export function ProcessPaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  onSuccess,
}: ProcessPaymentDialogProps) {
  const { toast } = useToast()
  const detailQuery = useInvoiceDetailQuery(invoiceId, open)
  const recordPaymentMutation = useRecordPaymentMutation()
  const loading = recordPaymentMutation.isPending

  const invoiceDetails = detailQuery.data
    ? {
        student_name: detailQuery.data.student_name,
        billing_month: detailQuery.data.billing_month,
        total_amount: detailQuery.data.total_amount,
        paid_amount: detailQuery.data.paid_amount,
        remaining_amount: detailQuery.data.remaining_amount,
      }
    : undefined

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      payment_date: getTodayKST(),
      payment_method: 'transfer',
    },
  })

  const selectedPaymentMethod = watch('payment_method')

  const onSubmit = async (data: PaymentFormValues) => {
    const paidAmount = parseInt(data.paid_amount.replace(/[^0-9]/g, ''), 10)
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      toast({
        title: '입력 오류',
        description: '수납 금액을 확인해주세요.',
        variant: 'destructive',
      })
      return
    }

    recordPaymentMutation.mutate(
      {
        invoiceId,
        paidAmount,
        paymentMethod: data.payment_method,
        paymentDate: data.payment_date,
        referenceNumber: data.reference_number || undefined,
        notes: data.notes || undefined,
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

  // Unused helper function - may be used for future UI enhancements
  // const getPaymentMethodIcon = (method: PaymentMethod) => {
  //   switch (method) {
  //     case 'card':
  //       return <CreditCard className="h-4 w-4" />
  //     case 'transfer':
  //       return <Building2 className="h-4 w-4" />
  //     case 'cash':
  //       return <Banknote className="h-4 w-4" />
  //   }
  // }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>수납 처리</DialogTitle>
          <DialogDescription>
            학원비 입금 정보를 입력하세요
          </DialogDescription>
        </DialogHeader>

        {invoiceDetails && (
          <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">학생:</span>
              <span className="font-medium">{invoiceDetails.student_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">청구월:</span>
              <span className="font-medium">{invoiceDetails.billing_month}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">총 청구액:</span>
              <span className="font-medium">{invoiceDetails.total_amount.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">기납부액:</span>
              <span className="font-medium text-success">
                {invoiceDetails.paid_amount.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground font-medium">미납액:</span>
              <span className="font-bold text-orange-600">
                {invoiceDetails.remaining_amount.toLocaleString()}원
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 입금액 */}
          <div className="space-y-2">
            <Label htmlFor="paid_amount">입금액 *</Label>
            <div className="relative">
              <Input
                id="paid_amount"
                type="number"
                placeholder="0"
                {...register('paid_amount')}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                원
              </span>
            </div>
            {errors.paid_amount && (
              <p className="text-sm text-destructive">{errors.paid_amount.message}</p>
            )}
            {invoiceDetails && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setValue('paid_amount', invoiceDetails.remaining_amount.toString())}
              >
                미납액 전액 입력
              </Button>
            )}
          </div>

          {/* 입금일 */}
          <div className="space-y-2">
            <Label htmlFor="payment_date">입금일 *</Label>
            <DatePicker
              value={watch('payment_date') ? new Date(watch('payment_date')) : undefined}
              onChange={(date) => {
                if (date) {
                  setValue('payment_date', date.toISOString().split('T')[0], {
                    shouldValidate: true,
                  });
                }
              }}
              placeholder="입금일 선택"
            />
            {errors.payment_date && (
              <p className="text-sm text-destructive">{errors.payment_date.message}</p>
            )}
          </div>

          {/* 결제 방법 */}
          <div className="space-y-2">
            <Label htmlFor="payment_method">결제 방법 *</Label>
            <Select
              value={selectedPaymentMethod}
              onValueChange={(value) => setValue('payment_method', value as PaymentMethod)}
            >
              <SelectTrigger id="payment_method">
                <SelectValue placeholder="결제 방법 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    계좌이체
                  </div>
                </SelectItem>
                <SelectItem value="card">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    카드 결제
                  </div>
                </SelectItem>
                <SelectItem value="cash">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    현금
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.payment_method && (
              <p className="text-sm text-destructive">{errors.payment_method.message}</p>
            )}
          </div>

          {/* 거래 참조 번호 */}
          <div className="space-y-2">
            <Label htmlFor="reference_number">거래 참조 번호</Label>
            <Input
              id="reference_number"
              placeholder="거래번호 또는 영수증 번호"
              {...register('reference_number')}
            />
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              placeholder="추가 메모 사항..."
              rows={3}
              className="resize-none"
              {...register('notes')}
            />
          </div>

          {/* 버튼 */}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '처리 중...' : '수납 처리'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
