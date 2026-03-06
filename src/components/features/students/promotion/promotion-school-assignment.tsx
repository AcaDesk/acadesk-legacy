'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { SchoolSelector } from '@/components/features/common/school-selector'
import { groupTransfersByCurrentSchool, type PromotionPlan } from '@/lib/promotion-utils'

interface PromotionSchoolAssignmentProps {
  plans: PromotionPlan[]
  schools: string[]
  onSchoolAssign: (studentId: string, newSchool: string) => void
}

export function PromotionSchoolAssignment({
  plans,
  schools,
  onSchoolAssign,
}: PromotionSchoolAssignmentProps) {
  const groups = groupTransfersByCurrentSchool(plans)
  const schoolKeys = Object.keys(groups)

  if (schoolKeys.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        학교 전환 학생들의 새 학교를 학생별로 지정해주세요.
      </p>

      {schoolKeys.map((currentSchool) => {
        const groupPlans = groups[currentSchool]

        return (
          <Card key={currentSchool}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {currentSchool}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({groupPlans[0]?.currentGrade} → {groupPlans[0]?.nextGrade})
                  </span>
                </CardTitle>
                <Badge variant="secondary">{groupPlans.length}명</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupPlans.map((p) => (
                <div key={p.studentId} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-24 shrink-0">{p.studentName}</span>
                  <div className="flex-1 max-w-sm">
                    <SchoolSelector
                      value={p.nextSchool || ''}
                      onChange={(value) => onSchoolAssign(p.studentId, value)}
                      schools={schools}
                      placeholder="학교 선택 또는 입력..."
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
