'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@ui/card'
import { Badge } from '@ui/badge'
import { SchoolSelector } from '@/components/features/common/school-selector'
import { groupTransfersByCurrentSchool, type PromotionPlan } from '@/lib/promotion-utils'

interface PromotionSchoolAssignmentProps {
  plans: PromotionPlan[]
  schools: string[]
  onSchoolAssign: (currentSchool: string, newSchool: string) => void
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
        학교 전환 학생들의 새 학교를 지정해주세요. 같은 학교 출신 학생들을 그룹으로 묶어 표시합니다.
      </p>

      {schoolKeys.map((currentSchool) => {
        const groupPlans = groups[currentSchool]
        // 그룹 내 첫 학생의 nextSchool을 기준으로 현재 선택값 표시
        const currentAssignment = groupPlans[0]?.nextSchool || ''

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
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {groupPlans.map((p) => (
                  <Badge key={p.studentId} variant="outline">{p.studentName}</Badge>
                ))}
              </div>
              <div className="max-w-sm">
                <label className="text-sm font-medium mb-1.5 block">새 학교</label>
                <SchoolSelector
                  value={currentAssignment}
                  onChange={(value) => onSchoolAssign(currentSchool, value)}
                  schools={schools}
                  placeholder="학교 선택 또는 입력..."
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
