"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface KPIWidgetProps {
  title: string
  value: string | number
  change?: {
    value: number
    isPositive: boolean
    label: string
  }
  icon: LucideIcon
  iconColor: string
  iconBgColor: string
  href?: string
}

export function KPIWidget({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  iconBgColor,
  href
}: KPIWidgetProps) {
  const TrendIcon = change?.isPositive ? TrendingUp : TrendingDown

  const content = (
    <Card className={cn(
      "h-full transition-all duration-300",
      href && "cursor-pointer hover:shadow-lg hover:scale-[1.02]"
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", iconBgColor)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold">{value}</div>

        {change && (
          <div className="flex items-center gap-2">
            <Badge
              variant={change.isPositive ? "default" : "secondary"}
              className={cn(
                "text-xs px-2 py-0.5",
                change.isPositive
                  ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-400"
                  : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-400"
              )}
            >
              <TrendIcon className="mr-1 h-3 w-3" />
              {change.isPositive ? "+" : ""}{change.value}%
            </Badge>
            <span className="text-xs text-muted-foreground">
              {change.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href} className="block h-full">{content}</Link>
  }

  return content
}
