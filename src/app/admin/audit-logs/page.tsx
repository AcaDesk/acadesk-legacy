import Link from 'next/link'
import { listAuditLogs, getAuditLogFilterOptions } from '@/app/actions/admin/audit-logs'
import { AuditLogsFilters } from './audit-logs-filters'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

/** 삭제·권한·구성 변경 등 파급이 큰 액션은 강조 표시 */
const DESTRUCTIVE_ACTIONS = new Set([
  'student.delete',
  'student.bulk_delete',
  'invoice.delete',
  'user.reject',
])

function formatKst(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 플랫폼 관리자 — 감사 로그 조회
 * 인가는 admin/layout.tsx의 verifyPlatformAdmin 가드가 담당한다.
 */
export default async function AdminAuditLogsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const page = Math.max(parseInt(first(params.page) ?? '1', 10) || 1, 1)
  const action = first(params.action) || undefined
  const tenantId = first(params.tenant) || undefined

  const [logsResult, optionsResult] = await Promise.all([
    listAuditLogs({ page, action, tenantId }),
    getAuditLogFilterOptions(),
  ])

  if (!logsResult.success || !logsResult.data) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-destructive">감사 로그를 불러오지 못했습니다: {logsResult.error}</p>
      </div>
    )
  }

  const { items, total, totalPages } = logsResult.data
  const options = optionsResult.success && optionsResult.data
    ? optionsResult.data
    : { actions: [], tenants: [] }

  const pageHref = (target: number) => {
    const query = new URLSearchParams()
    if (target > 1) query.set('page', String(target))
    if (action) query.set('action', action)
    if (tenantId) query.set('tenant', tenantId)
    const qs = query.toString()
    return `/admin/audit-logs${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">감사 로그</h1>
        <p className="text-muted-foreground">
          권한·삭제·구성 변경 등 관리자 액션의 append-only 기록입니다. 총 {total.toLocaleString('ko-KR')}건
        </p>
      </div>

      <AuditLogsFilters
        actions={options.actions}
        tenants={options.tenants}
        currentAction={action}
        currentTenantId={tenantId}
      />

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">일시 (KST)</TableHead>
              <TableHead>액션</TableHead>
              <TableHead>수행자</TableHead>
              <TableHead>테넌트</TableHead>
              <TableHead>대상</TableHead>
              <TableHead>상세</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  조건에 맞는 감사 로그가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm tabular-nums">
                    {formatKst(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={DESTRUCTIVE_ACTIONS.has(log.action) ? 'destructive' : 'secondary'}
                      className="font-mono text-xs"
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.actorEmail || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {log.tenantName || (log.tenantId ? `${log.tenantId.slice(0, 8)}…` : '플랫폼')}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.targetType ? (
                      <>
                        {log.targetType}
                        {log.targetId && (
                          <span className="font-mono text-xs"> · {log.targetId.slice(0, 8)}…</span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="max-w-[320px]">
                    {Object.keys(log.details).length > 0 ? (
                      <code className="text-xs text-muted-foreground break-all line-clamp-2">
                        {JSON.stringify(log.details)}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          {page <= 1 ? (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4 mr-1" />
              이전
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={pageHref(page - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                이전
              </Link>
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page >= totalPages ? (
            <Button variant="outline" size="sm" disabled>
              다음
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={pageHref(page + 1)}>
                다음
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
