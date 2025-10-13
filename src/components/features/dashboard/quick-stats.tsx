"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, TrendingUp, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickStatsProps {
  newStudents: number
  excellentStudents: number
  needsAttention: number
}

export function QuickStats({
  newStudents,
  excellentStudents,
  needsAttention
}: QuickStatsProps) {
  const stats = [
    {
      icon: Users,
      label: "신규 등록",
      value: `+${newStudents}`,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/20"
    },
    {
      icon: TrendingUp,
      label: "우수 학생",
      value: excellentStudents,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20"
    },
    {
      icon: AlertCircle,
      label: "주의 필요",
      value: needsAttention,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/20"
    }
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">빠른 통계</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg transition-all",
                "hover:bg-accent",
                stat.bgColor,
                "animate-in fade-in-50 slide-in-from-right-2 duration-300"
              )}
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  "bg-white dark:bg-background shadow-sm"
                )}>
                  <Icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {stat.label}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="text-lg font-bold px-3 py-1"
              >
                {stat.value}
              </Badge>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
