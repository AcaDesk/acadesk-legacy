'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { Checkbox } from '@ui/checkbox'
import { Alert, AlertDescription } from '@ui/alert'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { getCategoryLabel, groupByCategory, type PromotionPlan, type PromotionCategory } from '@/lib/promotion-utils'

interface PromotionReviewProps {
  plans: PromotionPlan[]
  onToggle: (studentId: string) => void
  onToggleAll: (category: PromotionCategory, selected: boolean) => void
}

const CATEGORY_BADGE_VARIANT: Record<PromotionCategory, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  normal: 'default',
  school_transfer: 'secondary',
  graduation: 'outline',
  no_grade: 'outline',
}

export function PromotionReview({ plans, onToggle, onToggleAll }: PromotionReviewProps) {
  const groups = groupByCategory(plans)
  const categories: PromotionCategory[] = ['normal', 'school_transfer', 'graduation', 'no_grade']

  // 학교 전환 학생 중 새 학교 미지정 경고
  const unassignedTransfers = groups.school_transfer.filter(
    (p) => p.selected && !p.nextSchool
  )

  const selectedCount = plans.filter((p) => p.selected).length

  return (
    <div className="space-y-4">
      {unassignedTransfers.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            학교 전환 학생 {unassignedTransfers.length}명의 새 학교가 지정되지 않았습니다.
            이전 단계에서 학교를 지정해주세요.
          </AlertDescription>
        </Alert>
      )}

      <p className="text-sm text-muted-foreground">
        총 {plans.length}명 중 <strong>{selectedCount}명</strong>이 선택되었습니다.
        체크박스로 개별 선택/해제할 수 있습니다.
      </p>

      {categories.map((category) => {
        const categoryPlans = groups[category]
        if (categoryPlans.length === 0) return null

        const selectedInCategory = categoryPlans.filter((p) => p.selected).length
        const allSelected = selectedInCategory === categoryPlans.length

        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onToggleAll(category, !!checked)}
                />
                <CardTitle className="text-base flex items-center gap-2">
                  {getCategoryLabel(category)}
                  <Badge variant={CATEGORY_BADGE_VARIANT[category]}>
                    {selectedInCategory}/{categoryPlans.length}명
                  </Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {categoryPlans.map((plan) => (
                  <div key={plan.studentId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <Checkbox
                      checked={plan.selected}
                      onCheckedChange={() => onToggle(plan.studentId)}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{plan.studentName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                      <span>{plan.currentGrade || '-'}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className={plan.nextGrade ? 'text-foreground font-medium' : ''}>
                        {plan.nextGrade || '-'}
                      </span>
                    </div>
                    {(plan.currentSchool !== plan.nextSchool) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                        <span className="truncate max-w-24">{plan.currentSchool || '-'}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className={`truncate max-w-24 ${plan.nextSchool ? 'text-foreground font-medium' : 'text-destructive'}`}>
                          {plan.nextSchool || '미지정'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
