'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/dialog'
import { Button } from '@ui/button'
import { Separator } from '@ui/separator'
import { Download, Printer, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentId: string
  paymentDetails?: {
    receipt_number: string
    student_name: string
    student_code: string
    payment_date: string
    billing_month: string
    paid_amount: number
    payment_method: string
    reference_number: string | null
    academy_name: string
    academy_registration_number: string
    academy_address: string
    academy_phone: string
  }
}

export function ReceiptDialog({
  open,
  onOpenChange,
  paymentId: _paymentId,
  paymentDetails,
}: ReceiptDialogProps) {
  const [downloading, setDownloading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [emailing, setEmailing] = useState(false)
  const { toast } = useToast()

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      // TODO: Implement PDF generation and download
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: '영수증 다운로드 완료',
        description: 'PDF 파일이 다운로드되었습니다.',
      })
    } catch {
      toast({
        title: '다운로드 실패',
        description: '영수증 다운로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    try {
      // TODO: Implement print functionality
      await new Promise((resolve) => setTimeout(resolve, 500))
      window.print()
    } catch {
      toast({
        title: '인쇄 실패',
        description: '영수증 인쇄 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setPrinting(false)
    }
  }

  const handleEmailSend = async () => {
    setEmailing(true)
    try {
      // TODO: Implement email sending
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: '이메일 발송 완료',
        description: '학부모에게 영수증이 발송되었습니다.',
      })
      onOpenChange(false)
    } catch {
      toast({
        title: '이메일 발송 실패',
        description: '영수증 발송 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setEmailing(false)
    }
  }

  if (!paymentDetails) return null

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'card':
        return '카드 결제'
      case 'transfer':
        return '계좌이체'
      case 'cash':
        return '현금'
      default:
        return method
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>영수증</DialogTitle>
          <DialogDescription>
            수납 영수증을 출력하거나 학부모에게 발송할 수 있습니다
          </DialogDescription>
        </DialogHeader>

        {/* Receipt Content */}
        <div className="border rounded-lg p-6 bg-white space-y-6" id="receipt-content">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">{paymentDetails.academy_name}</h2>
            <p className="text-sm text-muted-foreground">
              사업자등록번호: {paymentDetails.academy_registration_number}
            </p>
            <p className="text-sm text-muted-foreground">
              {paymentDetails.academy_address}
            </p>
            <p className="text-sm text-muted-foreground">
              Tel: {paymentDetails.academy_phone}
            </p>
          </div>

          <Separator />

          {/* Receipt Info */}
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">수 납 영 수 증</h3>
            <p className="text-sm text-muted-foreground">
              영수증 번호: {paymentDetails.receipt_number}
            </p>
          </div>

          <Separator />

          {/* Student & Payment Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">학생명</p>
                <p className="font-medium">{paymentDetails.student_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">학번</p>
                <p className="font-medium">{paymentDetails.student_code}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">청구월</p>
                <p className="font-medium">{paymentDetails.billing_month}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">수납일</p>
                <p className="font-medium">
                  {new Date(paymentDetails.payment_date).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">결제 방법</p>
                <p className="font-medium">
                  {getPaymentMethodText(paymentDetails.payment_method)}
                </p>
              </div>
              {paymentDetails.reference_number && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">거래 번호</p>
                  <p className="font-medium font-mono text-sm">
                    {paymentDetails.reference_number}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Amount */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">수납 금액</span>
              <span className="text-2xl font-bold text-green-600">
                {paymentDetails.paid_amount.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>위 금액을 정히 영수하였습니다.</p>
            <p className="mt-4">
              발행일: {new Date().toLocaleDateString('ko-KR')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={printing || downloading || emailing}
          >
            {printing ? (
              '인쇄 중...'
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                인쇄
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={printing || downloading || emailing}
          >
            {downloading ? (
              '다운로드 중...'
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                PDF 다운로드
              </>
            )}
          </Button>
          <Button
            onClick={handleEmailSend}
            disabled={printing || downloading || emailing}
          >
            {emailing ? (
              '발송 중...'
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                학부모에게 발송
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
