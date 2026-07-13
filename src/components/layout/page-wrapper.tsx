'use client'

import { ReactNode } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { createPageContainer } from "@/lib/design-system"

interface PageWrapperProps {
  children: ReactNode
  title?: string
  subtitle?: string
  description?: string
  actions?: ReactNode
  className?: string
}

/**
 * PageWrapper - 모든 페이지의 일관된 레이아웃 제공
 * 페이지 진입 시 부드러운 fade + slide-up 전환 적용
 *
 * @param title - 페이지 제목
 * @param subtitle - 페이지 부제목 (선택)
 * @param description - 페이지 설명 (subtitle의 별칭)
 * @param actions - 헤더 우측 액션 버튼들 (선택)
 * @param className - 추가 CSS 클래스
 */
export function PageWrapper({
  children,
  title,
  subtitle,
  description,
  actions,
  className
}: PageWrapperProps) {
  const hasHeader = title || subtitle || description || actions
  const desc = subtitle || description

  return (
    <motion.div
      className={cn(createPageContainer(), className)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="space-y-1">
            {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
            {desc && <p className="text-muted-foreground">{desc}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </motion.div>
  )
}
