"use client"

import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  index: number
  href?: string
  variant?: "default" | "primary" | "success" | "warning" | "danger"
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  index,
  href,
  variant = "default",
}: StatsCardProps) {
  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown

  const cardContent = (
    <Card className={cn(
      "h-full transition-all hover:shadow-md",
      href && "cursor-pointer"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className={cn(
          "h-4 w-4",
          variant === "primary" && "text-primary",
          variant === "success" && "text-green-600 dark:text-green-500",
          variant === "warning" && "text-amber-600 dark:text-amber-500",
          variant === "danger" && "text-destructive",
          variant === "default" && "text-muted-foreground"
        )} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <Badge
              variant={trend.isPositive ? "default" : "secondary"}
              className={cn(
                "text-xs px-2 py-0",
                trend.isPositive
                  ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-400"
                  : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-400"
              )}
            >
              <TrendIcon className="mr-1 h-3 w-3" />
              {trend.isPositive ? "+" : ""}{trend.value}%
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{cardContent}</Link>
  }

  return cardContent
}