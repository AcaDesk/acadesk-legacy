'use client'

import { Card, CardContent } from '@ui/card'
import { Badge } from '@ui/badge'
import { Users, ArrowRightLeft, GraduationCap, AlertCircle } from 'lucide-react'
import type { PromotionPlan, PromotionCategory } from '@/lib/promotion-utils'
import { groupByCategory, getCategoryLabel } from '@/lib/promotion-utils'

interface PromotionScanResultProps {
  plans: PromotionPlan[]
}

const CATEGORY_CONFIG: Record<PromotionCategory, {
  icon: React.ElementType
  color: string
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
}> = {
  normal: { icon: Users, color: 'text-blue-600 dark:text-blue-400', badgeVariant: 'default' },
  school_transfer: { icon: ArrowRightLeft, color: 'text-amber-600 dark:text-amber-400', badgeVariant: 'secondary' },
  graduation: { icon: GraduationCap, color: 'text-green-600 dark:text-green-400', badgeVariant: 'outline' },
  no_grade: { icon: AlertCircle, color: 'text-muted-foreground', badgeVariant: 'outline' },
}

export function PromotionScanResult({ plans }: PromotionScanResultProps) {
  const groups = groupByCategory(plans)
  const categories: PromotionCategory[] = ['normal', 'school_transfer', 'graduation', 'no_grade']

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {categories.map((category) => {
        const config = CATEGORY_CONFIG[category]
        const Icon = config.icon
        const count = groups[category].length

        return (
          <Card key={category}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 bg-muted ${config.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{getCategoryLabel(category)}</p>
                  <p className="text-2xl font-bold">{count}명</p>
                </div>
                {count > 0 && (
                  <Badge variant={config.badgeVariant}>{count}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
