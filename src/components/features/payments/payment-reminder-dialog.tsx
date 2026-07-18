'use client'

import { useEffect, useState } from 'react'
import { Button } from '@ui/button'
import { Label } from '@ui/label'
import { Checkbox } from '@ui/checkbox'
import { Badge } from '@ui/badge'
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
import { AlertCircle, Bell, Loader2 } from 'lucide-react'
import { useInvoicesQuery } from '@/hooks/queries/use-payments-query'
import { useSendRemindersMutation } from '@/hooks/mutations/use-payments-mutations'

interface UnpaidInvoiceRow {
  id: string
  student_code: string
  student_name: string
  billing_month: string
  remaining_amount: number
  days_overdue: number
  selected: boolean
}

interface PaymentReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 호환용 — 미납 안내는 월과 무관하게 전체 미납 청구서를 대상으로 한다 */
  month?: string
}

function daysOverdue(dueDate: string): number {
  const diff = Date.now() - new Date(dueDate).getTime()
  return Math.max(Math.floor(diff / 86_400_000), 0)
}

/**
 * 미납자 알림 발송 다이얼로그
 *
 * 승인된 카카오 알림톡 템플릿(payment_overdue)으로 발송한다.
 * 자유 메시지 편집은 알림톡 사전 승인 체계와 맞지 않아 제공하지 않는다.
 */
export function PaymentReminderDialog({
  open,
  onOpenChange,
}: PaymentReminderDialogProps) {
  const [rows, setRows] = useState<UnpaidInvoiceRow[]>([])

  const unpaidQuery = useInvoicesQuery({
    unpaidOnly: true,
    page: 1,
    pageSize: 100,
  })
  const sendRemindersMutation = useSendRemindersMutation()
  const loading = unpaidQuery.isPending
  const sending = sendRemindersMutation.isPending

  useEffect(() => {
    if (!open || !unpaidQuery.data) return
    setRows(
      unpaidQuery.data.items.map((invoice) => ({
        id: invoice.id,
        student_code: invoice.student_code,
        student_name: invoice.student_name,
        billing_month: invoice.billing_month,
        remaining_amount: invoice.remaining_amount,
        days_overdue: invoice.status === 'overdue' ? daysOverdue(invoice.due_date) : 0,
        selected: true,
      }))
    )
  }, [open, unpaidQuery.data])

  function toggleRow(invoiceId: string) {
    setRows(rows.map((r) => (r.id === invoiceId ? { ...r, selected: !r.selected } : r)))
  }

  function toggleAll() {
    const allSelected = rows.every((r) => r.selected)
    setRows(rows.map((r) => ({ ...r, selected: !allSelected })))
  }

  const selectedRows = rows.filter((r) => r.selected)
  const selectedCount = selectedRows.length
  const totalAmount = selectedRows.reduce((sum, r) => sum + r.remaining_amount, 0)

  function handleSend() {
    if (selectedCount === 0) return
    sendRemindersMutation.mutate(
      selectedRows.map((r) => r.id),
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>미납자 알림 발송</DialogTitle>
          <DialogDescription>
            승인된 카카오 알림톡 템플릿(미납 안내)으로 보호자에게 발송됩니다.
            보호자 연락처가 없는 학생은 자동으로 제외됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Student List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>발송 대상 선택</Label>
              <Badge variant="secondary">
                {selectedCount}건 선택 / 총 {rows.length}건
              </Badge>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                미납 청구서를 불러오는 중...
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                미납 청구서가 없습니다
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={rows.length > 0 && rows.every((r) => r.selected)}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>학생</TableHead>
                      <TableHead>청구월</TableHead>
                      <TableHead className="text-right">미납액</TableHead>
                      <TableHead className="text-center">연체일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Checkbox
                            checked={row.selected}
                            onCheckedChange={() => toggleRow(row.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{row.student_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {row.student_code}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{row.billing_month}</TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {row.remaining_amount.toLocaleString()}원
                        </TableCell>
                        <TableCell className="text-center">
                          {row.days_overdue > 0 ? (
                            <Badge variant="destructive">{row.days_overdue}일</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedCount > 0 && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">선택된 청구서:</span>
                <span className="font-medium">{selectedCount}건</span>
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
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={sending || selectedCount === 0}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  발송 중...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  알림톡 발송 ({selectedCount}건)
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
