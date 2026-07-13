"use client"

import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  description?: string
  index?: number
  href?: string
  variant?: "default" | "primary" | "success" | "warning" | "danger"
  onClick?: () => void
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  href,
  variant = "default",
  onClick,
}: StatsCardProps) {
  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown
  // primary variant = 히어로 카드 (브랜드 컬러 배경의 피처 타일)
  const isHero = variant === "primary"

  const cardContent = (
    <div
      className={cn(
        "group relative h-full overflow-hidden rounded-3xl p-5 transition-all duration-300",
        isHero
          ? "bg-primary text-primary-foreground shadow-xl"
          : "border bg-card shadow-sm hover:border-primary/40",
        (href || onClick) && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
      )}
      onClick={onClick}
    >
      {/* 히어로 카드 radial glow 장식 */}
      {isHero && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
      )}

      <div className="relative flex h-full flex-col justify-between gap-3">
        {/* 상단: 제목 + 아이콘 칩 */}
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm font-medium",
              isHero ? "text-primary-foreground/85" : "text-muted-foreground"
            )}
          >
            {title}
          </p>
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
              isHero ? "bg-white/20" : "bg-primary/10"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                isHero && "text-primary-foreground",
                !isHero && variant === "success" && "text-success",
                !isHero && variant === "warning" && "text-warning",
                !isHero && variant === "danger" && "text-destructive",
                !isHero && variant === "default" && "text-primary"
              )}
            />
          </div>
        </div>

        {/* 하단: 값 + 트렌드 */}
        <div className="space-y-1.5">
          <div className="text-3xl font-extrabold tracking-tight">{value}</div>
          {(trend || description) && (
            <div className="flex items-center gap-1.5">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
                    isHero
                      ? "bg-white/20 text-primary-foreground"
                      : trend.isPositive
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                  )}
                >
                  <TrendIcon className="h-3 w-3" />
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </span>
              )}
              {description && (
                <span
                  className={cn(
                    "truncate text-xs",
                    isHero ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}
                >
                  {description}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // onClick(드릴다운)이 있으면 Link 이동 대신 클릭 핸들러만 실행
  if (href && !onClick) {
    return <Link href={href} className="block h-full">{cardContent}</Link>
  }

  return cardContent
}
