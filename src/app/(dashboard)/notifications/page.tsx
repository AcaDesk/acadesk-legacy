import { FEATURES } from '@/lib/features.config'
import { ComingSoon } from '@/components/layout/coming-soon'
import { Maintenance } from '@/components/layout/maintenance'
import { verifyStaff } from '@/lib/auth/verify-permission'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getMessagingBalance } from '@/app/actions/messaging-config'
import { NotificationsContent } from './notifications-content'

interface NotificationLog {
  id: string
  student_id: string
  notification_type: string
  status: string
  message: string
  sent_at: string
  error_message: string | null
  students: {
    student_code: string
    users: {
      name: string
      phone: string | null
    } | null
  } | null
}

interface BalanceInfo {
  balance: number
  currency: string
  provider: string
}

export default async function NotificationsPage() {
  // Feature flag checks
  const featureStatus = FEATURES.notificationSystem;

  if (featureStatus === 'inactive') {
    return <ComingSoon featureName="알림 시스템" description="SMS와 이메일을 통한 자동 알림 발송, 알림 스케줄 관리 등의 기능을 준비하고 있습니다." />;
  }

  if (featureStatus === 'maintenance') {
    return <Maintenance featureName="알림 시스템" reason="알림 발송 시스템 업데이트가 진행 중입니다." />;
  }

  // Verify staff access and get tenant
  const { tenantId } = await verifyStaff()
  const supabase = createServiceRoleClient()

  // Fetch notification logs
  const { data: logsData } = await supabase
    .from('notification_logs')
    .select(`
      id,
      student_id,
      notification_type,
      status,
      message,
      sent_at,
      error_message,
      students (
        student_code,
        users (name, phone)
      )
    `)
    .eq('tenant_id', tenantId)
    .order('sent_at', { ascending: false })
    .limit(50)

  const logs: NotificationLog[] = (logsData || []) as unknown as NotificationLog[]

  // Fetch balance
  let balance: BalanceInfo | null = null
  try {
    const balanceResult = await getMessagingBalance()
    if (balanceResult.success && balanceResult.data) {
      balance = balanceResult.data
    }
  } catch (error) {
    console.error('Error loading balance:', error)
  }

  return <NotificationsContent initialLogs={logs} initialBalance={balance} tenantId={tenantId} />
}
