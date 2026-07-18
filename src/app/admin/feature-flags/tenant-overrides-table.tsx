'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { Input } from '@ui/input'
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
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  setTenantFeatureFlag,
  type TenantFeatureOverrideRow,
} from '@/app/actions/admin/feature-flags'
import { FEATURES, type FeatureKey, type FeatureStatus } from '@/lib/features.config'

const STATUS_LABELS: Record<FeatureStatus, string> = {
  active: 'Active',
  beta: 'Beta',
  inactive: 'Inactive',
  maintenance: 'Maintenance',
  deprecated: 'Deprecated',
}

const STATUS_BADGE_VARIANT: Record<FeatureStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  beta: 'secondary',
  inactive: 'outline',
  maintenance: 'destructive',
  deprecated: 'outline',
}

interface TenantOverridesTableProps {
  rows: TenantFeatureOverrideRow[]
  tenants: Array<{ id: string; name: string }>
}

export function TenantOverridesTable({ rows, tenants }: TenantOverridesTableProps) {
  const router = useRouter()
  const { toast } = useToast()

  // 추가 폼 상태
  const [newTenantId, setNewTenantId] = useState('')
  const [newFeatureKey, setNewFeatureKey] = useState('')
  const [newStatus, setNewStatus] = useState<FeatureStatus | ''>('')
  const [newNotes, setNewNotes] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleAdd() {
    if (!newTenantId || !newFeatureKey || !newStatus) {
      toast({ variant: 'destructive', title: '테넌트, 기능, 상태를 모두 선택해주세요' })
      return
    }
    setIsAdding(true)
    try {
      const result = await setTenantFeatureFlag({
        tenantId: newTenantId,
        featureKey: newFeatureKey,
        status: newStatus,
        notes: newNotes.trim() || undefined,
      })
      if (!result.success) throw new Error(result.error || '설정 실패')
      toast({ title: '테넌트 오버라이드 설정 완료', description: '약 60초 내 서버에 반영됩니다.' })
      setNewTenantId('')
      setNewFeatureKey('')
      setNewStatus('')
      setNewNotes('')
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오버라이드 설정 오류',
        description: error instanceof Error ? error.message : '설정에 실패했습니다',
      })
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRemove(row: TenantFeatureOverrideRow) {
    setRemovingId(row.id)
    try {
      const result = await setTenantFeatureFlag({
        tenantId: row.tenantId,
        featureKey: row.featureKey,
        status: null,
      })
      if (!result.success) throw new Error(result.error || '제거 실패')
      toast({ title: '오버라이드 제거 완료', description: '전역/기본값 상태로 복귀합니다.' })
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오버라이드 제거 오류',
        description: error instanceof Error ? error.message : '제거에 실패했습니다',
      })
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* 추가 폼 */}
      <div className="flex flex-wrap items-center gap-2 p-4 border rounded-lg bg-muted/30">
        <Select value={newTenantId} onValueChange={setNewTenantId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="테넌트 선택" />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={newFeatureKey} onValueChange={setNewFeatureKey}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="기능 선택" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FEATURES) as FeatureKey[]).map((key) => (
              <SelectItem key={key} value={key}>
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={newStatus} onValueChange={(v) => setNewStatus(v as FeatureStatus)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="상태 선택" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABELS) as FeatureStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          placeholder="메모 (선택)"
          maxLength={300}
          className="w-[200px]"
        />

        <Button onClick={handleAdd} disabled={isAdding} className="gap-1.5">
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          설정
        </Button>
      </div>

      {/* 현황 테이블 */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>테넌트</TableHead>
              <TableHead>기능 키</TableHead>
              <TableHead>오버라이드 상태</TableHead>
              <TableHead>메모</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                  테넌트별 오버라이드가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.tenantName}</TableCell>
                  <TableCell className="font-mono text-sm">{row.featureKey}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[row.status]}>
                      {STATUS_LABELS[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate">
                    {row.notes || '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(row)}
                      disabled={removingId === row.id}
                    >
                      {removingId === row.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <p className="px-4 py-3 text-xs text-muted-foreground border-t">
          💡 우선순위: 테넌트별 &gt; 전역 &gt; 코드 기본값. 특정 학원에만 beta 기능을 열어주거나
          문제가 있는 학원만 잠글 때 사용합니다.
        </p>
      </div>
    </div>
  )
}
