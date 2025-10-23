"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@ui/card"
import { Badge } from "@ui/badge"
import { TrendingUp, TrendingDown, Users, Calendar, Trophy, BookOpen, DollarSign, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface KPICardProps {
  title: string
  value: string | number
  change?: {
    value: number
    isPositive: boolean
    label: string
  }
  icon: React.ElementType
  iconColor: string
  iconBgColor: string
  href?: string
  index?: number
}

function KPICard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  iconBgColor,
  href,
  index = 0
}: KPICardProps) {
  const TrendIcon = change?.isPositive ? TrendingUp : TrendingDown

  const content = (
    <Card
      className={cn(
        "h-full transition-all duration-300",
        href && "cursor-pointer hover:shadow-lg hover:scale-[1.02]",
        "animate-in fade-in-50 slide-in-from-bottom-2 duration-500"
      )}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-lg", iconBgColor)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold">{value}</div>

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
    return <Link href={href}>{content}</Link>
  }

  return content
}

interface KPICardsGridProps {
  totalStudents: number
  activeStudents: number
  attendanceRate: number
  averageScore: number
  completionRate: number
  monthlyRevenue?: number
}

export function KPICardsGrid({
  totalStudents,
  activeStudents,
  attendanceRate,
  averageScore,
  completionRate,
  monthlyRevenue
}: KPICardsGridProps) {
  const kpis = [
    {
      title: "전체 학생",
      value: totalStudents,
      change: { value: 5, isPositive: true, label: "이번 달" },
      icon: Users,
      iconColor: "text-blue-600 dark:text-blue-400",
      iconBgColor: "bg-blue-50 dark:bg-blue-950/20",
      href: "/students"
    },
    {
      title: "활동 학생",
      value: activeStudents,
      change: { value: 3, isPositive: true, label: "지난주 대비" },
      icon: Target,
      iconColor: "text-green-600 dark:text-green-400",
      iconBgColor: "bg-green-50 dark:bg-green-950/20",
      href: "/students"
    },
    {
      title: "출석률",
      value: `${attendanceRate}%`,
      change: { value: 2, isPositive: true, label: "지난주 대비" },
      icon: Calendar,
      iconColor: "text-purple-600 dark:text-purple-400",
      iconBgColor: "bg-purple-50 dark:bg-purple-950/20",
      href: "/attendance"
    },
    {
      title: "평균 성적",
      value: `${averageScore}점`,
      change: { value: 3, isPositive: true, label: "지난 달 대비" },
      icon: Trophy,
      iconColor: "text-amber-600 dark:text-amber-400",
      iconBgColor: "bg-amber-50 dark:bg-amber-950/20",
      href: "/grades"
    },
    {
      title: "과제 완료율",
      value: `${completionRate}%`,
      change: { value: -1, isPositive: false, label: "지난주 대비" },
      icon: BookOpen,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      iconBgColor: "bg-indigo-50 dark:bg-indigo-950/20",
      href: "/todos"
    },
    ...(monthlyRevenue ? [{
      title: "이번 달 매출",
      value: `${monthlyRevenue.toLocaleString()}원`,
      change: { value: 12, isPositive: true, label: "지난 달 대비" },
      icon: DollarSign,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      iconBgColor: "bg-emerald-50 dark:bg-emerald-950/20",
      href: "/payments"
    }] : [])
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {kpis.map((kpi, index) => (
        <KPICard key={index} {...kpi} index={index} />
      ))}
    </div>
  )
}
