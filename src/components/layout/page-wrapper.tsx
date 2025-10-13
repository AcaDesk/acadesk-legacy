"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { createPageContainer } from "@/lib/design-system"
import { PageHeader } from "@/components/ui/page-header"

interface PageWrapperProps {
  children: ReactNode
  title?: string
  subtitle?: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
}

/**
 * PageWrapper - 모든 페이지의 일관된 레이아웃과 애니메이션 제공
 *
 * @param title - 페이지 제목
 * @param subtitle - 페이지 부제목 (선택)
 * @param description - 페이지 설명 (subtitle의 별칭)
 * @param icon - 제목 옆 아이콘 (선택)
 * @param actions - 헤더 우측 액션 버튼들 (선택)
 * @param className - 추가 CSS 클래스
 */
export function PageWrapper({
  children,
  title,
  subtitle,
  description,
  icon,
  actions,
  className
}: PageWrapperProps) {
  const hasHeader = title || subtitle || description || icon || actions
  const desc = subtitle || description

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(createPageContainer(), className)}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-3">
            {icon && <div className="mt-1">{icon}</div>}
            <div className="space-y-1">
              {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
              {desc && <p className="text-muted-foreground">{desc}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </motion.div>
  )
}
