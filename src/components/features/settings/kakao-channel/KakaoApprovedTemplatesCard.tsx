'use client'

import { useMemo } from 'react'
import { Badge } from '@ui/badge'
import { Button } from '@ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table'
import { ChevronRight, ListChecks, Plus } from 'lucide-react'
import type { KakaoTemplate } from '@/app/actions/messaging/kakao-templates'

const SUMMARY_LIMIT = 5

const SHARED_EVENT_CATEGORY: Record<string, string> = {
  check_in: '출결',
  check_out: '출결',
  attendance_confirmed: '출결',
  absence_detected: '출결',
  homework_assigned: '숙제',
  homework_deadline: '숙제',
  monthly_report_ready: '리포트',
  weekly_report_ready: '리포트',
  consultation_scheduled: '상담',
  consultation_summary: '상담',
  payment_confirmed: '결제',
  payment_overdue: '결제',
  exam_scheduled: '시험',
  exam_grade_ready: '시험',
  retest_required: '시험',
  makeup_class_scheduled: '수업',
  class_schedule_changed: '수업',
  academy_closure_notice: '행정',
  enrollment_welcome: '행정',
  enrollment_terminated: '행정',
  book_lending_reminder: '도서',
}

function deriveCategoryLabel(template: KakaoTemplate): string {
  // 공용 템플릿 자동 등록건은 sharedTemplateId 가 있으나 event_type 은 직접 노출 안 됨.
  // template.name 의 한국어 키워드로 도메인 카테고리를 추정한다.
  const name = template.name || ''
  if (/리포트/.test(name)) return '리포트'
  if (/수업|일정 변경|보강/.test(name)) return '수업'
  if (/상담/.test(name)) return '상담'
  if (/도서|반납/.test(name)) return '도서'
  if (/퇴원|입학|환영|휴원/.test(name)) return '행정'
  if (/시험|성적|재시험/.test(name)) return '시험'
  if (/숙제/.test(name)) return '숙제'
  if (/등원|하원|출석|결석|지각/.test(name)) return '출결'
  if (/결제|미납|수강료/.test(name)) return '결제'

  // shared 이지만 매핑 못 한 경우 공용 매핑표를 조회
  for (const [eventType, label] of Object.entries(SHARED_EVENT_CATEGORY)) {
    if (template.kakaoTemplateCode === eventType) return label
  }
  return '기타'
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface KakaoApprovedTemplatesCardProps {
  templates: KakaoTemplate[]
  onManageTemplates: () => void
  onCreateTemplate: () => void
  onTemplateClick?: (template: KakaoTemplate) => void
}

export function KakaoApprovedTemplatesCard({
  templates,
  onManageTemplates,
  onCreateTemplate,
  onTemplateClick,
}: KakaoApprovedTemplatesCardProps) {
  const approved = useMemo(
    () => templates.filter((t) => t.status === 'approved'),
    [templates],
  )
  const visible = approved.slice(0, SUMMARY_LIMIT)
  const hasMore = approved.length > SUMMARY_LIMIT

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>알림톡 템플릿</CardTitle>
            <CardDescription>승인된 템플릿을 관리하고 사용할 수 있습니다.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onManageTemplates}>
              <ListChecks className="mr-1.5 h-3.5 w-3.5" />
              템플릿 관리
            </Button>
            <Button size="sm" onClick={onCreateTemplate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />새 템플릿 등록
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium">승인된 템플릿이 없습니다</p>
            <p className="mt-1 text-xs text-muted-foreground">
              새 템플릿을 등록하거나 공용 템플릿을 일괄 등록한 후 검수가 완료될 때까지 기다려 주세요.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>템플릿명</TableHead>
                    <TableHead className="hidden md:table-cell">템플릿 ID</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="hidden sm:table-cell">카테고리</TableHead>
                    <TableHead className="hidden lg:table-cell">최종 수정일</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((t) => (
                    <TableRow
                      key={t.id}
                      className={onTemplateClick ? 'cursor-pointer' : undefined}
                      onClick={onTemplateClick ? () => onTemplateClick(t) : undefined}
                    >
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                        {t.solapiTemplateId.slice(0, 12)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
                          승인 완료
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">
                        {deriveCategoryLabel(t)}
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                        {formatDate(t.updatedAt)}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {hasMore && (
              <button
                type="button"
                onClick={onManageTemplates}
                className="mt-3 flex w-full items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                전체 템플릿 보러가기
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
