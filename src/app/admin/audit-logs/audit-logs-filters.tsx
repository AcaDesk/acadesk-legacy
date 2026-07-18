'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/select'
import { Button } from '@ui/button'
import { X } from 'lucide-react'

const ALL = '__all__'

interface AuditLogsFiltersProps {
  actions: string[]
  tenants: Array<{ id: string; name: string }>
  currentAction?: string
  currentTenantId?: string
}

/**
 * 감사 로그 필터 바 — 선택 시 URL 쿼리로 반영해 서버 컴포넌트가 다시 조회한다.
 * 필터 변경 시 page는 1로 리셋한다.
 */
export function AuditLogsFilters({
  actions,
  tenants,
  currentAction,
  currentTenantId,
}: AuditLogsFiltersProps) {
  const router = useRouter()

  const navigate = (action?: string, tenantId?: string) => {
    const query = new URLSearchParams()
    if (action) query.set('action', action)
    if (tenantId) query.set('tenant', tenantId)
    const qs = query.toString()
    router.push(`/admin/audit-logs${qs ? `?${qs}` : ''}`)
  }

  const hasFilter = Boolean(currentAction || currentTenantId)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={currentAction ?? ALL}
        onValueChange={(value) => navigate(value === ALL ? undefined : value, currentTenantId)}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="액션 전체" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>액션 전체</SelectItem>
          {actions.map((action) => (
            <SelectItem key={action} value={action}>
              {action}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentTenantId ?? ALL}
        onValueChange={(value) => navigate(currentAction, value === ALL ? undefined : value)}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="테넌트 전체" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>테넌트 전체</SelectItem>
          {tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={() => navigate(undefined, undefined)}>
          <X className="h-4 w-4 mr-1" />
          필터 초기화
        </Button>
      )}
    </div>
  )
}
