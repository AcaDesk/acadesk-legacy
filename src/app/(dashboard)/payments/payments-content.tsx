'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/tabs'
import { Button } from '@ui/button'
import {
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign,
  Bell,
} from 'lucide-react'
import { PaymentList } from '@/components/features/payments/payment-list'
import { ProcessPaymentDialog } from '@/components/features/payments/process-payment-dialog'
import { CreateInvoicesDialog } from '@/components/features/payments/create-invoices-dialog'
import { PaymentHistoryList } from '@/components/features/payments/payment-history-list'
import { PaymentReminderDialog } from '@/components/features/payments/payment-reminder-dialog'
import { PageWrapper } from "@/components/layout/page-wrapper"
import { PageErrorBoundary, SectionErrorBoundary } from '@/components/layout/page-error-boundary'

interface PaymentsContentProps {
  initialStats: {
    totalBilled: number
    totalCollected: number
    totalUnpaid: number
    unpaidCount: number
    overdueCount: number
    collectionRate: number
  }
}

export function PaymentsContent({ initialStats }: PaymentsContentProps) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [createInvoicesDialogOpen, setCreateInvoicesDialogOpen] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('')
  const [, setRefreshKey] = useState(0)
  const [selectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const handlePaymentSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleInvoicesCreated = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleReminderSent = () => {
    setRefreshKey(prev => prev + 1)
  }

  const stats = initialStats

  return (
    <PageErrorBoundary pageName="학원비 관리">
      <PageWrapper>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">학원비 관리</h1>
              <p className="text-muted-foreground">
                월별 청구, 수납 현황 및 미납 관리를 한 곳에서 처리하세요
              </p>
            </div>
          {stats.unpaidCount > 0 && (
            <Button onClick={() => setReminderDialogOpen(true)}>
              <Bell className="h-4 w-4 mr-2" />
              미납자 알림 발송
            </Button>
          )}
        </div>

        {/* KPI Cards */}
        <SectionErrorBoundary sectionName="재무 통계">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                이번 달 총 청구액
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalBilled.toLocaleString()}원
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedMonth}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                수납 완료
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {stats.totalCollected.toLocaleString()}원
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                수납률 {stats.collectionRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                미납 금액
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.totalUnpaid.toLocaleString()}원
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.unpaidCount}명 미납
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                연체
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.overdueCount}명
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                납부 기한 초과
              </p>
            </CardContent>
          </Card>
        </div>
        </SectionErrorBoundary>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">
              <CreditCard className="h-4 w-4 mr-2" />
              수납 현황
            </TabsTrigger>
            <TabsTrigger value="billing">
              <FileText className="h-4 w-4 mr-2" />
              월별 청구
            </TabsTrigger>
            <TabsTrigger value="history">
              <DollarSign className="h-4 w-4 mr-2" />
              수납 내역
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <SectionErrorBoundary sectionName="수납 현황">
              <Card>
                <CardHeader>
                  <CardTitle>수납 현황 대시보드</CardTitle>
                  <CardDescription>
                    학생별 청구 내역 및 납부 상태를 확인하고 수납 처리를 진행하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentList
                    month={selectedMonth}
                    onPaymentClick={(invoiceId) => {
                      setSelectedInvoiceId(invoiceId)
                      setPaymentDialogOpen(true)
                    }}
                  />
                </CardContent>
              </Card>
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <SectionErrorBoundary sectionName="월별 청구">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>월별 청구서 생성</CardTitle>
                      <CardDescription>
                        매월 초, 수강 중인 학생들에게 학원비를 일괄 청구하세요
                      </CardDescription>
                    </div>
                    <Button onClick={() => setCreateInvoicesDialogOpen(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      청구서 생성
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <CheckCircle className="h-4 w-4" />
                        자동 계산
                      </div>
                      <p className="text-xs text-muted-foreground">
                        수강 중인 수업 수에 따라 자동으로 학원비가 계산됩니다
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <CheckCircle className="h-4 w-4" />
                        개별 조정
                      </div>
                      <p className="text-xs text-muted-foreground">
                        학생별로 청구 금액을 개별적으로 조정할 수 있습니다
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <CheckCircle className="h-4 w-4" />
                        일괄 처리
                      </div>
                      <p className="text-xs text-muted-foreground">
                        한 번의 클릭으로 모든 학생에게 청구서를 생성합니다
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-6 bg-muted/50">
                    <h3 className="font-semibold mb-2">청구서 생성 가이드</h3>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>청구 연월과 납부 기한을 설정합니다</li>
                      <li>기본 수강료(수업당 금액)를 입력합니다</li>
                      <li>청구할 학생을 선택하고 필요시 개별 금액을 조정합니다</li>
                      <li>&quot;청구서 생성&quot; 버튼을 클릭하여 일괄 생성합니다</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
            </SectionErrorBoundary>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <SectionErrorBoundary sectionName="수납 내역">
              <Card>
                <CardHeader>
                  <CardTitle>수납 내역</CardTitle>
                  <CardDescription>
                    모든 수납 기록을 조회하고 영수증을 발급하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentHistoryList month={selectedMonth} />
                </CardContent>
              </Card>
            </SectionErrorBoundary>
          </TabsContent>
        </Tabs>

        {/* Payment Dialog */}
        <ProcessPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          invoiceId={selectedInvoiceId}
          invoiceDetails={
            selectedInvoiceId
              ? {
                  student_name: '김철수',
                  billing_month: selectedMonth,
                  total_amount: 500000,
                  paid_amount: 0,
                  remaining_amount: 500000,
                }
              : undefined
          }
          onSuccess={handlePaymentSuccess}
        />

        {/* Create Invoices Dialog */}
        <CreateInvoicesDialog
          open={createInvoicesDialogOpen}
          onOpenChange={setCreateInvoicesDialogOpen}
          onSuccess={handleInvoicesCreated}
        />

        {/* Payment Reminder Dialog */}
        <PaymentReminderDialog
          open={reminderDialogOpen}
          onOpenChange={setReminderDialogOpen}
          month={selectedMonth}
          onSuccess={handleReminderSent}
        />
      </div>
    </PageWrapper>
    </PageErrorBoundary>
  )
}
