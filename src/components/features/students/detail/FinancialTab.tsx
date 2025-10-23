'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@ui/accordion'
import { format as formatDate } from 'date-fns'
import { ko } from 'date-fns/locale'
import { CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { useStudentDetail } from '@/hooks/use-student-detail'
import { EmptyState } from '@ui/empty-state'

export function FinancialTab() {
  const { invoices } = useStudentDetail()
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            완납
          </Badge>
        )
      case 'overdue':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            연체
          </Badge>
        )
      case 'partial':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            부분납부
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            미납
          </Badge>
        )
    }
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()}원`
  }

  return (
    <div className="space-y-4">
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={CreditCard}
              title="청구 내역이 없습니다"
              description="아직 발행된 청구서가 없습니다"
            />
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {invoices.map((invoice) => {
            const unpaidAmount = invoice.total_amount - invoice.paid_amount

            return (
              <AccordionItem
                key={invoice.id}
                value={invoice.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div className="text-left">
                        <p className="font-semibold">{invoice.billing_month}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(new Date(invoice.issue_date), 'yyyy.MM.dd 발행', {
                            locale: ko,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                        {unpaidAmount > 0 && (
                          <p className="text-xs text-destructive">
                            미납: {formatCurrency(unpaidAmount)}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(invoice.status)}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {/* 청구 항목 */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">청구 항목</h4>
                      <div className="space-y-2">
                        {invoice.invoice_items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center p-2 rounded bg-muted/50"
                          >
                            <div>
                              <p className="text-sm font-medium">{item.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.item_type === 'tuition' && '수업료'}
                                {item.item_type === 'material' && '교재비'}
                                {item.item_type === 'extra' && '기타'}
                              </p>
                            </div>
                            <span className="font-semibold">
                              {formatCurrency(item.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 납부 내역 */}
                    {invoice.payments && invoice.payments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">납부 내역</h4>
                        <div className="space-y-2">
                          {invoice.payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex justify-between items-center p-2 rounded bg-muted/50"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {formatDate(
                                    new Date(payment.payment_date),
                                    'yyyy.MM.dd',
                                    { locale: ko }
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {payment.payment_method}
                                  {payment.reference_number &&
                                    ` · ${payment.reference_number}`}
                                </p>
                              </div>
                              <span className="font-semibold">
                                {formatCurrency(payment.paid_amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 메모 */}
                    {invoice.notes && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">메모</h4>
                        <p className="text-sm text-muted-foreground p-2 rounded bg-muted/50">
                          {invoice.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}
