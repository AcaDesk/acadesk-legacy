'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReportTemplate, ReportContextData } from '@/core/types/report-template.types'
import { replaceTemplateVariables } from '@/app/actions/report-templates'

interface TemplateChipProps {
  template: ReportTemplate
  context: ReportContextData
  onClick: (content: string) => void
  isRecommended?: boolean
}

/**
 * 템플릿 칩 컴포넌트
 *
 * 클릭하면 변수가 치환된 템플릿 내용을 onClick 콜백으로 전달
 */
export function TemplateChip({
  template,
  context,
  onClick,
  isRecommended = false,
}: TemplateChipProps) {
  const handleClick = () => {
    const processedContent = replaceTemplateVariables(template.content, context)
    onClick(processedContent)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all',
        'hover:scale-105 active:scale-95',
        isRecommended
          ? 'bg-primary/10 border-primary/50 text-primary hover:bg-primary/20 hover:border-primary'
          : 'bg-muted/50 border-border hover:bg-muted hover:border-muted-foreground/30'
      )}
      title={template.content}
    >
      {isRecommended && <Sparkles className="h-3 w-3" />}
      <span>{template.title}</span>
    </button>
  )
}
