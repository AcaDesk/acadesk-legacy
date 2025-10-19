'use client'

import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Fragment } from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const router = useRouter()

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <Fragment key={index}>
            {item.href && !isLast ? (
              <button
                onClick={() => router.push(item.href!)}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className={isLast ? 'text-foreground font-medium' : ''}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="h-4 w-4" aria-hidden="true" />}
          </Fragment>
        )
      })}
    </nav>
  )
}
