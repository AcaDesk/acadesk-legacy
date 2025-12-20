'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TemplateChip } from './template-chip'
import type { CategoryTemplates, ReportContextData } from '@/core/types/report-template.types'

interface TemplateSectionProps {
  categoryData: CategoryTemplates
  context: ReportContextData
  onSelect: (content: string) => void
}

/**
 * 템플릿 섹션 컴포넌트
 *
 * 추천 템플릿 + 전체 템플릿을 표시
 * 추천 템플릿은 상단에, 나머지는 접힌 상태로 표시
 */
export function TemplateSection({
  categoryData,
  context,
  onSelect,
}: TemplateSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const { recommendedTemplates, templates } = categoryData

  // 추천되지 않은 템플릿
  const nonRecommendedTemplates = templates.filter(
    (t) => !recommendedTemplates.some((r) => r.id === t.id)
  )

  // 템플릿이 하나도 없으면 렌더링하지 않음
  if (templates.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 mb-3">
      {/* 추천 템플릿 */}
      {recommendedTemplates.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" />
            추천 문구
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recommendedTemplates.map((template) => (
              <TemplateChip
                key={template.id}
                template={template}
                context={context}
                onClick={onSelect}
                isRecommended
              />
            ))}
          </div>
        </div>
      )}

      {/* 전체 템플릿 토글 */}
      {nonRecommendedTemplates.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'text-xs text-muted-foreground hover:text-foreground transition-colors',
              'flex items-center gap-1'
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {recommendedTemplates.length > 0
              ? `다른 템플릿 (${nonRecommendedTemplates.length}개)`
              : `템플릿 선택 (${nonRecommendedTemplates.length}개)`}
          </button>

          {isExpanded && (
            <div className="flex flex-wrap gap-1.5 mt-1.5 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              {nonRecommendedTemplates.map((template) => (
                <TemplateChip
                  key={template.id}
                  template={template}
                  context={context}
                  onClick={onSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 추천도 없고 다른 템플릿도 없으면 빈 상태 */}
      {recommendedTemplates.length === 0 && nonRecommendedTemplates.length === 0 && (
        <p className="text-xs text-muted-foreground">등록된 템플릿이 없습니다.</p>
      )}
    </div>
  )
}
