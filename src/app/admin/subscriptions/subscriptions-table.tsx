'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  setTenantPlan,
  type SaasPlanOption,
  type TenantSubscriptionRow,
} from '@/app/actions/admin/subscriptions'

interface SubscriptionsTableProps {
  rows: TenantSubscriptionRow[]
  plans: SaasPlanOption[]
}

export function SubscriptionsTable({ rows, plans }: SubscriptionsTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [savingTenantId, setSavingTenantId] = useState<string | null>(null)

  async function handlePlanChange(tenantId: string, planCode: string) {
    setSavingTenantId(tenantId)
    try {
      const result = await setTenantPlan({ tenantId, planCode })
      if (!result.success) throw new Error(result.error || '플랜 변경 실패')
      toast({ title: '플랜 변경 완료' })
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '플랜 변경 오류',
        description: error instanceof Error ? error.message : '플랜 변경에 실패했습니다',
      })
    } finally {
      setSavingTenantId(null)
    }
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>학원</TableHead>
            <TableHead>플랜</TableHead>
            <TableHead className="text-right">학생 수 / 한도</TableHead>
            <TableHead>만료일</TableHead>
            <TableHead>메모</TableHead>
            <TableHead className="w-[200px]">플랜 변경</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const overLimit =
              row.maxStudents !== null && row.studentCount > row.maxStudents
            return (
              <TableRow key={row.tenantId}>
                <TableCell className="font-medium">{row.tenantName}</TableCell>
                <TableCell>
                  <Badge variant={row.planCode === 'unlimited' ? 'secondary' : 'default'}>
                    {row.planLabel}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className={overLimit ? 'text-destructive font-semibold' : ''}>
                    {row.studentCount}
                  </span>
                  {' / '}
                  {row.maxStudents === null ? '무제한' : `${row.maxStudents}명`}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.currentPeriodEnd ?? '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                  {row.notes ?? '-'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={row.planCode}
                      onValueChange={(value) => handlePlanChange(row.tenantId, value)}
                      disabled={savingTenantId === row.tenantId}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.code} value={plan.code}>
                            {plan.label}
                            {plan.maxStudents !== null && ` (${plan.maxStudents}명)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {savingTenantId === row.tenantId && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {rows.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">등록된 테넌트가 없습니다</div>
      )}
      <p className="px-4 py-3 text-xs text-muted-foreground border-t">
        ⚠️ 한도 초과(빨간 숫자) 테넌트는 신규 학생 등록이 차단됩니다. 기존 학생은 영향받지
        않습니다.
      </p>
    </div>
  )
}
