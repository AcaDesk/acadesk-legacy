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
import { setGlobalFeatureFlag, type FeatureFlagRow } from '@/app/actions/admin/feature-flags'
import type { FeatureStatus } from '@/lib/features.config'

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

/** 오버라이드 제거(기본값 복귀)를 나타내는 셀렉트 값 */
const USE_DEFAULT = '__default__'

interface FeatureFlagsTableProps {
  rows: FeatureFlagRow[]
}

export function FeatureFlagsTable({ rows }: FeatureFlagsTableProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [savingKey, setSavingKey] = useState<string | null>(null)

  async function handleChange(featureKey: string, value: string) {
    setSavingKey(featureKey)
    try {
      const result = await setGlobalFeatureFlag({
        featureKey,
        status: value === USE_DEFAULT ? null : (value as FeatureStatus),
      })
      if (!result.success) throw new Error(result.error || '변경 실패')
      toast({ title: '플래그 변경 완료', description: '약 60초 내 서버에 반영됩니다.' })
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '플래그 변경 오류',
        description: error instanceof Error ? error.message : '변경에 실패했습니다',
      })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>기능 키</TableHead>
            <TableHead>코드 기본값</TableHead>
            <TableHead>유효 상태</TableHead>
            <TableHead className="w-[220px]">전역 오버라이드</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="font-mono text-sm">{row.key}</TableCell>
              <TableCell>
                <Badge variant="outline">{STATUS_LABELS[row.defaultStatus]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_BADGE_VARIANT[row.effectiveStatus]}>
                  {STATUS_LABELS[row.effectiveStatus]}
                </Badge>
                {row.globalOverride && (
                  <span className="ml-2 text-xs text-muted-foreground">(오버라이드)</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Select
                    value={row.globalOverride ?? USE_DEFAULT}
                    onValueChange={(value) => handleChange(row.key, value)}
                    disabled={savingKey === row.key}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={USE_DEFAULT}>기본값 사용</SelectItem>
                      {(Object.keys(STATUS_LABELS) as FeatureStatus[]).map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {savingKey === row.key && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="px-4 py-3 text-xs text-muted-foreground border-t">
        💡 Maintenance로 변경하면 해당 기능 페이지가 점검 화면으로 전환됩니다 (킬스위치).
        클라이언트 내비게이션 노출은 코드 기본값을 따르므로 완전 숨김은 배포가 필요합니다.
      </p>
    </div>
  )
}
