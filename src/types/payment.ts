// 학원비 관리 관련 타입 정의

export type InvoiceStatus = 'unpaid' | 'paid' | 'overdue' | 'partially_paid'
export type PaymentMethod = 'card' | 'transfer' | 'cash'
export type InvoiceItemType = 'tuition' | 'material' | 'extra' | 'discount'

export interface Invoice {
  id: string
  tenant_id: string
  student_id: string
  billing_month: string // Format: 'YYYY-MM'
  issue_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  status: InvoiceStatus
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface InvoiceItem {
  id: string
  tenant_id: string
  invoice_id: string
  description: string
  amount: number
  item_type: InvoiceItemType
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Payment {
  id: string
  tenant_id: string
  invoice_id: string
  payment_date: string
  paid_amount: number
  payment_method: PaymentMethod
  reference_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// 조인된 청구서 상세 정보
export interface InvoiceDetail extends Invoice {
  student_code: string
  student_name: string
  remaining_amount: number
  days_overdue: number
  items: InvoiceItem[]
  payments: Payment[]
}

// 청구서 생성 요청
export interface CreateInvoiceRequest {
  student_id: string
  billing_month: string
  issue_date: string
  due_date: string
  items: Array<{
    description: string
    amount: number
    item_type: InvoiceItemType
  }>
  notes?: string
}

// 수납 처리 요청
export interface CreatePaymentRequest {
  invoice_id: string
  payment_date: string
  paid_amount: number
  payment_method: PaymentMethod
  reference_number?: string
  notes?: string
}

// 대시보드 통계
export interface PaymentDashboardStats {
  totalBilled: number
  totalCollected: number
  totalUnpaid: number
  unpaidCount: number
  overdueCount: number
  collectionRate: number
}
