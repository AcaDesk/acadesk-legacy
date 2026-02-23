'use client'

import { Alert, AlertDescription, AlertTitle } from '@ui/alert'
import { AlertTriangle, XCircle, Info } from 'lucide-react'
import type { BatchValidationItem } from '@/core/types/batch.types'

interface RiskAlertListProps {
  risks: BatchValidationItem[]
}

const ICON_MAP = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
} as const

const VARIANT_MAP = {
  error: 'destructive' as const,
  warning: 'default' as const,
  info: 'default' as const,
}

export function RiskAlertList({ risks }: RiskAlertListProps) {
  if (risks.length === 0) return null

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold">리스크 확인</h4>
      {risks.map((risk, i) => {
        const Icon = ICON_MAP[risk.level]
        return (
          <Alert key={i} variant={VARIANT_MAP[risk.level]}>
            <Icon className="h-4 w-4" />
            <AlertTitle className="text-sm">
              {risk.blocking ? '[차단] ' : ''}
              {risk.code}
            </AlertTitle>
            <AlertDescription className="text-sm">{risk.message}</AlertDescription>
          </Alert>
        )
      })}
    </div>
  )
}
